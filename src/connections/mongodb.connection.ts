import mongoose, { Connection } from "mongoose";
import logger from "../logger/logger";
import { config } from "../config/dotenv.config";
import User from "../models/user.model";

const { DB_HOST, DB_PORT, DB_NAME } = config;

// ✅ Define Type for Tenant Connection Map
export const tenantConnectionMap: Map<string, Connection> = new Map();

// ✅ Function to Get Tenant Connection
export const getTenantConnection = async (
  tenantId: string
): Promise<Connection> => {
  if (tenantConnectionMap.has(tenantId)) {
    return tenantConnectionMap.get(tenantId) as Connection;
  }

  const database = await mongoose.createConnection(
    `mongodb://${DB_HOST}:${DB_PORT}/${tenantId}`
  );

  tenantConnectionMap.set(tenantId, database);
  return database;
};

// ✅ Function to Initialize Tenant Connections
export const initializeTenants = async (): Promise<void> => {
  try {
    const tenants = await User.find({}, "_id").exec(); // ✅ Ensuring `.exec()` for better typing

    for (const tenant of tenants) {
      await getTenantConnection(tenant._id.toString());
    }

    logger.info("🎯 Multi-Tenant Connections setup complete!");
  } catch (error) {
    logger.error(
      `⚠️ Failed to initialize tenants: ${(error as Error).message}`
    );
  }
};

// ✅ Function to Connect MongoDB
export const connectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(`mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`);

    logger.info("✅ Connected to MongoDB");
    await initializeTenants();
  } catch (error) {
    logger.error(`❌ MongoDB connection error: ${(error as Error).message}`);
    process.exit(1);
  }
};
