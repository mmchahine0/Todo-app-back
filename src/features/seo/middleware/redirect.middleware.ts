import { Request, Response, NextFunction } from "express";

export const redirectMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.headers.host?.startsWith("www.")) {
    return res.redirect(301, `https://${req.headers.host.slice(4)}${req.url}`);
  }
  if (!req.secure && process.env.NODE_ENV === "production") {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
};
