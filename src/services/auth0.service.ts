import jwt, { JwtPayload } from "jsonwebtoken";
import httpStatus from "http-status";
import axios from "axios";
import { Response } from "express";
import { authTypes } from "../constants/event.handler";
import User, { IUser } from "../models/user.model";
import { config } from "../config/dotenv.config";
import { ApiError } from "../utils/express.utils";
import authService from "./auth.service";
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

// Define Auth0 Token Response
interface Auth0TokenResponse {
  id_token: string;
}

// Define Auth0 Decoded Token Structure
interface Auth0DecodedToken extends JwtPayload {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

// Define Auth0 Callback Input
interface Auth0CallbackInput {
  query: { code: string };
}

// **Auth0 Callback Handler**
const auth0Callback = async ({ query }: Auth0CallbackInput) => {
  try {
    const { code } = query;

    // Get Auth0 Token
    const tokenResponse = await axios.post<Auth0TokenResponse>(
      `https://${AUTH0_DOMAIN}/oauth/token`,
      {
        grant_type: "authorization_code",
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        code: code,
        redirect_uri: `${BASE_URL}${AUTH0_CLIENT_REDIRECT_URL}`,
      }
    );

    const { id_token } = tokenResponse.data;

    // Decode JWT Token
    const decodedIdToken = jwt.decode(id_token) as Auth0DecodedToken | null;
    if (!decodedIdToken) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid ID token");
    }

    const { sub, name, email, picture } = decodedIdToken;
    const [authMethod, authId] = sub.split("|");

    let user = await User.findOne({ authMethod, authId });

    if (!user) {
      // Create a new user if not found
      user = new User({
        name,
        email,
        authMethod,
        authId,
        profilePictureLink: picture,
      });
      await user.save();
    }

    // Generate access & refresh tokens
    const access_token = await authService.generateToken({
      userId: user._id.toString(),
      expiresIn: ACCESS_TOKEN_EXPIRY,
      secret: JWT_SECRET,
      aud: authTypes.USER,
    });

    const refresh_token = await authService.generateToken({
      userId: user._id.toString(),
      expiresIn: REFRESH_TOKEN_EXPIRY,
      secret: JWT_SECRET,
      aud: authTypes.USER,
    });

    return {
      access_token,
      refresh_token,
    };
  } catch (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Internal Server Error"
    );
  }
};

// **Generate Auth0 Login Link**
const generateAuth0LoginLink = (): string => {
  return `https://${AUTH0_DOMAIN}/authorize?response_type=code&client_id=${AUTH0_CLIENT_ID}&redirect_uri=${BASE_URL}${AUTH0_CLIENT_REDIRECT_URL}&scope=${AUTH0_SCOPE}`;
};

const auth0Service = { generateAuth0LoginLink, auth0Callback };

export default auth0Service;

// FLOW
// CREATE AUTH0 APP
// GET DETAILS LIKE AUTH0_DOMAIN,AUTH0_CLIENT_ID,AUTH0_CLIENT_SECRET,AUTH0_AUDIENCE
// SET GRANT TYPE PASSWORD IN APP > SETTINGS > ADVANCE
// GOTO DASHBOARD > API > SELECT APP >
//            1. PERMISSION > Add read and write
//            2. MACHINE TO MACHINE APPLICATION > SELECT APP > Authorization TRUE AND ADD Select Read And Write
//

// LOGIN IN AUTH0 VIA SDK, GET TOKEN
// LOGIN URL WILL BE `https://${AUTH0_DOMAIN}/authorize?response_type=code&client_id=${AUTH0_CLIENT_ID}&redirect_uri=${BASE_URL}${AUTH0_CLIENT_REDIRECT_URL}&scope=${AUTH0_SCOPE}`
// LOGIN METHOD GET

// LOGIN VIA EXPRESS API (OUR SERVER) SEND AUTH0_TOKEN,
// FROM AUTH0_TOKEN GET USER VIA MATCH TOKEN_ID FROM OUR DATA BASE
// IF USER NOT FOUND THEN GET DATA FROM
// GET IT FROM getAuth0UserInfo CREATE USER
// CREATE ACCESS AND REFRESH TOKEN AND SEND RESPONSE
