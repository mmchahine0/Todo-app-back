import nodemailer from "nodemailer";
import { google } from "googleapis";
import crypto from "crypto";
import bcrypt from "bcryptjs";


const OAuth2 = google.auth.OAuth2;

const createTransporter = async (): Promise<nodemailer.Transporter> => {
  try {
    const oauth2Client = new OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      scope: [
        "https://mail.google.com/",
        "https://www.googleapis.com/auth/gmail.send",
      ].join(" "),
    });

    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_EMAIL,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken,
      },
    } as nodemailer.TransportOptions);

    await transporter.verify();
    return transporter;
  } catch (err) {
    console.error("Error creating transporter:", err);
    throw err;
  }
};

export const sendEmailWithRetry = async (
  mailOptions: nodemailer.SendMailOptions
): Promise<void> => {
  try {
    const transporter = await createTransporter();
    await transporter.sendMail(mailOptions);
    return;
  } catch (error: any) {
    // If it's the last attempt, throw the error
    console.error(`Failed to send email`, error);
    throw error;
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