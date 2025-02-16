import express from "express";
import {
  userLoginSchema,
  userRegisterSchema,
} from "../validations/user.validation";
import { expressValidateSchema } from "../validations/validation";
import organizationAuthController from "../controller/organization/auth.controller";

const router = express.Router();

router.post(
  "/auth/register",
  expressValidateSchema(userRegisterSchema, "body"),
  organizationAuthController.register
);

router.post(
  "/auth/login",
  expressValidateSchema(userLoginSchema, "body"),
  organizationAuthController.login
);

const organizationRoutes = router;
export default organizationRoutes;
