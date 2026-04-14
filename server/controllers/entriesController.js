import Entry from "../models/entryModel.js";

const getEntries = async (req, res) => {
    try {
        const entries = await Entry.find({ userId: req.user._id }).sort({ timestamp: -1 });
        res.status(200).json({
            success: true,
            count: entries.length,
            entries
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch entries",
            error: error.message
        });
    }
};

const createEntry = async (req, res) => {
    try {
        const { brand, quantity = 1, timestamp, cost } = req.body;

        if (!brand || typeof brand !== "string") {
            return res.status(400).json({
                success: false,
                message: "Brand is required"
            });
        }

        const parsedQuantity = Number(quantity);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be at least 1"
            });
        }

        const parsedCost = cost === undefined || cost === null ? null : Number(cost);
        if (parsedCost !== null && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
            return res.status(400).json({
                success: false,
                message: "Cost must be a positive number"
            });
        }

        const entry = await Entry.create({
            userId: req.user._id,
            brand: brand.trim(),
            quantity: parsedQuantity,
            cost: parsedCost,
            timestamp: timestamp ? new Date(timestamp) : new Date()
        });

        res.status(201).json({
            success: true,
            entry
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to create entry",
            error: error.message
        });
    }
};

const deleteEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Entry.findOneAndDelete({ _id: id, userId: req.user._id });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Entry not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Entry deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete entry",
            error: error.message
        });
    }
};

const updateEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = {};

        if (req.body.brand !== undefined) {
            const brand = String(req.body.brand || "").trim();
            if (!brand) {
                return res.status(400).json({ success: false, message: "Brand is required" });
            }
            updates.brand = brand;
        }
        if (req.body.quantity !== undefined) {
            const q = Number(req.body.quantity);
            if (!Number.isFinite(q) || q < 1) {
                return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
            }
            updates.quantity = q;
        }
        if (req.body.cost !== undefined) {
            const raw = req.body.cost;
            const cost = raw === null || raw === "" ? null : Number(raw);
            if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
                return res.status(400).json({ success: false, message: "Cost must be a positive number" });
            }
            updates.cost = cost;
        }
        if (req.body.timestamp !== undefined) {
            updates.timestamp = new Date(req.body.timestamp);
        }

        const entry = await Entry.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            updates,
            { new: true }
        );
        if (!entry) {
            return res.status(404).json({ success: false, message: "Entry not found" });
        }

        res.status(200).json({ success: true, entry });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update entry", error: error.message });
    }
};

export { getEntries, createEntry, updateEntry, deleteEntry };
