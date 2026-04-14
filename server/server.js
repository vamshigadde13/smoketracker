import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import entriesRoutes from "./routes/entriesRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import brandsRoutes from "./routes/brandsRoutes.js";
import presetsRoutes from "./routes/presetsRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import notificationSettingsRoutes from "./routes/notificationSettingsRoutes.js";

dotenv.config();

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
    console.warn("Warning: JWT_SECRET is not set in environment variables. Using default secret.");
    process.env.JWT_SECRET = 'your-super-secret-key-123';
}

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Routes
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/entries", entriesRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/brands", brandsRoutes);
app.use("/api/v1/presets", presetsRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/notification-settings", notificationSettingsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
});

// 404 handler - must be last
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

export default app;
