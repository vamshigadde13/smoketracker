import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { acceptFriendRequest, addFriendByCode, getFriends, rejectFriendRequest } from "../controllers/friendsController.js";

const router = express.Router();

router.post("/add-by-code", authMiddleware, addFriendByCode);
router.post("/request", authMiddleware, addFriendByCode);
router.get("/", authMiddleware, getFriends);
router.post("/accept", authMiddleware, acceptFriendRequest);
router.post("/reject", authMiddleware, rejectFriendRequest);

export default router;
