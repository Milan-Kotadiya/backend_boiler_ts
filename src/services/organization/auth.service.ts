import mongoose, { Document, Model } from "mongoose";
import jwt from "jsonwebtoken";
import { authTypes } from "../../constants/event.handler";
import { Socket } from "socket.io";
import { Request, Response, NextFunction } from "express";
import {
  getUsersModel,
  IUser,
} from "../../models/dynamic_models/organization_user.model";
import { config } from "../../config/dotenv.config";

const { JWT_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } = config;

export interface OrganizationTokenPayload {
  organizationId: string;
  aud: string;
  [key: string]: any;
}

export interface OrganizationAuthResponse {
  organization?: IUser;
  access_token: string;
  refresh_token: string;
}

export interface AuthenticatedOrganizationRequest extends Request {
  organization: IUser;
}
/**
 * 🔹 Generate a JWT token
 */
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
  aud: string;
  others?: Record<string, unknown>;
}) => {
  const payload = {
    userId,
    aud,
    ...others,
  };

  return jwt.sign(payload, secret as string, { expiresIn });
};

/**
 * 🔹 Register a new user
 */
const register = async (
  data: { name: string; email: string; password: string },
  socket: Socket | null,
  organizationId: string
): Promise<IUser> => {
  const User: Model<IUser> = await getUsersModel(organizationId);
  const { name, email, password } = data;

  if (await User.findOne({ email })) throw new Error("User Already Registered");

  const newUser = new User({ name, email, password });
  return await newUser.save();
};

/**
 * 🔹 Login a user
 */
const login = async (
  data: { email: string; password: string },
  socket: Socket | null,
  organizationId: string
): Promise<OrganizationAuthResponse> => {
  const { email, password } = data;
  const User: Model<IUser> = await getUsersModel(organizationId);

  const userDoc = await User.findOne({ email });
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

  return {
    organization: userDoc,
    access_token,
    refresh_token,
  };
};

/**
 * 🔹 Logout a user
 */
const logout = async (
  socketId: string,
  organizationId: string
): Promise<void> => {
  const User: Model<IUser> = await getUsersModel(organizationId);
  await User.findOneAndUpdate(
    { socketId },
    { isOnline: false, lastSeen: new Date() }
  );
};

/**
 * 🔹 Verify and decode JWT token
 */
const verifyAndDecodeToken = (
  token: string,
  secret: string = JWT_SECRET
): {
  code: number;
  data?: OrganizationTokenPayload;
  error_message?: string;
} => {
  try {
    return {
      code: 200,
      data: jwt.verify(token, secret) as OrganizationTokenPayload,
    };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError)
      return { code: 401, error_message: "token_has_expired" };
    if (err instanceof jwt.JsonWebTokenError)
      return { code: 401, error_message: "token_is_invalid" };
    return { code: 401, error_message: "token_verification_failed" };
  }
};

/**
 * 🔹 Socket Authentication Middleware
 */
const socketAuth = async (
  socket: Socket | null,
  next: Function,
  organizationId: string
): Promise<void> => {
  const User: Model<IUser> = await getUsersModel(organizationId);
  const access_token = socket?.handshake?.auth?.access_token;

  if (!access_token) return next(new Error("Access token is required"));

  const { data, error_message } = verifyAndDecodeToken(access_token);
  if (error_message) return next(new Error(error_message));

  const userDoc = await User.findById(data!.userId);
  if (!userDoc) return next(new Error("User not found"));

  socket.handshake.auth = { ...socket.handshake.auth, user: userDoc };
  next();
};

/**
 * 🔹 Express Authentication Middleware
 */
const expressAuth =
  (organizationId: string) =>
  async (
    req: AuthenticatedOrganizationRequest,
    res: Response,
    next: NextFunction
  ) => {
    const User: Model<IUser> = await getUsersModel(organizationId);
    const access_token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.access_token;

    if (!access_token)
      return res.status(401).json({ error: "Access token is required" });

    const { data, error_message, code } = verifyAndDecodeToken(access_token);

    if (error_message) return res.status(code).json({ error: error_message });

    if (data) {
      const userDoc = await User.findById(data.userId);
      if (userDoc) {
        req.organization = userDoc;
        next();
      } else {
        res.status(404).json({ message: "User not found" });
      }
    }
  };

/**
 * 🔹 Refresh Token Handler
 */
const refreshTokens = async (
  refresh_token_old: string,
  organizationId: string
): Promise<OrganizationAuthResponse> => {
  const User: Model<IUser> = await getUsersModel(organizationId);
  const { data, error_message } = verifyAndDecodeToken(refresh_token_old);

  if (error_message) throw new Error(error_message);

  const userDoc = await User.findById(data!.userId);
  if (!userDoc) throw new Error("User not found");

  const access_token = await generateToken({
    userId: userDoc._id.toString(),
    expiresIn: ACCESS_TOKEN_EXPIRY,
    aud: data!.aud,
  });
  const refresh_token = await generateToken({
    userId: userDoc._id.toString(),
    expiresIn: REFRESH_TOKEN_EXPIRY,
    aud: data!.aud,
  });

  return { organization: userDoc, access_token, refresh_token };
};

/**
 * 🔹 Refresh Token for Socket
 */
const refreshTokensSocket = async (
  socket: Socket,
  organizationId: string
): Promise<OrganizationAuthResponse> => {
  const refresh_token_old = socket?.handshake?.auth?.refresh_token;
  const { access_token, refresh_token } = await refreshTokens(
    refresh_token_old,
    organizationId
  );

  socket.handshake.auth = {
    ...socket.handshake.auth,
    access_token,
    refresh_token,
  };
  return { access_token, refresh_token };
};

/**
 * 🔹 Refresh Token for API
 */
const refreshTokenAPI = async (
  refresh_token_old: string,
  organizationId: string
): Promise<OrganizationAuthResponse> => {
  return refreshTokens(refresh_token_old, organizationId);
};

const organizationAuthService = {
  logout,
  register,
  login,
  socketAuth,
  expressAuth,
  refreshTokenAPI,
  refreshTokensSocket,
  generateToken,
};

export default organizationAuthService;
