import bcrypt from "bcryptjs"
import { Resend } from "resend";
import UserVerification from "../models/UserVerification.js";

const resend = new Resend("re_123");

const sendMail = async ({ _id, email, firstName, type = "create" }) => {
  try {
    // Generate OTP and hash it
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Check if verification already exists
    const existing = await UserVerification.findOne({ userId: _id });

    if (!existing || existing.expiresAt < new Date()) {
      if (existing) await UserVerification.findByIdAndDelete(existing._id);
      await UserVerification.create({
        userId: _id,
        verificationCode: hashedOtp,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
      });
    } else {
      await UserVerification.findOneAndUpdate(
        { userId: _id },
        {
          verificationCode: hashedOtp,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        }
      );
    }

    // Determine email content
    let subject, html;

    if (type === "create") {
      subject = "Your Verification Code - Complete Your Signup";
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: #007BFF;">Verify Your Email Address</h2>
          <p>Hello ${firstName},</p>
          <p>Thank you for signing up for <strong>Your App Name</strong>! Use the verification code below to complete your registration:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 10px; width: fit-content; margin: 20px 0;">
            <span style="letter-spacing: 3px;">${otp}</span>
          </div>
          <p>This code is valid for the next 10 minutes. If you didn’t request this, you can safely ignore this email.</p>
          <p>Best regards,<br><strong>Your App Name</strong> Team</p>
        </div>
      `;
    } else if (type === "forgot-password") {
      subject = "Reset Your Password - Verification Code";
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: #DC3545;">Reset Your Password</h2>
          <p>Hello ${firstName},</p>
          <p>We received a request to reset your password for <strong>Your App Name</strong>. Use the code below to proceed:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f8d7da; padding: 10px; width: fit-content; margin: 20px 0; border: 1px solid #f5c6cb; color: #721c24;">
            <span style="letter-spacing: 3px;">${otp}</span>
          </div>
          <p>This code is valid for the next 10 minutes. If you didn’t request this, ignore this email.</p>
          <p>Stay secure,<br><strong>Your App Name</strong> Team</p>
        </div>
      `;
    }

    // Send email via Resend API
    const response = await resend.emails.send({
      from: `YourApp <onboarding@resend.dev>`, // You can replace with your verified domain
      to: email,
      subject,
      html,
    });

    console.log("Resend response:", response);
    return { status: "pending", message: "Verification Email Sent" };
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Could not send verification email. Please try again.");
  }
};

export default sendMail;
