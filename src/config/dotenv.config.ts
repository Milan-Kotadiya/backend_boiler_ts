import dotenv from "dotenv";

dotenv.config();

export const config = {
  // SERVER
  NODE_ENV: process.env.NODE_ENV || "development",
  CERT_PATH: process.env.CERT_PATH || "",
  KEY_PATH: process.env.KEY_PATH || "",
  CORS_ORIGIN: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : [],
  PORT: Number(process.env.PORT) || 3000,
  HOST: process.env.HOST || "localhost",
  BASE_URL: `${process.env.NODE_ENV === "development" ? "http" : "https"}://${
    process.env.HOST || "localhost"
  }:${process.env.PORT || 3000}`,

  // COOKIE
  TRACK_SITE_VISIT: process.env.TRACK_SITE_VISIT === "true",
  MAX_VISIT_LIMIT: Number(process.env.MAX_VISIT_LIMIT) || 100,
  RESTRICTION_MINUTES: Number(process.env.RESTRICTION_MINUTES) || 10,
  COOKIE_STORAGE: process.env.COOKIE_STORAGE || "",

  // MONGO DB
  DB_HOST: process.env.DB_HOST || "",
  DB_PORT: process.env.DB_PORT ? Number(process.env.DB_PORT) : 27017,
  DB_NAME: process.env.DB_NAME || "",

  // AWS S3
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_REGION: process.env.AWS_REGION || "",
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || "",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "jwt_secret",
  REFRESH_TOKEN_EXPIRY:
    Number(process.env.REFRESH_TOKEN_EXPIRY) || 7 * 24 * 60 * 1000,
  ACCESS_TOKEN_EXPIRY: Number(process.env.ACCESS_TOKEN_EXPIRY) || 1 * 60 * 1000,

  // AUTH_0
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || "",
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID || "",
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET || "",
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || "",
  AUTH0_CLIENT_REDIRECT_URL: process.env.AUTH0_CLIENT_REDIRECT_URL || "",
  AUTH0_SCOPE: process.env.AUTH0_SCOPE || "",

  // REDIS
  REDIS_HOST: process.env.REDIS_HOST || "",
  REDIS_PORT: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",

  // NODE_MAILER
  MAILER_HOST: process.env.MAILER_HOST || "",
  MAILER_PORT: process.env.MAILER_PORT ? Number(process.env.MAILER_PORT) : 587,
  MAILER_USERNAME: process.env.MAILER_USERNAME || "",
  MAILER_PASSWORD: process.env.MAILER_PASSWORD || "",
  MAILER_SECURE: process.env.MAILER_SECURE == "true",
  MAILER_FROM: process.env.MAILER_FROM || "",

  // API KEYS
  // RAZORPAY
  RAZOR_PAY_KEY: process.env.RAZOR_PAY_KEY || "",
  RAZOR_PAY_SECRET: process.env.RAZOR_PAY_SECRET || "",
};
