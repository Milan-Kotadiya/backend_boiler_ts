import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { createResponseObject, catchAsync } from "../utils/express.utils";
import authService from "../services/auth.service";
import auth0Service from "../services/auth0.service";

// Register a new user
const register = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userDoc = await authService.register(req.body);

    const data4responseObject = {
      req,
      code: httpStatus.OK,
      message: "register_successfully",
      payload: { result: userDoc },
      logPayload: false,
    };

    res.status(httpStatus.OK).send(createResponseObject(data4responseObject));
  }
);

// Login user
const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userDoc = await authService.login(req.body);

    const data4responseObject = {
      req,
      code: httpStatus.OK,
      message: "login_successfully",
      payload: { result: userDoc },
      logPayload: false,
    };

    res.status(httpStatus.OK).send(createResponseObject(data4responseObject));
  }
);

// Refresh authentication token
const refreshToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const tokenDocs = await authService.refreshTokenAPI(req.body.refresh_token);

    const data4responseObject = {
      req,
      code: httpStatus.OK,
      message: "token_refreshed_successfully",
      payload: { result: tokenDocs },
      logPayload: false,
    };

    res.status(httpStatus.OK).send(createResponseObject(data4responseObject));
  }
);

// Handle authentication callback
const authCallback = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const tokenDocs = await auth0Service.auth0Callback({
      query: {
        code: req.query.code as string,
      },
    });

    const data4responseObject = {
      req,
      code: httpStatus.OK,
      message: "authenticated_successfully",
      payload: { result: tokenDocs },
      logPayload: false,
    };

    res.status(httpStatus.OK).send(createResponseObject(data4responseObject));
  }
);

// Generate authentication link
const authLink = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const link = auth0Service.generateAuth0LoginLink();

    const data4responseObject = {
      req,
      code: httpStatus.OK,
      message: "link_generated_successfully",
      payload: { result: { link } },
      logPayload: false,
    };

    res.status(httpStatus.OK).send(createResponseObject(data4responseObject));
  }
);

const authController = {
  register,
  login,
  refreshToken,
  authCallback,
  authLink,
};
export default authController;
