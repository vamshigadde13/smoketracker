import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { disablePushToken, upsertPushToken } from "../controllers/pushTokenController.js";

const router = express.Router();

router.put("/", authMiddleware, upsertPushToken);
router.delete("/", authMiddleware, disablePushToken);

export default router;
