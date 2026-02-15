import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail", // Direct string is more reliable for Gmail
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS, // This MUST be the 16-char App Password
  },
});

export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Yuti Chat App" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("✅ Email sent successfully: %s", info.messageId);
    return true;
  } catch (error) {
    // This will now show the exact reason in the terminal if it fails
    console.error("❌ Nodemailer Error:", error.message);
    return false;
  }
};