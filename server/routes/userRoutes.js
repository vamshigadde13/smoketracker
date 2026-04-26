import express from "express";
import { registerUser, loginUser, resetPasswordByLoginId, getAllUsers, getCurrentUser, updateUser, deleteUser } from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", resetPasswordByLoginId);
router.get("/allusers", authMiddleware, getAllUsers);
router.get("/user", authMiddleware, getCurrentUser);
router.get("/currentuser", authMiddleware, getCurrentUser);
router.put("/updateuser", authMiddleware, updateUser);
router.delete("/deleteuser", authMiddleware, deleteUser);

export default router;
