import jwt from "jsonwebtoken"
import User from "../models/User.js"
import mongoose from "mongoose"


const isAuthenticated = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = authHeader.split(" ")[1];


  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mongoose Id"
      })
    }

    const user = await User.findById(decoded.id).select("_id userType").lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user no longer exists"
      });
    }

    req.user = {
      _id: user._id,
    }

    next();
  } catch (error) {
    console.error("JWT Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed"
    });
  }
};

export default isAuthenticated;
