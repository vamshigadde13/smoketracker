import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createEntry, deleteEntry, getEntries, updateEntry } from "../controllers/entriesController.js";

const router = express.Router();

router.get("/", authMiddleware, getEntries);
router.post("/", authMiddleware, createEntry);
router.put("/:id", authMiddleware, updateEntry);
router.delete("/:id", authMiddleware, deleteEntry);

export default router;
