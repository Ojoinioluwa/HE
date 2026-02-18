import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import UserVerification from "../models/UserVerification.js";

// Initialize Transporter

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true, // Forces a secure connection
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASSWORD,
  },
  tls: {
    // This prevents the connection from being dropped by self-signed certificate errors
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
});


const sendMail = async ({ _id, email, firstName }) => {
  try {
    // 1. Generate and Hash OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // 2. UPSERT: Update if exists, Create if not (Cleaner than if/else)
    await UserVerification.findOneAndUpdate(
      { userId: _id },
      {
        verificationCode: hashedOtp,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. Email Content
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Verify Your Email Address",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #007BFF;">Verify Your Email</h2>
          <p>Hello ${firstName},</p>
          <p>Use the code below to complete your registration:</p>
          <div style="font-size: 32px; font-weight: bold; background: #f8f9fa; padding: 20px; text-align: center; letter-spacing: 5px;">
            ${otp}
          </div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    };

    // 4. Send the mail
    await transporter.sendMail(mailOptions);
    return { status: "pending", message: "Verification Email Sent" };

  } catch (error) {
    console.error("❌ Error in sendMail utility:", error);
    throw new Error("Could not send verification email.");
  }
};

export default sendMail;