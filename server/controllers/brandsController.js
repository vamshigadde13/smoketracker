import Brand from "../models/brandModel.js";

const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ userId: req.user._id }).sort({ name: 1 });
    res.status(200).json({ success: true, brands });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch brands", error: error.message });
  }
};

const createBrand = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Brand name is required" });
    }

    const brand = await Brand.findOneAndUpdate(
      { userId: req.user._id, name },
      { $setOnInsert: { userId: req.user._id, name } },
      { new: true, upsert: true }
    );
    res.status(201).json({ success: true, brand });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create brand", error: error.message });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const deleted = await Brand.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deleted) return res.status(404).json({ success: false, message: "Brand not found" });
    res.status(200).json({ success: true, message: "Brand deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete brand", error: error.message });
  }
};

export { getBrands, createBrand, deleteBrand };
