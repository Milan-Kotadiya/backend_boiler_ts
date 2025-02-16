import logger from "../logger/logger";

class SocketError extends Error {
  status: number;
  errorDescription: Record<string, string>;
  custom_errors: string;
  errorType: string;
  isOperational: boolean;

  constructor(
    status: number,
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
    this.status = status;
    this.errorType = errorType;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Type definition for socket event handler function
type SocketHandler<T = any> = (
  data: T,
  ack: (response: any) => void
) => Promise<void>;

// Async wrapper to handle async socket events with error handling
const catchSocketAsync =
  <T = any>(fn: SocketHandler<T>): SocketHandler<T> =>
  async (data, ack) => {
    try {
      await fn(data, ack);
    } catch (err: any) {
      logger.error(`Socket error: ${JSON.stringify(err)}`);
      ack(err);
    }
  };

// Interface for socket response
interface SocketResponse {
  message: string;
  payload: Record<string, any>;
  code: number;
  type: string;
}

// Create a custom socket acknowledgment response object
const createSocketResponseObject = ({
  message,
  payload,
  code,
  type,
}: SocketResponse): SocketResponse => {
  return { code, message, type, payload };
};

// Create socket acknowledgment response (success or failure)
const sendAckResponse = (
  success: boolean,
  message: string,
  payload: Record<string, any> = {},
  ack?: (response: any) => void
): void => {
  logger.info(
    `ACK: ${JSON.stringify({
      success: success,
      message: message,
    })}`
  );

  if (ack)
    ack({
      success: success,
      message: message,
      payload: payload,
    });
};

export {
  SocketError,
  catchSocketAsync,
  createSocketResponseObject,
  sendAckResponse,
};
