import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import axios from "axios";
import CryptoJS from "crypto-js";
import { Request, Response } from "express";
import { authTypes } from "../../constants/event.handler";
import { config } from "../../config/dotenv.config";
import { getUsersModel } from "../../models/dynamic_models/organization_user.model";
import { ApiError } from "../../utils/express.utils";
import organizationAuthService from "./auth.service";
const {
  AUTH0_DOMAIN,
  AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET,
  AUTH0_CLIENT_REDIRECT_URL,
  REFRESH_TOKEN_EXPIRY,
  JWT_SECRET,
  AUTH0_SCOPE,
  ACCESS_TOKEN_EXPIRY,
  BASE_URL,
} = config;

// Define encryption key and IV
const key = CryptoJS.enc.Utf8.parse("26605c16b2a07771e83788e28c040594");
const iv = CryptoJS.enc.Utf8.parse("3a55763397463403");

// Interface for Auth0 token response
interface Auth0TokenResponse {
  id_token: string;
}

// Interface for decoded Auth0 token
interface DecodedAuth0Token {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

// Interface for decrypting state data
interface StateData {
  organizationId: string;
}

// Interface for authentication callback request
interface Auth0CallbackRequest {
  query: {
    code: string;
    state: string;
  };
}

// Encrypting text
const encrypt = (data: object): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), key, { iv }).toString();
};

// Decrypting text
const decrypt = (data: string): StateData => {
  const bytes = CryptoJS.AES.decrypt(data, key, { iv });
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// Auth0 Callback
const auth0Callback = async ({
  query,
}: Auth0CallbackRequest): Promise<{
  access_token: string;
  refresh_token: string;
}> => {
  try {
    const { code, state } = query;
    const decodeStateData = decrypt(state);
    const { organizationId } = decodeStateData;

    // Exchange authorization code for Auth0 token
    const { data } = await axios.post<Auth0TokenResponse>(
      `https://${AUTH0_DOMAIN}/oauth/token`,
      {
        grant_type: "authorization_code",
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        code,
        redirect_uri: `${BASE_URL}${AUTH0_CLIENT_REDIRECT_URL}`,
      }
    );

    // Decode ID token
    const decodedIdToken = jwt.decode(data.id_token) as DecodedAuth0Token;

    if (!decodedIdToken) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid Auth0 token");
    }

    const { sub, name, email, picture } = decodedIdToken;
    const [authMethod, authId] = sub.split("|");

    // Get user model for the organization
    const User = await getUsersModel(organizationId);

    // Check if user exists
    const isExisted = await User.findOne({ authMethod, authId });

    if (isExisted) {
      // Generate access and refresh tokens
      const access_token = await organizationAuthService.generateToken({
        userId: isExisted._id.toString(),
        expiresIn: ACCESS_TOKEN_EXPIRY,
        secret: JWT_SECRET,
        aud: authTypes.USER,
      });

      const refresh_token = await organizationAuthService.generateToken({
        userId: isExisted._id.toString(),
        expiresIn: REFRESH_TOKEN_EXPIRY,
        secret: JWT_SECRET,
        aud: authTypes.USER,
      });

      return { access_token, refresh_token };
    } else {
      // Create a new user
      const newUser = new User({
        name,
        email,
        authMethod,
        authId,
        profilePictureLink: picture,
      });

      const userDoc = await newUser.save();

      // Generate access and refresh tokens
      const access_token = await organizationAuthService.generateToken({
        userId: userDoc._id.toString(),
        expiresIn: ACCESS_TOKEN_EXPIRY,
        secret: JWT_SECRET,
        aud: authTypes.USER,
      });

      const refresh_token = await organizationAuthService.generateToken({
        userId: userDoc._id.toString(),
        expiresIn: REFRESH_TOKEN_EXPIRY,
        secret: JWT_SECRET,
        aud: authTypes.USER,
      });

      return { access_token, refresh_token };
    }
  } catch (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Internal Server Error"
    );
  }
};

// Generate Auth0 login link
const generateAuth0LoginLink = (organizationId: string): string => {
  const encryptedString = encrypt({ organizationId });

  return `https://${AUTH0_DOMAIN}/authorize?response_type=code&client_id=${AUTH0_CLIENT_ID}&redirect_uri=${BASE_URL}${AUTH0_CLIENT_REDIRECT_URL}&scope=${AUTH0_SCOPE}&state=${encodeURIComponent(
    encryptedString
  )}`;
};

const organizationAuth0Service = {
  generateAuth0LoginLink,
  auth0Callback,
};

export default organizationAuth0Service;
