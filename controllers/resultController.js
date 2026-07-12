import fs from 'fs';
import path from 'path';
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

    const serviceAccountPath = path.resolve('service-account.json');
    if (!fs.existsSync(serviceAccountPath)) {
      return res.status(500).json({ message: 'Google Sheets service account not configured' });
    }

    const { google } = await import('googleapis');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
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
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: sheetName + '!A1:Z500',
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
