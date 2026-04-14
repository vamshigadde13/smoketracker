import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createBrand, deleteBrand, getBrands } from "../controllers/brandsController.js";

const router = express.Router();

router.get("/", authMiddleware, getBrands);
router.post("/", authMiddleware, createBrand);
router.delete("/:id", authMiddleware, deleteBrand);

export default router;
