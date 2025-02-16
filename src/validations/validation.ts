import { Request, Response, NextFunction } from "express";
import { Schema } from "joi";
import httpStatus from "http-status";
import { ApiError } from "../utils/express.utils";
import { SocketError } from "../utils/socket_io.utils";

// Type-safe express middleware for validating request data
export const expressValidateSchema =
  (schema: Schema, key: "body" | "query" | "params") =>
  (req: Request, res: Response, next: NextFunction) => {
    const data = req[key];

    const { error } = schema.validate(data, {
      abortEarly: false,
    });

    if (error) {
      const errorData: Record<string, string> = {};
      error.details.forEach((item) => {
        if (item.context?.key) {
          errorData[item.context.key] = item.message;
        }
      });

      return next(
        new ApiError(
          httpStatus.BAD_REQUEST,
          "validation_error",
          errorData,
          "VALIDATION"
        )
      );
    }

    return next();
  };

// Type-safe function for validating Socket.IO data
export const socketValidateSchema = (schema: Schema, data: any) => {
  const { error } = schema.validate(data, {
    abortEarly: false,
  });

  if (error) {
    const errorData: Record<string, string> = {};
    error.details.forEach((item) => {
      if (item.context?.key) {
        errorData[item.context.key] = item.message;
      }
    });

    throw new SocketError(
      httpStatus.BAD_REQUEST,
      "validation_error",
      errorData,
      "VALIDATION"
    );
  }
};
