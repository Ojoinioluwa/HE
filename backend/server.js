import dotenv from "dotenv"
dotenv.config(); // Load environment variables first

import express from "express"
import mongoose from "mongoose"
import SEAL from "node-seal" // The SEAL factory function

// Import the shared state and the setter function
import { setHEGlobals } from './global/heState.js'; // Assumes path is correct

// --- Middleware & Router Imports (Note the .js extensions) ---
import errorhandler from "./middlewares/errorHandler.js";
import userRouter from "./routes/user/userRouter.js";
import limiter from "./middlewares/rateLimiter.js";
import helmet from "helmet";
import heRouter from "./routes/he/heRouter.js";


const app = express();
const PORT = process.env.PORT || 8888;


// --- Initialization Functions ---

/**
 * Initializes the node-seal WebAssembly module.
 * Only initializes the core SEAL object, not the Context/Evaluator.
 */
async function initializeSEAL() {
    try {
        // Await the SEAL factory function. This returns the initialized SEAL API object.
        const newSeal = await SEAL();

        // The Evaluator and Context must be initialized later inside the API endpoint
        // (e.g., /he/init) where the client provides the necessary parameters.

        // Set the global state using the imported setter function
        // Pass null for context and evaluator, as they depend on client-provided parameters.
        setHEGlobals(newSeal, null, null, {});

        console.log(`Node-SEAL version: ${newSeal.version || "unknown version"} initialized.`);
    } catch (err) {
        // Catch the WASM initialization error or any other SEAL setup issue
        console.error("Error initializing node-seal:", err);
        throw new Error("Failed to initialize Homomorphic Encryption system.");
    }
}

/**
 * Connects to MongoDB.
 */
async function connectToMongoDB() {
    try {
        // Check if MONGODB_URI is available
        if (!process.env.MONGODB_URI) {
            console.warn("MONGODB_URI is missing. Database connection skipped.");
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDb connected successfully");
    } catch (err) {
        console.error("Error connecting to the database:", err.message);
        throw err;
    }
}

/**
 * Wraps the setup and starts the server only after all asynchronous tasks complete.
 */
async function startServer() {
    // 1. Initialize HE System
    await initializeSEAL();

    // 2. Connect to Database
    await connectToMongoDB();

    // --- Express Middleware Setup ---
    app.use(express.json());
    app.use(limiter);
    app.use(helmet());

    // --- Consume Routes ---
    app.use("/api/v1", userRouter);
    app.use("/api/v1/he", heRouter); // The Homomorphic Encryption routes

    // --- Error Handler Middleware ---
    app.use(errorhandler);

    // 3. Start Listening
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Execute the server start logic and catch any fatal errors
startServer().catch(err => {
    console.error("Fatal error during server startup, shutting down:", err);
    // Exit the process with a failure code
    process.exit(1);
});

// NOTE: We do not use 'export default { ... }' here anymore,
// as the globals are managed via the 'heState.js' file to avoid circular dependencies.