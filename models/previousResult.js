import mongoose from "mongoose";

const previousResultSchema = new mongoose.Schema({
  championshipName: { type: String, required: true },
  venue: { type: String, required: true },
  fromDate: { type: String, required: true },
  toDate: { type: String, required: true },
  description: { type: String, default: '' },
  resultType: {
    type: String,
    enum: ['pdf', 'spreadsheet', 'drive'],
    required: true,
  },
  fileUrl: { type: String, default: '' },
  driveLink: { type: String, default: '' },
  createdBy: { type: String, default: '' },
}, { timestamps: true, toJSON: { virtuals: true } });

export default mongoose.model('PreviousResult', previousResultSchema);
