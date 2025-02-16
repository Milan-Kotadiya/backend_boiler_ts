import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { createResponseObject, catchAsync } from "../../utils/express.utils";
import authService, {
  AuthenticatedOrganizationRequest,
} from "../../services/organization/auth.service";
import auth0Service from "../../services/organization/auth0.service";

const register = catchAsync(async (req: Request, res: Response) => {
  const { organization } = req as AuthenticatedOrganizationRequest;
  const organizationId = organization._id;
  const userDoc = await authService.register(
    req.body,
    null,
    organizationId.toString()
  );

  const data4responseObject = {
    req,
    code: httpStatus.OK,
    message: "register_successfully",
    payload: { result: userDoc },
    logPayload: false,
  };

  res.status(httpStatus.OK).send(createResponseObject(data4responseObject));
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { organization } = req as AuthenticatedOrganizationRequest;
  const organizationId = organization._id;
  const userDoc = await authService.login(
    req.body,
    null,
    organizationId.toString()
  );

  const data4responseObject = {
    req,
    code: httpStatus.OK,
    message: "login_successfully",
    payload: { result: userDoc },
    logPayload: false,
  };

  res.status(httpStatus.OK).send(createResponseObject(data4responseObject));
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { organization } = req as AuthenticatedOrganizationRequest;
  const organizationId = organization._id;
  const tokenDocs = await authService.refreshTokenAPI(
    req.body.refresh_token,
    organizationId.toString()
  );

  const data4responseObject = {
    req,
    code: httpStatus.OK,
    message: "token_refreshed_successfully",
    payload: { result: tokenDocs },
    logPayload: false,
  };

  res.status(httpStatus.OK).send(createResponseObject(data4responseObject));
});

const authCallback = catchAsync(async (req: Request, res: Response) => {
  const tokenDocs = await auth0Service.auth0Callback({
    query: {
      code: req.query.code as string,
      state: req.query.state as string,
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
});

const authLink = catchAsync(async (req: Request, res: Response) => {
  const { organization } = req as AuthenticatedOrganizationRequest;
  const organizationId = organization._id;
  const link = auth0Service.generateAuth0LoginLink(organizationId.toString());

  const data4responseObject = {
    req,
    code: httpStatus.OK,
    message: "link_generated_successfully",
    payload: { result: { link } },
    logPayload: false,
  };

  res.status(httpStatus.OK).send(createResponseObject(data4responseObject));
});

const organizationAuthController = {
  register,
  login,
  refreshToken,
  authCallback,
  authLink,
};

export default organizationAuthController;
