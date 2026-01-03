import express from "express"
import userController from "../../controller/user.controller.js";
import authLimiter from "../../middlewares/authLimiter.js";
import isAuthenticated from "../../middlewares/isAuth.js";


const userRouter = express.Router();

// Auth
userRouter.post("/auth/register", userController.register);
userRouter.post("/auth/login", authLimiter, userController.login);
userRouter.post("/auth/verify-user", userController.verifyUser);

// Password Recovery
userRouter.post("/auth/forgot-password", userController.forgotPassword);
userRouter.post("/auth/reset-password", userController.resetPassword);
userRouter.put("/auth/change-password", isAuthenticated, userController.changePassword);



// Profile
userRouter.get("/profile", isAuthenticated, userController.getUserProfile);
userRouter.put("/profile", isAuthenticated, userController.updateProfile);

userRouter.post('/update-he-keys', isAuthenticated, userController.updateHEKeys);


export default userRouter;
