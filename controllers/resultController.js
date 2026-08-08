import Championship from '../models/championship.js';

function parseSheet(rows) {
  const events = {};
  let currentEvent = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const firstCell = (row[0] || '').trim();

    if (firstCell === 'E: No:') {
      const eventNo = (row[1] || '').trim();
      const eventName = (row[2] || '').trim();
      const category = (row[3] || '').trim();
      currentEvent = {
        id: eventNo,
        name: eventName,
        category,
        date: '',
        wind: '',
        results: [],
      };
      events[eventNo] = currentEvent;
      continue;
    }

    if (firstCell === 'Order' || firstCell === 'order') {
      continue;
    }

    if (currentEvent && /^\d+$/.test(firstCell)) {
      const rank = parseInt(firstCell, 10);
      const bib = (row[1] || '').trim();
      const athleteName = (row[2] || '').trim();
      const school = (row[3] || '').trim();
      const zone = (row[4] || '').trim();
      const achievement = (row[5] || '').trim();
      const unit = (row[6] || '').trim();
      const remarks = (row[7] || '').trim();

      let medal = null;
      if (rank === 1) medal = 'Gold';
      else if (rank === 2) medal = 'Silver';
      else if (rank === 3) medal = 'Bronze';

      const records = [];
      if (remarks) {
        const cleanRemarks = remarks.replace(/[*]/g, '').trim();
        if (cleanRemarks) records.push(cleanRemarks);
      }

      const performance = unit ? `${achievement} ${unit}` : achievement;

      if (athleteName) {
        currentEvent.results.push({
          rank,
          bib,
          athlete: athleteName,
          club: school,
          country: zone,
          performance,
          medal,
          records,
          members: [],
        });
      } else {
        const result = {
          rank,
          bib,
          athlete: school,
          club: school,
          country: zone,
          performance,
          medal,
          records,
          members: [],
        };

        while (i + 1 < rows.length) {
          const nextRow = rows[i + 1];
          if (!nextRow || nextRow.length === 0) break;
          const nextRank = (nextRow[0] || '').trim();
          if (nextRank !== '') break;

          i++;
          result.members.push({
            bib: (nextRow[1] || '').trim(),
            name: (nextRow[2] || '').trim(),
          });
        }

        currentEvent.results.push(result);
      }
      continue;
    }

    if (currentEvent && firstCell === '' && row.length >= 3 && (row[1] || '').trim() !== '' && (row[2] || '').trim() !== '') {
      const lastResult = currentEvent.results[currentEvent.results.length - 1];
      if (lastResult && lastResult.members.length > 0) {
        lastResult.members.push({
          bib: (row[1] || '').trim(),
          name: (row[2] || '').trim(),
        });
      }
    }
  }

  return events;
}

export function parseHeatSheet(rows) {
  const events = {};
  let currentHeat = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const firstCell = (row[0] || '').trim();
    const eventNo = (row[1] || '').trim();
    const eventName = (row[2] || '').trim();
    const thirdCell = (row[3] || '').trim();
    const heatNo = (row[4] || '').trim();
    const performance = (row[5] || '').trim();

    if (thirdCell.toLowerCase().startsWith('day')) continue;

    const isEventHeader =
      (firstCell === '' || firstCell.toLowerCase() === 'e: no:') &&
      /^\d+$/.test(eventNo) &&
      eventName !== '' &&
      eventName !== '#N/A' &&
      thirdCell === '' &&
      performance === '';

    if (isEventHeader) {
      let event = events[eventNo];
      if (!event) {
        event = {
          id: eventNo,
          name: eventName,
          gender: eventName.toLowerCase().includes('girls')
            ? 'Girls'
            : eventName.toLowerCase().includes('boys')
              ? 'Boys'
              : eventName.toLowerCase().includes('women')
                ? 'Women'
                : eventName.toLowerCase().includes('men')
                  ? 'Men'
                  : '',
          category: (eventName.match(/U\s*\d+/) || [])[0] || '',
          heats: [],
        };
        events[eventNo] = event;
      }

      const heatNum = /^\d+$/.test(heatNo) ? heatNo : String(event.heats.length + 1);
      let heat = event.heats.find((h) => h.name === `Heat ${heatNum}`);
      if (!heat) {
        heat = { name: `Heat ${heatNum}`, results: [] };
        event.heats.push(heat);
      }
      currentHeat = heat;
      continue;
    }

    if (eventName === 'Name of Athlete') continue;

    if (currentHeat) {
      const bib = (row[1] || '').trim();
      const dob = (row[4] || '').trim();
      const remarks = (row[6] || '').trim();

      if (eventName === '#N/A' || bib === '#N/A') continue;
      if (bib === '' && eventName === '' && performance === '') continue;

      const status = ['DNS', 'DNF', 'DQ'].includes(performance) ? performance : '';

      currentHeat.results.push({
        rank: firstCell,
        affiliate: thirdCell,
        bib,
        athlete: eventName || bib,
        dob: dob === '#N/A' ? '' : dob,
        time: status ? '' : performance,
        remarks,
        status,
      });
    }
  }

  return events;
}

