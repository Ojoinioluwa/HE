
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: {
        status: 429,
        message: "Too many requests from this IP, please try again later"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export default limiter