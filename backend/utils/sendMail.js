import sgMail from '@sendgrid/mail';
import bcrypt from "bcryptjs";
import UserVerification from "../models/UserVerification.js";
import 'dotenv/config';

// Use the correct variable name from your .env
sgMail.setApiKey(process.env.SEND_API);

const sendMail = async ({ _id, email, firstName }) => {
  try {
    // --- 1. OTP Generation ---
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // --- 2. Database Update ---
    await UserVerification.findOneAndUpdate(
      { userId: _id },
      {
        verificationCode: hashedOtp,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // --- 3. The Transformation for Deliverability ---
    const msg = {
      to: email,
      // 1. ADD FRIENDLY NAME: Gmail hates raw email addresses in the 'from' field
      from: {
        name: 'HE System Support',
        email: process.env.AUTH_EMAIL
      },
      replyTo: process.env.AUTH_EMAIL,
      // 2. CLEAR SUBJECT: Avoid leading with numbers; it triggers spam filters
      subject: "Verify your HE System account",
      // 3. PLAIN TEXT FALLBACK: Mandatory for high deliverability
      text: `Hi ${firstName}, your verification code is ${otp}. It expires in 10 minutes.`,
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #007BFF; font-size: 22px;">Email Verification</h2>
      <p>Hi ${firstName},</p>
      <p>Please use the verification code below to secure your HE System account. This code is valid for 10 minutes.</p>
      
      <div style="margin: 25px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; text-align: center; border: 1px dashed #007BFF;">
        <span style="font-size: 32px; font-weight: bold; color: #007BFF; letter-spacing: 5px;">${otp}</span>
      </div>
      
      <p style="font-size: 13px; color: #777;">If you did not request this code, please ignore this email or contact support if you have concerns.</p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      
      <p style="font-size: 11px; color: #aaa; text-align: center;">
        Sent via HE System Security <br>
        This is an automated message, please do not reply directly.
      </p>
    </div>
  `,
    };

    await sgMail.send(msg);
    // console.log(`✅ Inbox-optimized email sent to ${email}`);

    return { status: "pending", message: "Verification Email Sent" };

  } catch (error) {
    console.error("❌ SendGrid Error:", JSON.stringify(error.response?.body, null, 2));
    throw new Error("Could not send verification email.");
  }
};

export default sendMail;