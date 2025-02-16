import fs from "fs";
import http, { Server as HttpServer } from "http";
import https, { Server as HttpsServer } from "https";
import path from "path";
import app from "./express.server";
import logger from "../logger/logger";
import { paths } from "../config/paths.config";
import { config } from "../config/dotenv.config";

interface ServerConfig {
  server: HttpServer | HttpsServer;
  protocol: "http" | "https";
}

const { PROJECT_ROOT_PATH } = paths;
const { NODE_ENV, KEY_PATH, CERT_PATH } = config;
export const createHttpServer = (): ServerConfig => {
  try {
    const isProduction: boolean = NODE_ENV !== "development";
    const options: { key?: Buffer; cert?: Buffer } = {};
    let protocol: "http" | "https" = "http";
    let server: HttpServer | HttpsServer;

    if (isProduction) {
      const keyPath = path.join(PROJECT_ROOT_PATH, KEY_PATH);
      const certPath = path.join(PROJECT_ROOT_PATH, CERT_PATH);

      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        options.key = fs.readFileSync(keyPath);
        options.cert = fs.readFileSync(certPath);
        logger.info("✅ SSL certificates loaded successfully.");
        protocol = "https";
      } else {
        logger.warn("⚠️ SSL certificates not found. Falling back to HTTP.");
      }
    }

    // Create HTTPS server if certificates are available, otherwise HTTP
    server =
      options.key && options.cert
        ? https.createServer(options, app)
        : http.createServer(app);

    return { server, protocol };
  } catch (error) {
    logger.error("❌ Error creating server:", error);
    throw error;
  }
};
