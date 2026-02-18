import dotenv from "dotenv";
dotenv.config(); // Load env variables
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import SEAL from "node-seal";

// --- Middleware & Router Imports ---
import errorhandler from "./middlewares/errorHandler.js";
import userRouter from "./routes/user/userRouter.js";
import limiter from "./middlewares/rateLimiter.js";
import helmet from "helmet";
import heRouter from "./routes/he/heRouter.js";

// --- Globals Holder ---
export const sealGlobals = {
    seal: null, // will store the SEAL instance
};

const app = express();
const PORT = process.env.PORT || 8888;

const allowedOrigin =
    process.env.NODE_ENV === "production"
        ? "https://he.com"
        : "http://localhost:5173";

app.use(
    cors({
        origin: allowedOrigin,
        credentials: true,
    })
);

// --- Initialization Functions ---

/**
 * Initialize Node-SEAL
 */
async function initializeSEAL() {
    try {
        const sealInstance = await SEAL();
        sealGlobals.seal = sealInstance; // store globally
        console.log(`Node-SEAL version: ${sealInstance.version || "unknown"} initialized.`);
    } catch (err) {
        console.error("Error initializing Node-SEAL:", err);
        throw new Error("Failed to initialize Homomorphic Encryption system.");
    }
}

/**
 * Connect to MongoDB
 */
async function connectToMongoDB() {
    try {
        if (!process.env.MONGODB_URI) {
            console.warn("MONGODB_URI not provided. Skipping database connection.");
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully");
    } catch (err) {
        console.error("Error connecting to MongoDB:", err.message);
        throw err;
    }
}

/**
 * Start the server
 */
async function startServer() {
    await initializeSEAL();
    await connectToMongoDB();

    // --- Express Middleware ---
    app.use(express.json({ limit: "100mb" }));
    app.use(express.urlencoded({ limit: "100mb", extended: true }));
    app.use(limiter);
    app.use(helmet());

    // --- Routes ---
    app.use("/api/v1", userRouter);
    app.use("/api/v1/he", heRouter);

    // --- Error handler ---
    app.use(errorhandler);

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// --- Execute startup ---
startServer().catch((err) => {
    console.error("Fatal error during server startup:", err);
    process.exit(1);
});
