import nodemailer from "nodemailer";
import { sendEmailWithRetry } from "../../utils/emailService";
import { resetTemplate } from "./resetTemplate";

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

export const sendPasswordResetEmail = async (
  email: string,
  code: string
): Promise<void> => {
  const mailOptions: nodemailer.SendMailOptions = {
    from: `"Account Security" <${process.env.GMAIL_EMAIL!}>`,
    to: email,
    subject: "Password Reset Code",
    headers: SECURITY_HEADERS,
    html: resetTemplate(code, CSP_POLICY),
  };

  await sendEmailWithRetry(mailOptions);
};
