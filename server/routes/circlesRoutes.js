import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
    addCircleMember,
    createCircle,
    getCircleSettings,
    getCircles,
    removeCircleMember,
    saveCircleSettings
} from "../controllers/circlesController.js";

const router = express.Router();

router.post("/create", authMiddleware, createCircle);
router.get("/", authMiddleware, getCircles);
router.post("/add-member", authMiddleware, addCircleMember);
router.post("/remove-member", authMiddleware, removeCircleMember);
router.get("/:id/settings", authMiddleware, getCircleSettings);
router.post("/:id/settings", authMiddleware, saveCircleSettings);

export default router;
