import PreviousResult from "../models/previousResult.js";

export async function createPreviousResult(req, res) {
  const data = req.body;

  if (!data.championshipName || !data.venue || !data.fromDate || !data.toDate) {
    return res.status(400).json({ message: "Championship name, venue, and dates are required" });
  }

  if (!data.resultType || !['pdf', 'spreadsheet', 'drive'].includes(data.resultType)) {
    return res.status(400).json({ message: "A valid result type (pdf, spreadsheet, or drive) is required" });
  }

  if (data.resultType === 'drive' && !data.driveLink) {
    return res.status(400).json({ message: "Google Drive link is required when result type is drive" });
  }

  if ((data.resultType === 'pdf' || data.resultType === 'spreadsheet') && !data.fileUrl) {
    return res.status(400).json({ message: "File URL is required for PDF or spreadsheet uploads" });
  }

  const previousResult = new PreviousResult({
    championshipName: data.championshipName,
    venue: data.venue,
    fromDate: data.fromDate,
    toDate: data.toDate,
    description: data.description || '',
    resultType: data.resultType,
    fileUrl: data.fileUrl || '',
    driveLink: data.driveLink || '',
    createdBy: req.user?.email || '',
  });

  previousResult.save()
    .then((saved) => {
      res.json({
        message: "Previous result created successfully",
        previousResult: saved,
      });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error creating previous result",
        error: err.message,
      });
    });
}

export function getPreviousResults(req, res) {
  PreviousResult.find()
    .sort({ createdAt: -1 })
    .then((previousResults) => {
      res.json({ previousResults });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error fetching previous results",
        error: err.message,
      });
    });
}

export function getPreviousResult(req, res) {
  PreviousResult.findById(req.params.id)
    .then((previousResult) => {
      if (!previousResult) {
        return res.status(404).json({ message: "Previous result not found" });
      }
      res.json({ previousResult });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error fetching previous result",
        error: err.message,
      });
    });
}

export function updatePreviousResult(req, res) {
  const data = req.body;

  PreviousResult.findByIdAndUpdate(
    req.params.id,
    {
      championshipName: data.championshipName,
      venue: data.venue,
      fromDate: data.fromDate,
      toDate: data.toDate,
      description: data.description || '',
      resultType: data.resultType,
      fileUrl: data.fileUrl || '',
      driveLink: data.driveLink || '',
    },
    { returnDocument: 'after' }
  )
    .then((previousResult) => {
      if (!previousResult) {
        return res.status(404).json({ message: "Previous result not found" });
      }
      res.json({
        message: "Previous result updated successfully",
        previousResult,
      });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error updating previous result",
        error: err.message,
      });
    });
}

export function deletePreviousResult(req, res) {
  PreviousResult.findByIdAndDelete(req.params.id)
    .then((previousResult) => {
      if (!previousResult) {
        return res.status(404).json({ message: "Previous result not found" });
      }
      res.json({ message: "Previous result deleted successfully" });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error deleting previous result",
        error: err.message,
      });
    });
}
