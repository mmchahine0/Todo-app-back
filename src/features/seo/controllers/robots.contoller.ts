import { Request, Response } from "express";

export const getRobotsTxt = (req: Request, res: Response) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Sitemap: ${process.env.CORS_ORIGIN}/sitemap.xml`); //website url
};
