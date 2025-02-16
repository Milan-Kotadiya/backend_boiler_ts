import { createClient, RedisClientType } from "redis";
import logger from "../logger/logger";
import { config } from "../config/dotenv.config";

const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = config;
let redisClient: RedisClientType | null = null;

// ✅ Function to Connect Redis
export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      socket: {
        host: REDIS_HOST, // Hostname
        port: Number(REDIS_PORT), // Port
        reconnectStrategy: (retries) => Math.min(retries * 50, 500), // Custom reconnect strategy
      },
      password: REDIS_PASSWORD || undefined, // Use password if provided
    });

    redisClient.on("connect", () => {
      logger.info("✅ Connected to Redis");
    });

    redisClient.on("error", (err) => {
      logger.error(`❌ Redis error: ${(err as Error).message}`);
    });

    await redisClient.connect();
  } catch (err) {
    logger.error(`❌ Error connecting to Redis: ${(err as Error).message}`);
  }
};

// ✅ Function to Set (Create/Update) Key in Redis
export const RedisSet = async (
  key: string,
  value: unknown,
  expiration?: number
): Promise<void> => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      logger.error("❌ Redis client is not connected.");
      return;
    }

    const jsonValue = JSON.stringify(value);

    if (expiration) {
      await redisClient.set(key, jsonValue, { EX: expiration });
    } else {
      await redisClient.set(key, jsonValue);
    }
  } catch (err) {
    logger.error(`❌ Error setting key "${key}": ${(err as Error).message}`);
  }
};

// ✅ Function to Get (Read) Key from Redis
export const RedisGet = async <T>(key: string): Promise<T | null> => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      logger.error("❌ Redis client is not connected.");
      return null;
    }

    const value = await redisClient.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (err) {
    logger.error(`❌ Error getting key "${key}": ${(err as Error).message}`);
    return null;
  }
};

// ✅ Function to Delete (Remove) Key from Redis
export const RedisDelete = async (key: string): Promise<void> => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      logger.error("❌ Redis client is not connected.");
      return;
    }

    await redisClient.del(key);
  } catch (err) {
    logger.error(`❌ Error deleting key "${key}": ${(err as Error).message}`);
  }
};

// ✅ Exporting Redis Client (Optional)
export { redisClient };
