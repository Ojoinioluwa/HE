import rateLimit from "express-rate-limit"

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many login attempts. Try again later"
})

export default authLimiter