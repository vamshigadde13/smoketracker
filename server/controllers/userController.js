import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateUniqueCode } from "../utils/friendCode.js";

// Ensure we have a JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-123';
const UNIQUE_CODE_REGEX = /^[a-z0-9_]{3,24}#[0-9]{4}$/;

const registerUser = async (req, res) => {
    try {
        const { username, password, uniqueCode: requestedUniqueCode } = req.body;
        const normalizedUsername = String(username || "").trim().toLowerCase();

        // Validate required fields
        if (!normalizedUsername || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required",
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ username: normalizedUsername });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists",
                conflict: "username",
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const displayName = normalizedUsername;

        let uniqueCode = "";
        const normalizedRequestedCode = String(requestedUniqueCode || "").trim().toLowerCase();
        if (normalizedRequestedCode) {
            if (!UNIQUE_CODE_REGEX.test(normalizedRequestedCode)) {
                return res.status(400).json({
                    success: false,
                    message: "Unique code must match format name#1234",
                });
            }
            const [codeNamePart] = normalizedRequestedCode.split("#");
            if (codeNamePart !== normalizedUsername) {
                return res.status(400).json({
                    success: false,
                    message: "Unique code name must match your username",
                });
            }
            const existingUniqueCode = await User.findOne({ uniqueCode: normalizedRequestedCode });
            if (existingUniqueCode) {
                return res.status(409).json({
                    success: false,
                    message: "Unique code already exists",
                    conflict: "uniqueCode",
                });
            }
            uniqueCode = normalizedRequestedCode;
        } else {
            uniqueCode = await generateUniqueCode(normalizedUsername);
        }

        // Create new user
        const newUser = new User({
            username: normalizedUsername,
            displayName,
            uniqueCode,
            passwordHash,
            avatarUrl: req.body.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`
        });

        await newUser.save();

        // Omit sensitive data from response
        const userResponse = newUser.toObject();
        delete userResponse.__v;
        delete userResponse.passwordHash;

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: userResponse,
        });
    } catch (err) {
        console.error("Registration error:", err);

        // Handle Mongoose validation errors
        if (err.name === "ValidationError") {
            const errors = Object.values(err.errors).map((el) => el.message);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors,
            });
        }

        // Handle duplicate key error
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(409).json({
                success: false,
                message: `${field} already exists`,
            });
        }

        res.status(500).json({
            success: false,
            message: "Server error during registration",
            error: err.message,
        });
    }
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;

    // Debug logging
    console.log('Login request received:', { username, password: password ? '***' : 'missing' });

    // Validate input exists
    if (!String(username || "").trim() || !password) {
        console.log('Validation failed: Missing required fields');
        return res.status(400).json({
            success: false,
            message: "Username and password are required",
        });
    }

    try {
        // Find user by username or alias(displayName)
        const loginId = String(username || "").trim();
        const normalizedLoginId = loginId.toLowerCase();
        const user = await User.findOne({
            $or: [{ username: normalizedLoginId }, { displayName: { $regex: `^${loginId}$`, $options: "i" } }],
        });
        console.log('Looking up user with username/alias:', loginId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found. Please register first.",
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password",
            });
        }

        // Generate JWT token with longer expiration (30 days)
        const tokenPayload = {
            userId: user._id,
            username: user.username,
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, {
            expiresIn: '30d' // 30 days expiration
        });

        // Prepare user data for response (excluding sensitive data)
        const userData = {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            uniqueCode: user.uniqueCode || "",
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        res.status(200).json({
            success: true,
            message: "Login successful",
            user: userData,
            token: token
        });
        console.log('Login successful for user:', userData.username);
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-__v -passwordHash");
        res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        // The user object is already attached by auth middleware
        const user = req.user;

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Remove sensitive data from response
        const userResponse = user.toObject ? user.toObject() : user;
        delete userResponse.passwordHash;
        delete userResponse.__v;

        res.status(200).json({
            success: true,
            user: userResponse,
        });
    } catch (error) {
        console.error("Error in getCurrentUser:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

const updateUser = async (req, res) => {
    const { username, displayName, avatarUrl, password } = req.body;
    const userId = req.user._id;

    try {
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Check for existing username conflicts
        if (username) {
            const usernameExists = await User.findOne({
                username: username.toLowerCase(),
                _id: { $ne: userId },
            });

            if (usernameExists) {
                return res.status(409).json({
                    success: false,
                    message: "Username is already in use by another user",
                });
            }
        }

        // Update user information
        if (username) user.username = username.toLowerCase();
        if (displayName) user.displayName = displayName;
        if (avatarUrl) user.avatarUrl = avatarUrl;

        // Update password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.passwordHash = await bcrypt.hash(password, salt);
        }

        await user.save();

        // Remove sensitive data from response
        const userResponse = user.toObject();
        delete userResponse.passwordHash;
        delete userResponse.__v;

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            user: userResponse,
        });
    } catch (error) {
        console.error("Error updating user:", error);

        // Handle duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(409).json({
                success: false,
                message: `${field} is already in use by another user`,
            });
        }

        res.status(500).json({
            success: false,
            message: "Server error during update",
            error: error.message,
        });
    }
};

const deleteUser = async (req, res) => {
    const userId = req.user._id;

    try {
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Delete user
        await User.findByIdAndDelete(userId);

        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({
            success: false,
            message: "Server error during deletion",
            error: error.message,
        });
    }
};



export {
    registerUser,
    loginUser,
    getAllUsers,
    getCurrentUser,
    updateUser,
    deleteUser,
};
