import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Registration from '../models/registration.js';
import Championship from '../models/championship.js';

const counterSchema = new mongoose.Schema({
  championshipId: { type: String, required: true, unique: true },
  bibCount: { type: Number, default: 0 },
  regCount: { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', counterSchema);

async function generateBibNumber(championshipId) {
  const counter = await Counter.findOneAndUpdate(
    { championshipId },
    { $inc: { bibCount: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return String(counter.bibCount).padStart(3, '0');
}

async function generateRegistrationNumber(championshipId) {
  const counter = await Counter.findOneAndUpdate(
    { championshipId },
    { $inc: { regCount: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return `RRN-${championshipId}-${String(counter.regCount).padStart(4, '0')}`;
}

async function appendToGoogleSheet(championship, registration) {
  const sheetUrl = championship.googleSheets?.registration?.url;
  if (!sheetUrl) {
    console.log('Google Sheets: No registration sheet URL configured');
    return;
  }

  const serviceAccountPath = path.resolve('service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.log('Google Sheets: service-account.json not found');
    return;
  }

  try {
    const { google } = await import('googleapis');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    const sheetId = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    if (!sheetId) {
      console.log('Google Sheets: Could not extract sheet ID from URL:', sheetUrl);
      return;
    }

    console.log('Google Sheets: Attempting append to sheet:', sheetId);
    console.log('Google Sheets: Service account:', serviceAccount.client_email);

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const eventNames = registration.selectedEvents
      .map(id => championship.selectedEvents[Number(id)] || id)
      .join(', ');

    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
    const values = [
      [
        timestamp,
        registration.bibNumber,
        registration.championshipName,
        registration.fullName,
        registration.nameWithInitials,
        registration.gender,
        registration.dateOfBirth,
        registration.ageCategory,
        registration.address.district,
        registration.institution,
        registration.athleteEmail,
        registration.mobile,
        eventNames,
        String(registration.eventCount),
        registration.paymentMethod,
        registration.paymentStatus,
        registration.registrationStatus,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:Q',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });

    console.log('Google Sheets: Row appended successfully');
  } catch (err) {
    console.error('Google Sheets append failed:', err.message);
    if (err.response) console.error('Google Sheets error details:', JSON.stringify(err.response.data || err.response));
    registration.sheetSyncPending = true;
    await registration.save();
  }
}

export async function registerAthlete(req, res) {
  try {
    const {
      championshipId, fullName, nameWithInitials, gender, dateOfBirth,
      ageCategory, email, mobile, nic, institution, address,
      selectedEvents, paymentMethod, totalFee,
    } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'You must be logged in to register' });
    }

    const championship = await Championship.findOne({ championship_id: championshipId });
    if (!championship) {
      return res.status(404).json({ message: 'Championship not found' });
    }

    if (championship.registrationStatus !== 'open' && championship.registrationStatus !== 'closing-soon') {
      return res.status(400).json({ message: 'Registration is closed for this championship' });
    }

    if (!selectedEvents || selectedEvents.length === 0) {
      return res.status(400).json({ message: 'Please select at least one event' });
    }

    if (selectedEvents.length > championship.maxEventsPerAthlete) {
      return res.status(400).json({ message: `Maximum ${championship.maxEventsPerAthlete} events allowed` });
    }

    if (!fullName || !gender || !dateOfBirth || !mobile || !email) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }

    const user = await import('../models/user.js').then(m => m.default.findOne({ email: req.user.email }));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existing = await Registration.findOne({ championshipId, athleteId: user._id });
    if (existing) {
      return res.status(409).json({ message: 'You are already registered for this championship' });
    }

    const bibNumber = await generateBibNumber(championshipId);
    const registrationNumber = await generateRegistrationNumber(championshipId);

    const registration = new Registration({
      registrationNumber,
      championshipId,
      championshipName: championship.name,
      athleteId: user._id,
      athleteEmail: email,
      bibNumber,
      fullName,
      nameWithInitials: nameWithInitials || '',
      gender,
      dateOfBirth,
      ageCategory: ageCategory || '',
      mobile,
      nic: nic || '',
      institution: institution || '',
      address: {
        district: address?.district || '',
        addressLine1: address?.addressLine1 || '',
        addressLine2: address?.addressLine2 || '',
      },
      selectedEvents,
      eventCount: selectedEvents.length,
      totalFee: totalFee || 0,
      paymentMethod: paymentMethod || '',
      paymentStatus: paymentMethod === 'online' ? 'paid' : 'pending',
      registrationStatus: 'pending',
    });

    await registration.save();

    await Championship.findByIdAndUpdate(championship._id, { $inc: { athleteCount: 1 } });

    await appendToGoogleSheet(championship, registration);

    res.status(201).json({
      message: 'Registration successful',
      registration: {
        registrationNumber: registration.registrationNumber,
        bibNumber: registration.bibNumber,
        championshipName: registration.championshipName,
        selectedEvents: registration.selectedEvents,
        paymentStatus: registration.paymentStatus,
        totalFee: registration.totalFee,
        registrationStatus: registration.registrationStatus,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
}

export async function getRegistrationsByChampionship(req, res) {
  try {
    const { championshipId } = req.params;
    const registrations = await Registration.find({ championshipId }).sort({ bibNumber: 1 });
    res.json({ registrations });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching registrations' });
  }
}

export async function getMyRegistrations(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const user = await import('../models/user.js').then(m => m.default.findOne({ email: req.user.email }));
    if (!user) return res.status(404).json({ message: 'User not found' });

    const registrations = await Registration.find({ athleteId: user._id }).sort({ createdAt: -1 });
    res.json({ registrations });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching your registrations' });
  }
}
