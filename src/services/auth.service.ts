import dotenv from "dotenv";
import mongoose, { Document } from "mongoose";
import { authTypes, EventCases } from "../constants/event.handler";
import User, { IUser } from "../models/user.model";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import { config } from "../config/dotenv.config";
import Emitter from "../connections/event-emitter.connection";
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { AuthenticatedOrganizationRequest } from "./organization/auth.service";

const { JWT_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } = config;

dotenv.config();

// Interface for JWT Payload
interface CustomJwtPayload extends JwtPayload {
  userId: string;
  aud: string;
  [key: string]: any;
}

// Generate JWT Token
const generateToken = async ({
  userId,
  expiresIn,
  secret = JWT_SECRET,
  aud,
  others = {},
}: {
  userId: string;
  expiresIn: number;
  secret?: string;
  aud: string | undefined;
  others?: Record<string, unknown>;
}) => {
  const payload = {
    userId,
    aud,
    ...others,
  };

  return jwt.sign(payload, secret as string, { expiresIn });
};

// Register a new user
const register = async (
  data: {
    name: string;
    email: string;
    password: string;
  },
  socket?: Socket
): Promise<IUser> => {
  const { name, email, password } = data;

  const isExisted = await User.findOne({ email });

  if (isExisted) throw new Error("User Already Registered");

  const newUser = new User({ name, email, password });
  return await newUser.save();
};

// Login user and generate tokens
const login = async (
  data: { email: string; password: string },
  socket?: Socket
): Promise<{
  user: IUser;
  access_token: string;
  refresh_token: string;
}> => {
  const { email, password } = data;

  const userDoc = (await User.findOne({ email })) as IUser | null;

  if (!userDoc) throw new Error("User Not Found");
  if (userDoc.password !== password) throw new Error("Incorrect Password");

  const access_token = await generateToken({
    userId: userDoc._id.toString(),
    expiresIn: ACCESS_TOKEN_EXPIRY,
    aud: authTypes.USER,
  });

  const refresh_token = await generateToken({
    userId: userDoc._id.toString(),
    expiresIn: REFRESH_TOKEN_EXPIRY,
    aud: authTypes.USER,
  });

  if (socket) {
    socket.handshake.auth = {
      ...socket.handshake.auth,
      access_token,
      refresh_token,
    };

    await User.findByIdAndUpdate(userDoc._id, {
      socketId: socket.id,
      isOnline: true,
    });
  }

  Emitter.emit(EventCases.SEND_WELCOME_MAIL, { user: userDoc });

  return {
    user: userDoc,
    access_token,
    refresh_token,
  };
};

// Logout user
const logout = async (socketId: string): Promise<void> => {
  await User.findOneAndUpdate(
    { socketId },
    { isOnline: false, lastSeen: new Date() }
  );
};

// Verify and decode token
const verifyAndDecodeToken = (
  token: string,
  secret: string
): { code: number; data?: CustomJwtPayload; error_message?: string } => {
  try {
    const decoded = jwt.verify(token, secret) as CustomJwtPayload;
    return { code: 200, data: decoded };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError)
      return { code: 401, error_message: "Token has expired" };
    if (err instanceof jwt.JsonWebTokenError)
      return { code: 401, error_message: "Token is invalid" };
    return { code: 401, error_message: "Token verification failed" };
  }
};

// Socket Authentication Middleware
const socketAuth = async (socket: Socket, next: (err?: any) => void) => {
  const access_token =
    socket.handshake.auth?.access_token ||
    socket.handshake.headers?.access_token;

  if (!access_token) {
    socket.emit("error", { message: "Access token is required" });
    return next(new Error("Access token is required"));
  }

  const { data, error_message } = verifyAndDecodeToken(
    access_token,
    JWT_SECRET
  );

  if (!data) {
    socket.emit("error", { message: error_message });
    return next(new Error(error_message));
  }

  const { userId, aud } = data;

  const userDoc = (await User.findById(userId).exec()) as IUser | null;

  if (!userDoc) {
    socket.emit("error", { message: "User not found" });
    return next(new Error("User not found"));
  }

  socket.handshake.auth.user = userDoc;
  next();
};

// Express Authentication Middleware
const expressAuth = () => async (req: any, res: any, next: any) => {
  const access_token =
    req.headers.authorization?.split(" ")[1] || req.cookies.access_token;
  const { data, error_message, code } = verifyAndDecodeToken(
    access_token,
    JWT_SECRET
  );

  if (error_message) {
    return res.status(code).json({ error: new Error(error_message) });
  }

  req.user = await User.findById(data?.userId).exec();
  next();
};

// Refresh Tokens
const refreshTokens = async (refresh_token_old: string) => {
  const { data, error_message } = verifyAndDecodeToken(
    refresh_token_old,
    JWT_SECRET
  );

  if (error_message) throw new Error(error_message);

  const userDoc = (await User.findById(data?.userId).exec()) as IUser | null;
  if (!userDoc) throw new Error("User not found");

  const access_token = await generateToken({
    userId: userDoc._id.toString(),
    expiresIn: ACCESS_TOKEN_EXPIRY,
    aud: data?.aud,
  });

  const refresh_token = await generateToken({
    userId: userDoc._id.toString(),
    expiresIn: REFRESH_TOKEN_EXPIRY,
    aud: data?.aud,
  });

  return { access_token, refresh_token };
};

// Refresh Tokens for Socket
const refreshTokensSocket = async (socket: Socket) => {
  const refresh_token_old =
    socket.handshake.auth?.refresh_token ||
    socket.handshake.headers?.refresh_token;
  return await refreshTokens(refresh_token_old);
};

// Refresh Token for API
const refreshTokenAPI = async (refresh_token_old: string) => {
  return await refreshTokens(refresh_token_old);
};

export const organizationAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const access_token =
      req.headers.authorization?.split(" ")[1] || req.cookies.access_token;

    if (!access_token) {
      res
        .status(httpStatus.UNAUTHORIZED)
        .json({ error: "Unauthorized Request" });
    }

    const { data, error_message, code } = verifyAndDecodeToken(
      access_token,
      JWT_SECRET
    );

    if (error_message) {
      res.status(code).json({ error: error_message });
      return;
    }

    if (data && data.userId) {
      const userDoc = await User.findById(
        new mongoose.Types.ObjectId(data.userId)
      );

      if (userDoc) {
        (req as AuthenticatedOrganizationRequest).organization = userDoc;
      } else {
        res.status(httpStatus.NOT_FOUND).json({ error: "User Not Found" });
        return;
      }
    }

    next();
  } catch (error) {
    console.error("Authentication Middleware Error:", error);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

const authService = {
  logout,
  register,
  login,
  socketAuth,
  expressAuth,
  refreshTokenAPI,
  refreshTokensSocket,
  generateToken,
};

export default authService;
