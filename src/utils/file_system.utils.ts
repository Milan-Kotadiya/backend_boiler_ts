import fs from "fs";
import path from "path";
import mime from "mime-types";
import { v4 as uuidv4 } from "uuid";
import logger from "../logger/logger";
import {
  s3BucketConnection,
  s3Client,
} from "../connections/s3bucket.connection";
import { config } from "../config/dotenv.config";
import { paths } from "../config/paths.config";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const { S3_BUCKET_NAME, AWS_REGION } = config;
const { PUBLIC_PATH } = paths;

interface UploadedFile {
  originalname: string;
  size: number;
  buffer: Buffer;
}

interface S3UploadResponse {
  fileName: string;
  filePath: string;
  bucket: string;
  url: string;
}

interface LocalFileResponse {
  name: string;
  size: number;
  basePath: string;
  fullPath: string;
}

const createDirectory = (dirPath: string): void => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error: any) {
    logger.error(`Unable to create directory: ${error.message}`);
  }
};

const validateFile = (
  file: UploadedFile,
  maxFileSize: number,
  allowedFileTypes: string[]
): void => {
  const fileType = mime.lookup(file.originalname);
  if (!fileType || !allowedFileTypes.includes(fileType)) {
    throw new Error(`Invalid file type: ${fileType}`);
  }
  if (file.size > maxFileSize) {
    throw new Error(`File size exceeds the limit of ${maxFileSize} bytes`);
  }
};

const generateFileName = (originalName: string): string => {
  const ext = path.extname(originalName);
  return `${uuidv4()}${ext}`;
};

const uploadFileToS3 = async (
  dirPath: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<S3UploadResponse> => {
  try {
    const s3Key = `${dirPath}/${fileName}`;
    const mimeType = mime.lookup(fileName) || "application/octet-stream";

    const params = {
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
      // ACL: "public-read", // Change to 'public-read' if needed
    };

    const command = new PutObjectCommand(params);

    await s3Client.send(command);

    return {
      fileName: fileName,
      filePath: s3Key,
      bucket: S3_BUCKET_NAME,
      url: `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`, // S3 URL
    };
  } catch (error: any) {
    console.error("Error uploading file to S3:", error.message);
    throw error;
  }
};

const isS3Url = (filePath: string): boolean => {
  const s3Prefix = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/`;
  return filePath.startsWith(s3Prefix);
};

const extractS3Key = (fileUrl: string): string | null => {
  const s3Prefix = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/`;

  if (fileUrl.startsWith(s3Prefix)) {
    return fileUrl.replace(s3Prefix, ""); // Extract the S3 key
  }

  return null;
};

// Function to Delete File from S3
export const deleteFileFromS3 = async (fileUrl: string) => {
  try {
    const s3Key = extractS3Key(fileUrl);

    if (!s3Key) {
      console.log("Invalid S3 URL format.");
      return;
    }

    const deleteParams = {
      Bucket: S3_BUCKET_NAME,
      Key: s3Key, // Path inside the S3 bucket
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    console.log(`File deleted successfully: ${fileUrl}`);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
  }
};

const saveFile = async (
  dirPath: string,
  file: UploadedFile,
  maxFileSize?: number,
  allowedFileTypes?: string[]
): Promise<S3UploadResponse | LocalFileResponse> => {
  try {
    const isS3Ready = await s3BucketConnection();

    if (maxFileSize && allowedFileTypes) {
      validateFile(file, maxFileSize, allowedFileTypes);
    }

    const fileName = generateFileName(file.originalname);

    if (isS3Ready) {
      return await uploadFileToS3(dirPath, fileName, file.buffer);
    } else {
      // Save Locally
      const folderPath = path.resolve(PUBLIC_PATH, dirPath);
      const filePath = path.join(folderPath, fileName);

      createDirectory(folderPath);

      if (fs.existsSync(filePath)) {
        deleteFile(filePath);
      }

      fs.writeFileSync(filePath, file.buffer);

      return {
        name: path.basename(filePath),
        size: file.size,
        basePath: folderPath,
        fullPath: filePath,
      };
    }
  } catch (error: any) {
    logger.error(`Unable to save file: ${error.message}`);
    throw error;
  }
};

const deleteFile = async (filePath: string): Promise<void> => {
  try {
    if (isS3Url(filePath)) {
      await deleteFileFromS3(filePath);
    } else {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error: any) {
    logger.error(`Unable to delete file: ${error.message}`);
  }
};

export { saveFile, deleteFile };
