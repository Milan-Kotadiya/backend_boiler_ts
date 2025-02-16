import { Server } from "http";
import { connectMongoDB } from "./connections/mongodb.connection";
import { createHttpServer } from "./connections/http.server";
import { createGraphQlServer } from "./connections/graphql.server";
import { connectRedis, redisClient } from "./connections/redis.connection";
import { connectMailServer } from "./connections/mail.server";
import { s3BucketConnection } from "./connections/s3bucket.connection";
import { createSocketServer } from "./connections/socket.server";
import { Application } from "express";
import logger from "./logger/logger";
import EmitterListener from "./services/emitter.service";
import initAgenda from "./services/agenda.service";
import app from "./connections/express.server";
import { RedisClientType } from "redis"; // Redis client type
import { config } from "./config/dotenv.config";

async function gracefulShutdown(
  server: Server,
  redisClient: RedisClientType | null
): Promise<void> {
  try {
    logger.info("🛑 Shutting down gracefully...");

    if (redisClient) {
      logger.info("Closing Redis connection...");
      await redisClient.quit(); // `quit` is the proper method to close Redis
    }

    logger.info("Closing HTTP server...");
    server.close(() => {
      logger.info("✅ HTTP server closed.");
      process.exit(0);
    });
  } catch (err) {
    logger.error(`Error during shutdown: ${(err as Error).message}`);
    process.exit(1);
  }
}

async function init(): Promise<void> {
  try {
    await connectRedis();
    await connectMongoDB();
    await connectMailServer();

    const httpServer: Server = await createHttpServer().server;
    createSocketServer(httpServer);

    await createGraphQlServer(httpServer, app);
    await s3BucketConnection();
    await initAgenda();
    EmitterListener();

    httpServer.listen(config.PORT, () => {
      logger.info(`🚀 Server is running on ${config.BASE_URL}`);
    });

    // Attach shutdown handlers
    process.on("SIGINT", () => gracefulShutdown(httpServer, redisClient));
    process.on("SIGTERM", () => gracefulShutdown(httpServer, redisClient));

    // Handle unhandled errors
    process.on("unhandledRejection", (reason) => {
      logger.error(`Unhandled Rejection: ${reason}`);
      process.exit(1);
    });

    process.on("uncaughtException", (err) => {
      logger.error(`Uncaught Exception: ${err.message}`);
      logger.error(err.stack || "");
      process.exit(1);
    });
  } catch (error) {
    logger.error(`Error initializing server: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Start the server
init();
