import { body } from "express-validator";

export const signupValidation = () => {
  return [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail()
      .custom(async (email) => {
        const blockedDomains = ["tempmail.com", "throwaway.com"];
        const domain = email.split("@")[1];
        if (blockedDomains.includes(domain)) {
          throw new Error("Email domain not allowed");
        }
        return true;
      }),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .isLength({ max: 30 })
      .withMessage("Password must not be more than 30 characters")
      .matches(/[a-z]/)
      .withMessage("Password must contain at least one lowercase letter")
      .matches(/[A-Z]/)
      .withMessage("Password must contain at least one uppercase letter")
      .matches(/\d/)
      .withMessage("Password must contain at least one number")
      .matches(/[\W_]/)
      .withMessage("Password must contain at least one special character")
      .custom((value) => {
        const commonPasswords = [
          "Password123!",
          "Admin123!",
          "P@ssw0rd2024",
          "P@ssw0rd2025",
        ];
        if (commonPasswords.includes(value)) {
          throw new Error("Password is too common");
        }
        return true;
      }),
    body("name")
      .notEmpty()
      .withMessage("name is required")
      .isLength({ min: 2 })
      .withMessage("name must be at least 8 characters")
      .isLength({ max: 30 })
      .withMessage("name must not be more than 30 characters")
      .matches(/[a-z]/),
  ];
};

export const signinValidation = () => {
  return [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ];
};

export const verifyEmailValidation = () => {
  return [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("code")
      .notEmpty()
      .withMessage("Verification code is required")
      .isLength({ min: 6, max: 6 })
      .withMessage("Verification code must be 6 digits")
      .isNumeric()
      .withMessage("Verification code must contain only numbers"),
  ];
};

export const requestPasswordResetValidation = () => {
  return [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
  ];
};

export const resetPasswordValidation = () => {
  return [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("code")
      .notEmpty()
      .withMessage("Reset code is required")
      .isLength({ min: 6, max: 6 })
      .withMessage("Reset code must be 6 digits")
      .isNumeric()
      .withMessage("Reset code must contain only numbers"),
    body("newPassword")
      .notEmpty()
      .withMessage("New password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .isLength({ max: 30 })
      .withMessage("Password must not be more than 30 characters")
      .matches(/[a-z]/)
      .withMessage("Password must contain at least one lowercase letter")
      .matches(/[A-Z]/)
      .withMessage("Password must contain at least one uppercase letter")
      .matches(/\d/)
      .withMessage("Password must contain at least one number")
      .matches(/[\W_]/)
      .withMessage("Password must contain at least one special character")
      .custom((value) => {
        const commonPasswords = [
          "Password123!",
          "Admin123!",
          "P@ssw0rd2024",
          "P@ssw0rd2025",
        ];
        if (commonPasswords.includes(value)) {
          throw new Error("Password is too common");
        }
        return true;
      }),
  ];
};

export const resendCodeValidation = () => {
  return [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
  ];
};
