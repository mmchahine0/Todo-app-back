import compression from "compression";
import { Express } from "express";

export const setupCompression = (app: Express) => {
  app.use(compression());
};
