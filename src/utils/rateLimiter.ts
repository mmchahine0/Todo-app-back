import rateLimit from "express-rate-limit";

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    statusCode: 429,
    message: "Too many requests from this IP, please try again later",
    data: null,
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// More strict limiter for auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per windowMs
  message: {
    statusCode: 429,
    message: "Too many authentication attempts, please try again later",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for refresh token endpoint
export const refreshTokenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Limit each IP to 15 refresh requests per hour
  message: {
    statusCode: 429,
    message: "Too many refresh token requests, please try again later",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const emailVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 verification attempts per windowMs
  message: {
    statusCode: 429,
    message: "Too many verification attempts, please try again later",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 reset requests per hour
  message: {
    statusCode: 429,
    message: "Too many password reset requests, please try again later",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 verification attempts per windowMs
  message: {
    statusCode: 429,
    message:
      "Too many password reset verification attempts, please try again later",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
