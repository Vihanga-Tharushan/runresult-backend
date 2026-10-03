import Championship from "../models/championship.js";

const ID_ATTEMPTS = 5;

function formatChampionshipId(num) {
  return `CHMP-${String(num).padStart(4, '0')}`;
}

async function nextChampionshipIdNumber() {
  const existing = await Championship.find({}, { championship_id: 1 }).lean();

  return existing.reduce((highest, doc) => {
    const match = String(doc.championship_id || '').match(/(\d+)\s*$/);
    const num = match ? parseInt(match[1], 10) : 0;
    return num > highest ? num : highest;
  }, 0) + 1;
}

export async function createChampionship(req, res) {
  const data = req.body;

  const nextIdNumber = await nextChampionshipIdNumber();
  let lastError = null;

  for (let attempt = 0; attempt < ID_ATTEMPTS; attempt++) {
    const championship = new Championship({
      championship_id: formatChampionshipId(nextIdNumber + attempt),
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
        points: { url: '', connected: false },
        medals: { url: '', connected: false },
        records: { url: '', connected: false, type: 'pdf' },
        trophies: { url: '', connected: false, type: 'pdf' },
      },
      createdBy: req.user?.email || '',
    });

    try {
      const saved = await championship.save();
      return res.json({
        message: "Championship created successfully",
        championship: saved,
      });
    } catch (err) {
      if (err.code !== 11000 || !err.keyPattern?.championship_id) {
        return res.status(500).json({
          message: "Error creating championship",
          error: err.message,
        });
      }
      lastError = err;
    }
  }

  res.status(500).json({
    message: "Error creating championship",
    error: lastError?.message,
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

const UPDATABLE_FIELDS = [
  'name',
  'description',
  'organizer',
  'venue',
  'district',
  'startDate',
  'endDate',
  'regOpenDate',
  'regCloseDate',
  'banner',
  'logo',
  'selectedEvents',
  'registrationStatus',
  'publishStatus',
  'athleteCount',
  'maxEventsPerAthlete',
  'pricing',
  'finalResultsFormat',
  'googleSheets',
  'createdBy',
];

export async function updateChampionship(req, res) {
  const update = {};

  for (const field of UPDATABLE_FIELDS) {
    if (req.body[field] !== undefined) {
      update[field] = req.body[field];
    }
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  if (update.selectedEvents) {
    update.eventCount = update.selectedEvents.length;
  }

  try {
    const championship = await Championship.findByIdAndUpdate(
      req.params.id,
      update,
      { returnDocument: 'after', runValidators: true }
    );

    if (!championship) {
      return res.status(404).json({ message: "Championship not found" });
    }

    res.json({
      message: "Championship updated successfully",
      championship,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error updating championship",
      error: err.message,
    });
  }
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
