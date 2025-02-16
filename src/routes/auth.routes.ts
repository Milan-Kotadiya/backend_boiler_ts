import express from "express";
import {
  refreshTokenSchema,
  userLoginSchema,
  userRegisterSchema,
} from "../validations/user.validation";
import { expressValidateSchema } from "../validations/validation";
import authController from "../controller/auth.controller";

const router = express.Router();

router.post(
  "/register",
  expressValidateSchema(userRegisterSchema, "body"),
  authController.register
);

router.post(
  "/login",
  expressValidateSchema(userLoginSchema, "body"),
  authController.login
);

router.post(
  "/refresh_token",
  expressValidateSchema(refreshTokenSchema, "body"),
  authController.refreshToken
);

router.get("/auth_0/get_link", authController.authLink);
router.get("/auth_0/callback", authController.authCallback);

const authRoutes = router;

export default authRoutes;
