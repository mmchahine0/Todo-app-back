import nodemailer from "nodemailer";
import { sendEmailWithRetry } from "../../utils/emailService";
import { verificationEmailTemplate } from "./verificationTemplate";

// Security configurations
const SECURITY_HEADERS = {
  "x-mailer": "SecureMailer 1.0",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const CSP_POLICY = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "frame-src 'none'",
  "form-action 'none'",
].join("; ");

export const sendVerificationEmail = async (
  email: string,
  otp: string
): Promise<void> => {
  const mailOptions: nodemailer.SendMailOptions = {
    from: `"Account Security" <${process.env.GMAIL_EMAIL!}>`,
    to: email,
    subject: "Email Verification Code",
    headers: SECURITY_HEADERS,
    html: verificationEmailTemplate(otp, CSP_POLICY),
  };

  await sendEmailWithRetry(mailOptions);
};
