import { Request, Response, NextFunction } from "express";

export const cacheMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.url.match(/\.(css|js|jpg|jpeg|png|gif|ico|woff2|woff)$/)) {
    res.setHeader("Cache-Control", "public, max-age=31536000");
  } else {
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
  next();
};
