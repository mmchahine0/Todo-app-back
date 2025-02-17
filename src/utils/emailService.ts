import nodemailer from "nodemailer";
import { google } from "googleapis";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

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
};


const createTransporter = async (): Promise<nodemailer.Transporter> => {
  try {
    const oauth2Client = new OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    // Add scopes explicitly
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      scope: [
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/gmail.send'
      ].join(' ')
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',  
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_EMAIL,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: process.env.GMAIL_ACCESS_TOKEN,
      },
    });

    // Verify configuration
    await transporter.verify();
    return transporter;
  } catch (err) {
    console.error('Detailed transporter error:', err);
    throw err;
  }
};


const sendEmailWithRetry = async (
  mailOptions: nodemailer.SendMailOptions,
): Promise<void> => {
  let lastError: Error | null = null;
    try {
      const transporter = await createTransporter();
      await transporter.sendMail(mailOptions);
      return;
    } catch (error: any) {
      console.error(`${error.message}`);      
    }
};

export const generateSecureOTP = (): { code: string; hash: string } => {
  const code = crypto.randomInt(100000, 999999).toString();
  const hash = bcrypt.hashSync(code, 10);
  return { code, hash };
};

export const verifyOTP = (storedHash: string, receivedCode: string): boolean => {
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

// Database model interface
export interface OTPRecord {
  email: string;
  codeHash: string;
  createdAt: Date;
  type: "VERIFICATION" | "PASSWORD_RESET";
}

export class OTPService {
  async generateAndSendOTP(
    email: string,
    type: "VERIFICATION" | "PASSWORD_RESET"
  ): Promise<void> {
    try {
      const { code, hash } = generateSecureOTP();
      const expiresAt = new Date(Date.now() + OTP_CONFIG.expiresIn);

      // Find user first
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Update or create OTP record in database
      if (type === "VERIFICATION") {
        await prisma.verificationCode.upsert({
          where: { userId: user.id },
          update: {
            code: hash,
            expiresAt
          },
          create: {
            userId: user.id,
            code: hash,
            expiresAt
          }
        });

        await sendVerificationEmail(email, code);
      } else {
        await prisma.passwordReset.upsert({
          where: { userId: user.id },
          update: {
            code: hash,
            expiresAt
          },
          create: {
            userId: user.id,
            code: hash,
            expiresAt
          }
        });

        await sendPasswordResetEmail(email, code);
      }
    } catch (error) {
      console.error("OTP Generation Error:", error);
      throw error;
    }
  }

  async verifyOTP(
    email: string,
    code: string,
    type: "VERIFICATION" | "PASSWORD_RESET"
  ): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          verificationCode: true,
          passwordReset: true
        }
      });

      if (!user) return false;

      const record = type === "VERIFICATION" 
        ? user.verificationCode 
        : user.passwordReset;

      if (!record) return false;

      // Check expiration
      if (new Date() > record.expiresAt) {
        // Clean up expired code
        if (type === "VERIFICATION") {
          await prisma.verificationCode.delete({
            where: { userId: user.id }
          });
        } else {
          await prisma.passwordReset.delete({
            where: { userId: user.id }
          });
        }
        return false;
      }

      // Verify code
      const isValid = verifyOTP(record.code, code);

      // Delete the code after verification (whether successful or not)
      if (type === "VERIFICATION") {
        await prisma.verificationCode.delete({
          where: { userId: user.id }
        });
      } else {
        await prisma.passwordReset.delete({
          where: { userId: user.id }
        });
      }

      return isValid;
    } catch (error) {
      console.error("OTP Verification Error:", error);
      return false;
    }
  }
}
