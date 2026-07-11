import mongoose from 'mongoose';

const championshipSchema = new mongoose.Schema({

  championship_id: { type: String, unique: true },

  name: { type: String, required: true },

  description: { type: String, default: '' },

  organizer: { type: String, required: true },

  venue: { type: String, required: true },

  district: { type: String, default: '' },

  startDate: { type: String, required: true },

  endDate: { type: String, required: true },

  regOpenDate: { type: String, default: '' },

  regCloseDate: { type: String, default: '' },

  banner: { type: String, default: '' },

  logo: { type: String, default: '' },

  selectedEvents: [{ type: String }],

  registrationStatus: { type: String, enum: ['open', 'closing-soon', 'closed', 'draft'], default: 'draft' },

  publishStatus: { type: String, enum: ['published', 'unpublished', 'draft'], default: 'draft' },

  athleteCount: { type: Number, default: 0 },

  eventCount: { type: Number, default: 0 },

  maxEventsPerAthlete: { type: Number, default: 3 },

  pricing: [{
    events: Number,
    fee: Number,
  }],

  googleSheets: {
    registration: { url: String, connected: { type: Boolean, default: false } },
    startList: { url: String, connected: { type: Boolean, default: false } },
    heatResults: { url: String, connected: { type: Boolean, default: false } },
    finalResults: { url: String, connected: { type: Boolean, default: false } },
    certificate: { url: String, connected: { type: Boolean, default: false } },
  },
  createdBy: { type: String, default: '' },
  
}, { timestamps: true, toJSON: { virtuals: true } });

const Championship = mongoose.model('Championship', championshipSchema);
export default Championship;
