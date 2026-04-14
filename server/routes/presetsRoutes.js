import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createPreset, deletePreset, getPresets, updatePreset } from "../controllers/presetsController.js";

const router = express.Router();

router.get("/", authMiddleware, getPresets);
router.post("/", authMiddleware, createPreset);
router.put("/:id", authMiddleware, updatePreset);
router.delete("/:id", authMiddleware, deletePreset);

export default router;
