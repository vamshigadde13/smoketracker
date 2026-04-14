import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getNotificationSettings, upsertNotificationSettings } from "../controllers/notificationSettingsController.js";

const router = express.Router();

router.get("/", authMiddleware, getNotificationSettings);
router.put("/", authMiddleware, upsertNotificationSettings);

export default router;
