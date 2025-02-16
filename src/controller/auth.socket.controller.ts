import { Socket } from "socket.io";
import {
  SocketError,
  createSocketResponseObject,
  sendAckResponse,
} from "../utils/socket_io.utils";
import authService from "../services/auth.service";

// Define types for the acknowledgment function
type AckFunction = (response: any) => void;

// Register a new user
const register = async (
  socket: Socket,
  data: any,
  ack?: AckFunction
): Promise<void> => {
  try {
    const userDoc = await authService.register(data, socket);

    const response = createSocketResponseObject({
      message: "register_successfully",
      payload: { result: userDoc },
      code: 200,
      type: "registration",
    });

    sendAckResponse(true, response.message, response.payload, ack);
  } catch (error: any) {
    throw new SocketError(500, error.message, error);
  }
};

// Login user
const login = async (
  socket: Socket,
  data: any,
  ack?: AckFunction
): Promise<void> => {
  try {
    const userDoc = await authService.login(data, socket);

    const response = createSocketResponseObject({
      message: "login_successfully",
      payload: { result: userDoc },
      code: 200,
      type: "registration",
    });

    sendAckResponse(true, response.message, response.payload, ack);
  } catch (error: any) {
    throw new SocketError(500, error.message, error);
  }
};

// Refresh authentication token
const refreshToken = async (
  socket: Socket,
  data: any,
  ack?: AckFunction
): Promise<void> => {
  try {
    const tokenDocs = await authService.refreshTokensSocket(socket);

    const response = createSocketResponseObject({
      message: "token_refreshed_successfully",
      payload: { result: tokenDocs },
      code: 200,
      type: "registration",
    });

    sendAckResponse(true, response.message, response.payload, ack);
  } catch (error: any) {
    throw new SocketError(500, error.message, error);
  }
};

const authSocketController = {
  register,
  login,
  refreshToken,
};
export default authSocketController;
