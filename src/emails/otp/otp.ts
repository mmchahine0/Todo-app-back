import { PrismaClient } from "@prisma/client";
import { generateSecureOTP, verifyOTP } from "../../utils/emailService";
import { sendVerificationEmail } from "../verification/verfication";
import { sendPasswordResetEmail } from "../reset/reset";
const prisma = new PrismaClient();

// OTP configurations
const OTP_CONFIG = {
  length: 6,
  expiresIn: 15 * 60 * 1000, // 15 minutes
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
        where: { email },
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
            expiresAt,
          },
          create: {
            userId: user.id,
            code: hash,
            expiresAt,
          },
        });

        await sendVerificationEmail(email, code);
      } else {
        await prisma.passwordReset.upsert({
          where: { userId: user.id },
          update: {
            code: hash,
            expiresAt,
          },
          create: {
            userId: user.id,
            code: hash,
            expiresAt,
          },
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
          passwordReset: true,
        },
      });

      if (!user) return false;

      const record =
        type === "VERIFICATION" ? user.verificationCode : user.passwordReset;

      if (!record) return false;

      // Check expiration
      if (new Date() > record.expiresAt) {
        // Clean up expired code
        if (type === "VERIFICATION") {
          await prisma.verificationCode.delete({
            where: { userId: user.id },
          });
        } else {
          await prisma.passwordReset.delete({
            where: { userId: user.id },
          });
        }
        return false;
      }

      // Verify code
      const isValid = verifyOTP(record.code, code);

      // Delete the code after verification (whether successful or not)
      if (type === "VERIFICATION") {
        await prisma.verificationCode.delete({
          where: { userId: user.id },
        });
      } else {
        await prisma.passwordReset.delete({
          where: { userId: user.id },
        });
      }

      return isValid;
    } catch (error) {
      console.error("OTP Verification Error:", error);
      return false;
    }
  }
}
