import { NextFunction } from "express";
import { AuthenticatedOrganizationRequest } from "../services/organization/auth.service";
import mongoose from "mongoose";

export const injectSession = async (req: AuthenticatedOrganizationRequest, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  req.session = session;
  next();
};

export const hasSession = (
  req: Request | AuthenticatedOrganizationRequest
): req is AuthenticatedOrganizationRequest =>{
  return 'session' in req;
}

// const session: ClientSession | undefined = hasSession(req) ? req.session : undefined;


