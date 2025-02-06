import { body, query, ValidationChain } from "express-validator";

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

export const paginationValidation = (): ValidationChain[] => [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
  query("search")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 0, max: 100 })
    .withMessage("Search term must not exceed 100 characters"),
];
