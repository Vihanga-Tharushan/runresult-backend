import Championship from "../models/championship.js";

export async function createChampionship(req, res) {
  const data = req.body;

  const count = await Championship.countDocuments();
  const championship_id = `CHMP-${String(count + 1).padStart(4, '0')}`;

  const championship = new Championship({
    championship_id,
    name: data.name,
    description: data.description || '',
    organizer: data.organizer,
    venue: data.venue,
    district: data.district || '',
    startDate: data.startDate,
    endDate: data.endDate,
    regOpenDate: data.regOpenDate || '',
    regCloseDate: data.regCloseDate || '',
    banner: data.banner || '',
    logo: data.logo || '',
    selectedEvents: data.selectedEvents || [],
    registrationStatus: data.registrationStatus || 'draft',
    publishStatus: data.publishStatus || 'draft',
    athleteCount: data.athleteCount || 0,
    eventCount: data.selectedEvents?.length || 0,
    maxEventsPerAthlete: data.maxEventsPerAthlete || 3,
    pricing: data.pricing || [{ events: 1, fee: 0 }],
    googleSheets: data.googleSheets || {
      registration: { url: '', connected: false },
      startList: { url: '', connected: false },
      heatResults: { url: '', connected: false },
      finalResults: { url: '', connected: false },
      certificate: { url: '', connected: false },
    },
    createdBy: req.user?.email || '',
  });

  championship.save()
    .then((saved) => {
      res.json({
        message: "Championship created successfully",
        championship: saved,
      });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error creating championship",
        error: err.message,
      });
    });
}

export function getChampionships(req, res) {
  Championship.find()
    .sort({ createdAt: -1 })
    .then((championships) => {
      res.json({ championships });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error fetching championships",
        error: err.message,
      });
    });
}

export function getChampionship(req, res) {
  const { id } = req.params;
  const query = id.startsWith('CHMP-')
    ? { championship_id: id }
    : { _id: id };

  Championship.findOne(query)
    .then((championship) => {
      if (!championship) {
        return res.status(404).json({ message: "Championship not found" });
      }
      res.json({ championship });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error fetching championship",
        error: err.message,
      });
    });
}

export function updateChampionship(req, res) {
  const data = req.body;

  Championship.findByIdAndUpdate(
    req.params.id,
    {
      ...data,
      eventCount: data.selectedEvents?.length || 0,
    },
    { new: true }
  )
    .then((championship) => {
      if (!championship) {
        return res.status(404).json({ message: "Championship not found" });
      }
      res.json({
        message: "Championship updated successfully",
        championship,
      });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error updating championship",
        error: err.message,
      });
    });
}

export function deleteChampionship(req, res) {
  Championship.findByIdAndDelete(req.params.id)
    .then((championship) => {
      if (!championship) {
        return res.status(404).json({ message: "Championship not found" });
      }
      res.json({ message: "Championship deleted successfully" });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error deleting championship",
        error: err.message,
      });
    });
}
