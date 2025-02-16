import { Server, Namespace, Socket } from "socket.io";
import logger from "../logger/logger";
import { catchSocketAsync } from "../utils/socket_io.utils";
import { socketValidateSchema } from "../validations/validation";
import {
  userLoginSchema,
  userRegisterSchema,
} from "../validations/user.validation";
import authSocketController from "../controller/auth.socket.controller";

/**
 * (response: any) => void to initialize authentication namespace for socket.io
 */
export default function authNamespace(io: Server): Namespace {
  const authNameSpace: Namespace = io.of("/auth");

  authNameSpace.on("connection", (socket: Socket) => {
    socket.onAny(async (eventName: string) => {
      logger.info(`EVENT: [AUTH/${eventName.toUpperCase()}]`);
    });

    socket.on(
      "register",
      catchSocketAsync(async (data: unknown, ack?: (response: any) => void) => {
        // ✅ Validation
        socketValidateSchema(userRegisterSchema, data);
        // ✅ Proceed with registration logic
        await authSocketController.register(socket, data, ack);
      })
    );

    socket.on(
      "login",
      catchSocketAsync(async (data: unknown, ack?: (response: any) => void) => {
        // ✅ Validation
        socketValidateSchema(userLoginSchema, data);
        // ✅ Proceed with login logic
        await authSocketController.login(socket, data, ack);
      })
    );

    socket.on(
      "refresh_token",
      catchSocketAsync(async (data: unknown, ack?: (response: any) => void) => {
        // ✅ Proceed with refresh token logic
        await authSocketController.refreshToken(socket, data, ack);
      })
    );
  });

  return authNameSpace;
}
