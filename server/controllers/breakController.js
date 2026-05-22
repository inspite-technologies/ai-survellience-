import { BreakManagement, BreakSettings } from "../models/breakSchema.js";

const addBreak = async (req, res) => {
  try {
    const createBreak = await BreakManagement.create(req.body);
    return res.status(201).json({
      success: true,
      msg: "Break added successfully",
      data: createBreak,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllBreaks = async (req, res) => {
  try {
    const fetchAll = await BreakManagement.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      msg: "Fetch all breaks successfully",
      data: fetchAll,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateBreak = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBreak = await BreakManagement.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedBreak) {
      return res.status(404).json({
        success: false,
        msg: "Break not found",
      });
    }

    return res.status(200).json({
      success: true,
      msg: "Break updated successfully",
      data: updatedBreak,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteBreak = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await BreakManagement.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, msg: "Break not found" });
    return res.status(200).json({
      success: true,
      msg: "Break deleted successfully"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const toggleBreakStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const breakData = await BreakManagement.findById(id);
    if (!breakData) {
      return res.status(404).json({
        success: false,
        msg: "Break not found",
      });
    }

    breakData.isActive = !breakData.isActive;
    await breakData.save();

    return res.status(200).json({
      success: true,
      msg: `Break ${breakData.isActive ? "Activated" : "Deactivated"} successfully`,
      data: breakData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Global Settings Handlers
const getGlobalSettings = async (req, res) => {
  try {
    let settings = await BreakSettings.findOne();
    if (!settings) {
      settings = await BreakSettings.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateGlobalSettings = async (req, res) => {
  try {
    const settings = await BreakSettings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.status(200).json({ success: true, msg: "Global settings updated", data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export {
  addBreak,
  getAllBreaks,
  updateBreak,
  deleteBreak,
  toggleBreakStatus,
  getGlobalSettings,
  updateGlobalSettings
};
