import { body } from "express-validator";

export const validateProfileUpdate = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters long"),
  body("newPassword")
    .optional()
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),
  body("currentPassword")
    .if(body("newPassword").exists())
    .notEmpty()
    .withMessage("Current password is required to update password"),
];
