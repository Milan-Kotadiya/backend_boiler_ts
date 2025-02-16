import express, { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "../config/dotenv.config";
import { paths } from "../config/paths.config";
import rateLimit from "express-rate-limit";
import routes from "../routes";
import logger from "../logger/logger";
import {
  createResponseObject,
  errorConverter,
  errorHandler,
} from "../utils/express.utils";

const { CORS_ORIGIN, RESTRICTION_MINUTES, MAX_VISIT_LIMIT, TRACK_SITE_VISIT } =
  config;
const { UPLOAD_PATH, PUBLIC_PATH } = paths;

const app = express();

const limiter = rateLimit({
  windowMs: Number(RESTRICTION_MINUTES) * 60 * 1000, // 15 minutes
  max: Number(MAX_VISIT_LIMIT), // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
});

if (TRACK_SITE_VISIT === true) {
  app.use(limiter);
}

const corsOpts: cors.CorsOptions = {
  origin: CORS_ORIGIN,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  credentials: true,
};

app.use(cors(corsOpts));
app.use(cookieParser());
app.use(express.json());

// Middleware to log incoming requests
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.url.toUpperCase()}`);
  next();
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).send("Something went wrong!");
});

app.use("/api/uploads", express.static(UPLOAD_PATH));
app.use("/api/public", express.static(PUBLIC_PATH));

// Set up routes
app.use("/api/v1/", routes);

// app.all("*", (req: Request, res: Response) => {
//   res.status(httpStatus.BAD_REQUEST).json(
//     createResponseObject({
//       code: httpStatus.BAD_REQUEST,
//       req: req,
//       message: "Sorry! The request could not be processed!",
//       payload: {},
//     })
//   );
// });

// Convert error to ApiError if needed
app.use(errorConverter);

// Handle error
app.use(errorHandler);

export default app;
