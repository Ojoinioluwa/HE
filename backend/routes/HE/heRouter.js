import express from "express"
import isAuthenticated from "../../middlewares/isAuth.js";
const heRouter = express.Router();

import heController from "../../controller/he.controller.js";


// HE System Initialization and Data Management Routes
heRouter.post('/init', isAuthenticated, heController.initializeHE);
heRouter.post('/data/upload', isAuthenticated, heController.uploadCiphertext);
heRouter.get('/data/my-uploads', isAuthenticated, heController.getUserCiphertexts);
heRouter.get('/data/getCipherByid/:id', isAuthenticated, heController.getCiphertextById);





export default heRouter