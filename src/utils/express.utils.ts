import mongoose from "mongoose";
import httpStatus from "http-status";
import { Request, Response, NextFunction } from "express";
import logger from "../logger/logger";
import { config } from "../config/dotenv.config";
import { AuthenticatedOrganizationRequest } from "../services/organization/auth.service";

const { NODE_ENV } = config;

class ApiError extends Error {
  statusCode: number;
  errorDescription: Record<string, string>;
  custom_errors: string;
  errorType: string;
  isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    errorDescription: Record<string, string> = {},
    errorType: string = "",
    isOperational: boolean = true,
    stack: string = ""
  ) {
    super(message);
    this.message = message;
    this.errorDescription = errorDescription;
    this.custom_errors = message;
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

const pick = <T extends Record<string, any>>(
  object: T,
  keys: (keyof T)[]
): Partial<T> => {
  return keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {} as Partial<T>);
};

const catchAsync =
  (
    fn: (
      req: Request | AuthenticatedOrganizationRequest,
      res: Response,
      next: NextFunction
    ) => Promise<any>
  ) =>
  (
    req: Request | AuthenticatedOrganizationRequest,
    res: Response,
    next: NextFunction
  ) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };

interface ResponseObject {
  req: Request | AuthenticatedOrganizationRequest;
  message?: string;
  payload?: Record<string, any>;
  code: number;
  type?: string;
}

const createResponseObject = ({
  req,
  message = "",
  payload = {},
  code,
  type,
}: ResponseObject) => {
  return { code, message, type, payload };
};

const errorConverter = (
  err: any,
  req: Request | AuthenticatedOrganizationRequest,
  res: Response,
  next: NextFunction
) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || error instanceof mongoose.Error
        ? httpStatus.BAD_REQUEST
        : httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(
      statusCode,
      message,
      error,
      error?.errorType || "",
      false,
      err.stack
    );
  }
  next(error);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (
  err: ApiError,
  req: Request | AuthenticatedOrganizationRequest,
  res: Response,
  next: NextFunction
) => {
  let { statusCode, message, errorDescription = "", errorType = "" } = err;
  if (NODE_ENV === "production" && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR] as string;
  }

  res.locals.errorMessage = err.message;

  if (NODE_ENV === "development") {
    logger.error(err);
  }

  logger.error(
    `${req.originalUrl} - Error caught by error-handler (router.ts): ${err.message}\n${err.stack}`
  );

  const data4responseObject: ResponseObject = {
    req,
    code: statusCode,
    message,
    type: errorType,
    payload: { error: errorDescription },
  };

  res.status(statusCode).send(createResponseObject(data4responseObject));
};

export {
  ApiError,
  pick,
  catchAsync,
  createResponseObject,
  errorConverter,
  errorHandler,
};
