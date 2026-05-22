import UnknownPerson from "../models/UnkownPerson.js";
import Counter from "../models/CounterSchema.js";
import { saveBase64Image, deleteImageFile } from "../utils/image.utils.js";

export const processUnknown = async (descriptor, confidence, faceImage) => {
  // ⛔ [SECURITY/USER REQUEST] Storage of unknown persons has been disabled.
  // This ensures unidentified faces aren't logged into MongoDB or the filesystem.
  
  return {
    success: true,
    message: "Unknown person detected but storage is disabled per user request",
    data: { 
      unknownId: null, 
      displayName: "Unknown Face (Not Logged)", 
      timestamp: new Date(),
      isNew: false 
    },
  };
};

export const logUnknown = async (req, res) => {
  try {
    const { descriptor, confidence, faceImage } = req.body;
    const result = await processUnknown(descriptor, confidence, faceImage);
    res.json(result);
  } catch (err) {
    if (err.code === 11000) {
      return res.json({
        success: true,
        message: "Unknown person already being processed",
        data: {
          unknownId: null,
          displayName: "Processing...",
          timestamp: new Date(),
          totalDetections: 0,
          isNew: false,
        },
      });
    }

    res.status(500).json({ success: false, message: err.message });
  }
};

export const listUnknown = async (req, res) => {
  const { limit = 50, status = "active" } = req.query;
  const query = status === "all" ? {} : { status };

  const unknownPersons = await UnknownPerson.find(query)
    .sort({ lastSeen: -1 })
    .limit(parseInt(limit));

  console.log(`🔍 [listUnknown] Found ${unknownPersons.length} records with status: ${status}`);

  // ✅ FIXED: Map to include fallback for faceImageUrl
  const personsWithImages = unknownPersons.map(person => ({
    ...person.toObject(),
    faceImageUrl: person.faceImageUrl || person.faceImagePath
  }));

  const total = await UnknownPerson.countDocuments({ status });
  res.json({
    success: true,
    total,
    count: personsWithImages.length,
    unknownPersons: personsWithImages  // ✅ FIXED: Return mapped array
  });
};

export const getUnknownById = async (req, res) => {
  const person = await UnknownPerson.findOne({ unknownId: req.params.unknownId });
  if (!person) {
    return res.status(404).json({ success: false, message: "Unknown person not found" });
  }

  // ✅ FIXED: Add fallback here too
  const personData = {
    ...person.toObject(),
    faceImageUrl: person.faceImageUrl || person.faceImagePath
  };

  res.json({ success: true, data: personData });
};

export const deleteUnknown = async (req, res) => {
  const person = await UnknownPerson.findOne({ unknownId: req.params.unknownId });
  if (!person) {
    return res.status(404).json({ success: false, message: "Unknown person not found" });
  }

  if (person.faceImagePath) {
    deleteImageFile(person.faceImagePath);
  }

  await UnknownPerson.findOneAndDelete({ unknownId: req.params.unknownId });
  res.json({ success: true, message: "Unknown person record and image deleted" });
};