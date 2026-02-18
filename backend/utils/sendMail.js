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
      to: email, // This can now be ANY email address
      from: process.env.AUTH_EMAIL, // This MUST be your verified Single Sender email
      subject: "Verify Your Email Address",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #007BFF;">Verify Your Email</h2>
          <p>Hello ${firstName},</p>
          <p>Use the code below to complete your registration for the HE System:</p>
          <div style="font-size: 32px; font-weight: bold; background: #f8f9fa; padding: 20px; text-align: center; letter-spacing: 5px;">
            ${otp}
          </div>
          <p>This code expires in 10 minutes.</p>
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