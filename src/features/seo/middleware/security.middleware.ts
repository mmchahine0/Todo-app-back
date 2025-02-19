import helmet from "helmet";
import { Express } from "express";

export const setupSecurity = (app: Express) => {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
};
