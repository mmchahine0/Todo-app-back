import { Express } from "express";
import { setupCompression } from "./middleware/compression.middleware";
import { setupSecurity } from "./middleware/security.middleware";
import { cacheMiddleware } from "./middleware/cache.middleware";
import { redirectMiddleware } from "./middleware/redirect.middleware";
import seoRoutes from "../seo/seo.route";

export const setupSEO = (app: Express) => {
  setupCompression(app);
  setupSecurity(app);
  app.use(cacheMiddleware);
  app.use(redirectMiddleware);
  app.use(seoRoutes);
};
