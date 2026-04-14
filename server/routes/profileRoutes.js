import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { deleteProfile, getProfile, upsertProfile } from "../controllers/profileController.js";

const router = express.Router();

router.get("/", authMiddleware, getProfile);
router.put("/", authMiddleware, upsertProfile);
router.delete("/", authMiddleware, deleteProfile);

export default router;
