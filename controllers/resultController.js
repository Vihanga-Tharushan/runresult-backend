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

export function parseStartListSheet(rows) {
  const events = {};
  let currentEvent = null;

  for (const row of rows) {
    const cells = (row || []).map((c) => String(c ?? '').trim());
    if (cells.every((c) => c === '')) continue;

    const firstCell = cells[0];

    if (firstCell === 'E No' || firstCell === 'E: No:') {
      const eventNo = cells[1] || '';
      const eventName = cells[2] || '';
      if (!eventNo || !eventName || eventName === '#N/A') continue;

      const heatNo = cells[4] || '';
      const id = `${eventNo}-${heatNo || 'F'}`;
      const lower = eventName.toLowerCase();

      currentEvent = {
        id,
        eventNo,
        name: eventName,
        gender: lower.includes('girls')
          ? 'Girls'
          : lower.includes('boys')
            ? 'Boys'
            : lower.includes('women')
              ? 'Women'
              : lower.includes('men')
                ? 'Men'
                : '',
        category: (eventName.match(/U\s*\d+/) || [])[0] || '',
        round: heatNo ? `Heat ${heatNo}` : 'Final',
        entries: [],
      };
      events[id] = currentEvent;
      continue;
    }

    if (firstCell === 'BIB') continue;

    if (currentEvent) {
      const bib = firstCell;
      const athlete = cells[1] || '';
      const affiliate = cells[2] || '';
      const dob = cells[3] || '';
      const lane = cells[4] || '';
      const remarks = cells[5] || '';

      if (!bib || bib === '-' || bib === '#N/A') continue;
      if (!athlete || athlete === '#N/A') continue;

      currentEvent.entries.push({
        lane,
        bib,
        athlete,
        club: affiliate,
        country: '',
        dob: dob === '#N/A' ? '' : dob,
        pb: '',
        sb: '',
        remarks: remarks === '#N/A' ? '' : remarks,
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

export async function getStartList(req, res) {
  try {
    const { championshipId } = req.params;

    const championship = await Championship.findOne({ championship_id: championshipId });
    if (!championship) {
      return res.status(404).json({ message: 'Championship not found' });
    }

    const sheetUrl = championship.googleSheets?.startList?.url;
    if (!sheetUrl) {
      return res.json({ events: {} });
    }

    const tabs = await fetchSpreadsheetData(sheetUrl);
    const allEvents = {};

    for (const tab of tabs) {
      const parsed = parseStartListSheet(tab.rows);
      for (const [id, event] of Object.entries(parsed)) {
        if (!allEvents[id]) {
          allEvents[id] = event;
        } else {
          allEvents[id].entries.push(...event.entries);
        }
      }
    }

    res.json({ events: allEvents });
  } catch (err) {
    console.error('Error fetching start list:', err.message);
    res.status(500).json({ message: 'Error fetching start list' });
  }
}

async function fetchSpreadsheetData(sheetUrl) {
  const serviceAccountB64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (!serviceAccountB64) {
    throw new Error('Google Sheets service account not configured');
  }

  const { google } = await import('googleapis');
  const serviceAccount = JSON.parse(Buffer.from(serviceAccountB64, 'base64').toString('utf8'));
  const sheetId = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!sheetId) {
    throw new Error('Invalid Google Sheet URL');
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

  const tabs = [];
  for (const sheet of meta.data.sheets) {
    const sheetName = sheet.properties.title;
    const rowCount = sheet.properties.gridProperties?.rowCount || 1000;
    const colCount = sheet.properties.gridProperties?.columnCount || 26;
    const lastCol = String.fromCharCode(64 + Math.min(colCount, 26));
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:${lastCol}${rowCount}`,
    });
    tabs.push({ name: sheetName, rows: res.data.values || [] });
  }

  return tabs;
}

export function parsePointsSheet(rows) {
  const zones = [];
  const schools = [];
  let current = null;
  let map = null;

  for (const row of rows) {
    const cells = (row || []).map((c) => String(c ?? '').trim());
    if (cells.every((c) => c === '')) {
      current = null;
      map = null;
      continue;
    }

    const lower = cells.map((c) => c.toLowerCase());

    if (lower[0] === 'zone' && lower.includes('place') && lower.includes('points')) {
      const schoolIdx = lower.findIndex((c) => /school/.test(c));
      if (schoolIdx >= 0) {
        current = 'schools';
        map = {
          zone: 0,
          school: schoolIdx,
          place: lower.findIndex((c) => c === 'place'),
          points: lower.findIndex((c) => c === 'points'),
        };
      } else {
        current = 'zones';
        map = {
          zone: 0,
          place: lower.findIndex((c) => c === 'place'),
          points: lower.findIndex((c) => c === 'points'),
        };
      }
      continue;
    }

    if (current && map) {
      const zone = cells[map.zone];
      if (!zone) continue;
      const toInt = (i) => (i >= 0 ? parseInt(cells[i] || '0', 10) || 0 : 0);

      if (current === 'zones') {
        zones.push({
          zone,
          place: toInt(map.place),
          points: toInt(map.points),
        });
      } else {
        schools.push({
          zone,
          school: cells[map.school],
          place: toInt(map.place),
          points: toInt(map.points),
        });
      }
    }
  }

  return { zones, schools };
}

export function parseMedalsSheet(rows) {
  const sections = [];
  let current = null;
  let pendingName = null;

  for (const row of rows) {
    const cells = (row || []).map((c) => String(c ?? '').trim());
    if (cells.every((c) => c === '')) continue;

    const lower = cells.map((c) => c.toLowerCase());
    const nonEmpty = cells.filter((c) => c !== '');

    if (nonEmpty.length === 1 && !/^\d+$/.test(cells[0])) {
      pendingName = cells[0];
      continue;
    }

    if (lower.includes('gold') && lower.includes('silver')) {
      const rankIdx = lower.findIndex((c) => c === 'rank');
      const goldIdx = lower.findIndex((c) => c === 'gold');
      const silverIdx = lower.findIndex((c) => c === 'silver');
      const bronzeIdx = lower.findIndex((c) => c === 'bronze');
      const totalIdx = lower.findIndex((c) => c === 'total');

      const used = new Set([rankIdx, goldIdx, silverIdx, bronzeIdx, totalIdx]);
      let entityIdx = -1;
      for (let i = 0; i < cells.length; i++) {
        if (!used.has(i) && cells[i] !== '') {
          entityIdx = i;
          break;
        }
      }
      if (entityIdx === -1) entityIdx = 0;

      let name = pendingName || 'Medal Tally';
      if (!pendingName && lower.includes('zone')) name = 'Zone Medal Tally';
      if (!pendingName && lower.some((c) => /school/.test(c))) name = 'School Medal Tally';

      current = {
        entity: entityIdx,
        rank: rankIdx,
        gold: goldIdx,
        silver: silverIdx,
        bronze: bronzeIdx,
        total: totalIdx,
      };
      sections.push({ name, rows: [] });
      pendingName = null;
      continue;
    }

    if (current) {
      const entity = cells[current.entity];
      if (!entity) continue;
      const toInt = (i) => (i >= 0 && cells[i] !== '' ? parseInt(cells[i], 10) : 0);

      sections[sections.length - 1].rows.push({
        name: entity,
        rank: current.rank >= 0 && cells[current.rank] !== '' ? parseInt(cells[current.rank], 10) : null,
        gold: toInt(current.gold),
        silver: toInt(current.silver),
        bronze: toInt(current.bronze),
        total: current.total >= 0 && cells[current.total] !== '' ? parseInt(cells[current.total], 10) : null,
      });
    }
  }

  return sections;
}

export async function getPoints(req, res) {
  try {
    const { championshipId } = req.params;

    const championship = await Championship.findOne({ championship_id: championshipId });
    if (!championship) {
      return res.status(404).json({ message: 'Championship not found' });
    }

    const sheetUrl = championship.googleSheets?.points?.url;
    if (!sheetUrl) {
      return res.json({ zones: [], schools: [] });
    }

    const tabs = await fetchSpreadsheetData(sheetUrl);
    const zones = [];
    const schools = [];

    for (const tab of tabs) {
      const parsed = parsePointsSheet(tab.rows);
      zones.push(...parsed.zones);
      schools.push(...parsed.schools);
    }

    zones.sort((a, b) => (a.place || 999) - (b.place || 999));
    schools.sort((a, b) => (a.place || 999) - (b.place || 999));

    res.json({ zones, schools });
  } catch (err) {
    console.error('Error fetching points:', err.message);
    res.status(500).json({ message: 'Error fetching points' });
  }
}

export async function getMedals(req, res) {
  try {
    const { championshipId } = req.params;

    const championship = await Championship.findOne({ championship_id: championshipId });
    if (!championship) {
      return res.status(404).json({ message: 'Championship not found' });
    }

    const sheetUrl = championship.googleSheets?.medals?.url;
    if (!sheetUrl) {
      return res.json({ sections: [] });
    }

    const tabs = await fetchSpreadsheetData(sheetUrl);
    const sections = [];

    for (const tab of tabs) {
      const parsed = parseMedalsSheet(tab.rows);
      for (const section of parsed) {
        const existing = sections.find((s) => s.name === section.name);
        if (existing) {
          existing.rows.push(...section.rows);
        } else {
          sections.push(section);
        }
      }
    }

    const sortRows = (a, b) => {
      if (a.rank != null && b.rank != null && a.rank !== b.rank) return a.rank - b.rank;
      const aTotal = a.total ?? a.gold + a.silver + a.bronze;
      const bTotal = b.total ?? b.gold + b.silver + b.bronze;
      if (bTotal !== aTotal) return bTotal - aTotal;
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      return b.bronze - a.bronze;
    };

    for (const section of sections) {
      section.rows.sort(sortRows);
    }

    res.json({ sections });
  } catch (err) {
    console.error('Error fetching medals:', err.message);
    res.status(500).json({ message: 'Error fetching medals' });
  }
}
