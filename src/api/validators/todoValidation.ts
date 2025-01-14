import { body } from "express-validator";

export const createTodoValidation = () => {
  return [
    body("title").isString().withMessage("Title must be a string"),
    body("content").isString().withMessage("Content must be a string"),
  ];
};

export const updateTodoValidation = () => {
  return [
    body("title").optional().isString().withMessage("Title must be a string"),
    body("content")
      .optional()
      .isString()
      .withMessage("Content must be a string"),
  ];
};
