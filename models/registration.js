import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({

  registrationNumber: { type: String, required: true, unique: true },

  championshipId: { type: String, required: true, index: true },

  championshipName: { type: String, required: true },

  athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  athleteEmail: { type: String, required: true },

  bibNumber: { type: String, required: true },

  // Athlete information
  fullName: { type: String, required: true },
  nameWithInitials: { type: String, default: '' },
  gender: { type: String, required: true },
  dateOfBirth: { type: String, required: true },
  ageCategory: { type: String, default: '' },
  mobile: { type: String, required: true },
  nic: { type: String, default: '' },
  institution: { type: String, default: '' },
  address: {
    district: { type: String, default: '' },
    addressLine1: { type: String, default: '' },
    addressLine2: { type: String, default: '' },
  },

  // Events & Fees
  selectedEvents: [{ type: String }],
  eventCount: { type: Number, default: 0 },
  totalFee: { type: Number, default: 0 },

  // Payment
  paymentMethod: { type: String, enum: ['online', 'bank-slip'], default: '' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  bankSlipUrl: { type: String, default: '' },

  // Status
  registrationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

  // Google Sheets sync
  sheetSyncPending: { type: Boolean, default: false },

}, { timestamps: true });

// Prevent duplicate registration per athlete per championship
registrationSchema.index({ championshipId: 1, athleteId: 1 }, { unique: true });

const Registration = mongoose.model('Registration', registrationSchema);
export default Registration;