export async function getHeatResults(req, res) {
  try {
    const { championshipId } = req.params;

    const championship = await Championship.findOne({ championship_id: championshipId });
    if (!championship) {
      return res.status(404).json({ message: 'Championship not found' });
    }

    const sheetUrl = championship.googleSheets?.heatResults?.url;
    if (!sheetUrl) {
      return res.json({ events: {}, days: [] });
    }

    const serviceAccountB64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
    if (!serviceAccountB64) {
      return res.status(500).json({ message: 'Google Sheets service account not configured' });
    }

    const { google } = await import('googleapis');
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountB64, 'base64').toString('utf8'));
    const sheetId = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    if (!sheetId) {
      return res.status(400).json({ message: 'Invalid Google Sheet URL' });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'sheets.properties',
    });

    const allEvents = {};
    const days = [];

    for (const sheet of meta.data.sheets) {
      const sheetName = sheet.properties.title;
      const rowCount = sheet.properties.gridProperties?.rowCount || 1000;
      const colCount = sheet.properties.gridProperties?.columnCount || 26;
      const lastCol = String.fromCharCode(64 + Math.min(colCount, 26));
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:${lastCol}${rowCount}`,
      });
      const rows = res.data.values || [];
      const parsed = parseHeatSheet(rows);

      const dayEvents = [];
      for (const [id, event] of Object.entries(parsed)) {
        event.date = sheetName;
        if (!allEvents[id]) {
          allEvents[id] = event;
        } else {
          for (const heat of event.heats) {
            if (!allEvents[id].heats.some((h) => h.name === heat.name)) {
              allEvents[id].heats.push(heat);
            }
          }
        }
        dayEvents.push(event);
      }

      days.push({ name: sheetName, events: dayEvents });
    }

    res.json({ events: allEvents, days });
  } catch (err) {
    console.error('Error fetching heat results:', err.message);
    res.status(500).json({ message: 'Error fetching heat results' });
  }
}

export async function getFinalResults(req, res) {
  try {
    const { championshipId } = req.params;

    const championship = await Championship.findOne({ championship_id: championshipId });
    if (!championship) {
      return res.status(404).json({ message: 'Championship not found' });
    }

    const sheetUrl = championship.googleSheets?.finalResults?.url;
    if (!sheetUrl) {
      return res.json({ events: {}, days: [] });
    }

    const serviceAccountB64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
    if (!serviceAccountB64) {
      return res.status(500).json({ message: 'Google Sheets service account not configured' });
    }

    const { google } = await import('googleapis');
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountB64, 'base64').toString('utf8'));
    const sheetId = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    if (!sheetId) {
      return res.status(400).json({ message: 'Invalid Google Sheet URL' });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'sheets.properties',
    });

    const allEvents = {};
    const days = [];

    for (const sheet of meta.data.sheets) {
      const sheetName = sheet.properties.title;
      const rowCount = sheet.properties.gridProperties?.rowCount || 1000;
      const colCount = sheet.properties.gridProperties?.columnCount || 26;
      const lastCol = String.fromCharCode(64 + Math.min(colCount, 26));
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:${lastCol}${rowCount}`,
      });
      const rows = res.data.values || [];
      const parsed = parseSheet(rows);

      const dayEvents = [];
      for (const [id, event] of Object.entries(parsed)) {
        event.date = sheetName;
        allEvents[id] = event;
        dayEvents.push(event);
      }

      days.push({ name: sheetName, events: dayEvents });
    }

    res.json({ events: allEvents, days });
  } catch (err) {
    console.error('Error fetching final results:', err.message);
    res.status(500).json({ message: 'Error fetching final results' });
  }
}
