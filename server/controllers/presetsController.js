import Preset from "../models/presetModel.js";

const getPresets = async (req, res) => {
  try {
    const presets = await Preset.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, presets });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch presets", error: error.message });
  }
};

const createPreset = async (req, res) => {
  try {
    const brand = String(req.body?.brand || "").trim();
    const quantity = Math.max(1, Number(req.body?.quantity) || 1);
    const rawCost = req.body?.costPerSmoke;
    const costPerSmoke = rawCost === undefined || rawCost === null || rawCost === "" ? null : Number(rawCost);

    if (!brand) return res.status(400).json({ success: false, message: "Brand is required" });
    if (costPerSmoke !== null && (!Number.isFinite(costPerSmoke) || costPerSmoke < 0)) {
      return res.status(400).json({ success: false, message: "costPerSmoke must be >= 0" });
    }

    const preset = await Preset.create({ userId: req.user._id, brand, quantity, costPerSmoke });
    res.status(201).json({ success: true, preset });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create preset", error: error.message });
  }
};

const updatePreset = async (req, res) => {
  try {
    const updates = {};
    if (req.body?.brand !== undefined) updates.brand = String(req.body.brand || "").trim();
    if (req.body?.quantity !== undefined) updates.quantity = Math.max(1, Number(req.body.quantity) || 1);
    if (req.body?.costPerSmoke !== undefined) {
      const raw = req.body.costPerSmoke;
      const parsed = raw === null || raw === "" ? null : Number(raw);
      if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
        return res.status(400).json({ success: false, message: "costPerSmoke must be >= 0" });
      }
      updates.costPerSmoke = parsed;
    }

    const preset = await Preset.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true }
    );
    if (!preset) return res.status(404).json({ success: false, message: "Preset not found" });
    res.status(200).json({ success: true, preset });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update preset", error: error.message });
  }
};

const deletePreset = async (req, res) => {
  try {
    const deleted = await Preset.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deleted) return res.status(404).json({ success: false, message: "Preset not found" });
    res.status(200).json({ success: true, message: "Preset deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete preset", error: error.message });
  }
};

export { getPresets, createPreset, updatePreset, deletePreset };
