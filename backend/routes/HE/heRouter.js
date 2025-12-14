import express from "express"
import isAuthenticated from "../../middlewares/isAuth.js";
const heRouter = express.Router();

import heController from "../../controller/he.controller.js";


// All HE routes require a valid JWT token
// heRouter.post('/init', isAuthenticated, heController.initializeHE);
// heRouter.post('/data/upload', isAuthenticated, heController.uploadCiphertext);
// heRouter.post('/compute/sum', isAuthenticated, heController.computeSum);
// heRouter.post('/compute/linear-regression', isAuthenticated, heController.computeLinearRegression);



// HE System Initialization and Data Management Routes
heRouter.post('/init', heController.initializeHE); // 👈 Authentication REMOVED
heRouter.post('/data/upload', heController.uploadCiphertext); // 👈 Authentication REMOVED

// HE Computation Routes
heRouter.post('/compute/sum', heController.computeSum); // 👈 Authentication REMOVED
heRouter.post('/compute/linear-regression', heController.computeLinearRegression); // 👈 Authentication REMOVED



export default heRouter