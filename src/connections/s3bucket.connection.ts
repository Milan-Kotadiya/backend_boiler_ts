import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

import logger from "../logger/logger";
import { config } from "../config/dotenv.config";

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = config;

// ✅ Create S3 Client
export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID as string,
    secretAccessKey: AWS_SECRET_ACCESS_KEY as string,
  },
});

// ✅ Function to Verify S3 Bucket Connection
export const s3BucketConnection = async (): Promise<boolean> => {
  try {
    const command = new ListBucketsCommand({});
    const result = await s3Client.send(command);

    if (result.Buckets) {
      logger.info(
        `✅ S3 Connection Successful: Found ${result.Buckets.length} Buckets.`
      );
      return true;
    } else {
      logger.error("❌ S3 Connection Failed: No Buckets Found.");
      return false;
    }
  } catch (error) {
    logger.error(`❌ Error connecting to S3: ${(error as Error).message}`);
    return false;
  }
};
