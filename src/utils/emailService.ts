import nodemailer from "nodemailer";
import { google } from "googleapis";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const OAuth2 = google.auth.OAuth2;

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

// OTP configurations
const OTP_CONFIG = {
  length: 6,
  expiresIn: 15 * 60 * 1000, // 15 minutes
  attempts: 10,
};

const getAccessToken = async (): Promise<string> => {
  const oauth2Client = new OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
  });

  try {
    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error("Failed to retrieve access token");
    return token;
  } catch (error) {
    throw new Error(`Access token error: ${error}`);
  }
};

const createTransporter = async () => {
  try {
    const accessToken = await getAccessToken();

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_EMAIL!,
        accessToken,
        clientId: process.env.GMAIL_CLIENT_ID!,
        clientSecret: process.env.GMAIL_CLIENT_SECRET!,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 10,
    });
  } catch (error) {
    throw new Error(`Transporter creation failed: ${error}`);
  }
};

const sendEmailWithRetry = async (
  mailOptions: nodemailer.SendMailOptions,
  retries = 3
): Promise<void> => {
  let transporter: nodemailer.Transporter;

  try {
    transporter = await createTransporter();
  } catch (error) {
    throw new Error(`Failed to create transporter: ${error}`);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      return;
    } catch (error) {
      if (attempt === retries) {
        throw new Error(
          `Email send failed after ${retries} attempts: ${error}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
};

export const generateSecureOTP = (): { code: string; hash: string } => {
  const code = crypto.randomInt(100000, 999999).toString();
  const hash = bcrypt.hashSync(code, 10);
  return { code, hash };
};

export const verifyOTP = (
  storedHash: string,
  receivedCode: string
): boolean => {
  return bcrypt.compareSync(receivedCode, storedHash);
};

export const sendVerificationEmail = async (
  email: string,
  otp: string
): Promise<void> => {
  const mailOptions: nodemailer.SendMailOptions = {
    from: `"Account Security" <${process.env.GMAIL_EMAIL!}>`,
    to: email,
    subject: "Email Verification Code",
    headers: SECURITY_HEADERS,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="Content-Security-Policy" content="${CSP_POLICY}">
        </head>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a73e8;">Account Verification</h2>
            <p>Your verification code is:</p>
            <div style="font-size: 24px; font-weight: bold; margin: 20px 0; padding: 10px; background: #f8f9fa; display: inline-block;">
              ${otp}
            </div>
            <p>This code will expire in 15 minutes.</p>
            <hr style="border: 1px solid #e0e0e0;">
            <p style="color: #5f6368;">If you didn't request this code, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
    `,
  };

  await sendEmailWithRetry(mailOptions);
};

export const sendPasswordResetEmail = async (
  email: string,
  code: string
): Promise<void> => {
  const mailOptions: nodemailer.SendMailOptions = {
    from: `"Account Security" <${process.env.GMAIL_EMAIL!}>`,
    to: email,
    subject: "Password Reset Code",
    headers: SECURITY_HEADERS,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="Content-Security-Policy" content="${CSP_POLICY}">
        </head>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a73e8;">Password Reset Request</h2>
            <p>Your password reset code is:</p>
            <div style="font-size: 24px; font-weight: bold; margin: 20px 0; padding: 10px; background: #f8f9fa; display: inline-block;">
              ${code}
            </div>
            <p>This code will expire in 15 minutes.</p>
            <hr style="border: 1px solid #e0e0e0;">
            <p style="color: #5f6368;">If you didn't request this password reset, please secure your account immediately.</p>
          </div>
        </body>
      </html>
    `,
  };

  await sendEmailWithRetry(mailOptions);
};

// Database model interface example
export interface OTPRecord {
  email: string;
  codeHash: string;
  createdAt: Date;
  type: "VERIFICATION" | "PASSWORD_RESET";
  attempts: number;
}

// Example usage in your authentication flow
export class OTPService {
  private otpRecords: Map<string, OTPRecord> = new Map();

  async generateAndSendOTP(
    email: string,
    type: "VERIFICATION" | "PASSWORD_RESET"
  ): Promise<void> {
    const { code, hash } = generateSecureOTP();

    const record: OTPRecord = {
      email,
      codeHash: hash,
      createdAt: new Date(),
      type,
      attempts: 0,
    };

    // Store in database (example using in-memory map)
    this.otpRecords.set(email, record);

    if (type === "VERIFICATION") {
      await sendVerificationEmail(email, code);
    } else {
      await sendPasswordResetEmail(email, code);
    }
  }

  async verifyOTP(
    email: string,
    code: string,
    type: "VERIFICATION" | "PASSWORD_RESET"
  ): Promise<boolean> {
    const record = this.otpRecords.get(email);
    if (!record) return false;

    // Check expiration
    if (Date.now() - record.createdAt.getTime() > OTP_CONFIG.expiresIn) {
      this.otpRecords.delete(email);
      return false;
    }

    // Check attempts
    if (record.attempts >= OTP_CONFIG.attempts) {
      this.otpRecords.delete(email);
      return false;
    }

    record.attempts++;

    // Verify code
    if (record.type !== type || !verifyOTP(record.codeHash, code)) {
      return false;
    }

    this.otpRecords.delete(email);
    return true;
  }
}
