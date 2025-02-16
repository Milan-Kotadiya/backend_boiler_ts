import express from "express";
import authRoutes from "./auth.routes";
import testRoutes from "./test.routes";
import organizationRoutes from "./organization.routes";
import { organizationAuth } from "../services/auth.service";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/test", testRoutes);
router.use("/organization", organizationAuth, organizationRoutes);

export default router;
