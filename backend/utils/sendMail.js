import sgMail from '@sendgrid/mail';
import bcrypt from "bcryptjs";
import UserVerification from "../models/UserVerification.js";

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendMail = async ({ _id, email, firstName }) => {
  try {
    // --- 1. OTP Generation (Same as before) ---
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // --- 2. Database Update (Same as before) ---
    await UserVerification.findOneAndUpdate(
      { userId: _id },
      {
        verificationCode: hashedOtp,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // --- 3. Send via SendGrid ---
    const msg = {
      to: email,
      from: `HE System <${process.env.AUTH_EMAIL}>`, // Use a "Friendly Name"
      replyTo: process.env.AUTH_EMAIL,
      subject: `${otp} is your HE System verification code`, // Subject lines with OTPs often perform better
      html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 40px 20px; color: #333; line-height: 1.6;">
      <h2 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Verify your email address</h2>
      <p>Hi ${firstName},</p>
      <p>Thank you for joining the HE System. To complete your registration and secure your account, please enter the following verification code:</p>
      
      <div style="margin: 30px 0; padding: 20px; background-color: #f4f7fa; border-radius: 8px; text-align: center;">
        <span style="font-size: 28px; font-weight: 700; color: #007BFF; letter-spacing: 2px;">${otp}</span>
      </div>
      
      <p style="font-size: 14px; color: #666;">This code is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="font-size: 12px; color: #999; text-align: center;">
        © 2026 HE System. All rights reserved.<br>
        123 Tech Lane, Silicon Valley, CA 94000
      </p>
    </div>
  `,
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent to ${email} via SendGrid`);

    return { status: "pending", message: "Verification Email Sent" };

  } catch (error) {
    console.error("❌ SendGrid Error:", error.response ? error.response.body : error.message);
    throw new Error("Could not send verification email.");
  }
};

export default sendMail;