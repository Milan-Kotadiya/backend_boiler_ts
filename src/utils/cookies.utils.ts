import { Request, Response, NextFunction } from "express";
import {
  RedisGet,
  RedisSet,
  RedisDelete,
} from "../connections/redis.connection";
import { config } from "../config/dotenv.config";

// Define visit tracking structure
interface UserVisitData {
  visitCount: number;
  restrictedUntil: number | null;
}

const {
  TRACK_SITE_VISIT,
  MAX_VISIT_LIMIT,
  RESTRICTION_MINUTES,
  COOKIE_STORAGE,
} = config;

// Middleware to track visits
export const siteVisitMonitor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!TRACK_SITE_VISIT) {
      return next(); // Skip tracking if disabled
    }

    const now = Date.now();

    if (COOKIE_STORAGE === "redis") {
      const ip = req.ip === "::1" ? "127.0.0.1" : req.ip; // Handle localhost IP
      const redisKey = `${ip}:visit:${req.method}:${req.url}`;
      const redisKeyRestricted = `${ip}:restricted:${req.method}:${req.url}`;

      let restrictedUserData = (await RedisGet(
        redisKeyRestricted
      )) as UserVisitData | null;
      let userData = (await RedisGet(redisKey)) as UserVisitData | null;

      if (
        restrictedUserData &&
        restrictedUserData.restrictedUntil &&
        restrictedUserData.restrictedUntil > now
      ) {
        const timeLeft = Math.ceil(
          (restrictedUserData.restrictedUntil - now) / 1000 / 60
        );
        return res.status(429).json({
          message: `Too many requests. Please come back after ${timeLeft} minute(s).`,
        });
      } else if (restrictedUserData) {
        await RedisDelete(redisKeyRestricted);
      }

      if (!userData) {
        userData = { visitCount: 0, restrictedUntil: null };
      }

      userData.visitCount += 1;

      if (userData.visitCount > MAX_VISIT_LIMIT) {
        userData.restrictedUntil = now + RESTRICTION_MINUTES * 60 * 1000; // Restriction period

        await RedisDelete(redisKey);
        await RedisSet(redisKeyRestricted, userData, RESTRICTION_MINUTES * 60);
        return res.status(429).json({
          message: `Too many requests. You are restricted for ${RESTRICTION_MINUTES} minutes.`,
        });
      }

      await RedisSet(redisKey, userData);
    } else {
      // Store in cookies
      const cookieKey = `visit`;
      const restrictedKey = `restricted`;

      let userData: UserVisitData = JSON.parse(
        getCookie(req, cookieKey) || "{}"
      );
      let restrictedUserData: { restrictedUntil: number | null } = JSON.parse(
        getCookie(req, restrictedKey) || "{}"
      );

      if (
        restrictedUserData.restrictedUntil &&
        restrictedUserData.restrictedUntil > now
      ) {
        const timeLeft = Math.ceil(
          (restrictedUserData.restrictedUntil - now) / 1000 / 60
        );
        return res.status(429).json({
          message: `Too many requests. Please come back after ${timeLeft} minute(s).`,
        });
      } else if (restrictedUserData.restrictedUntil) {
        setCookie(res, restrictedKey, "", { maxAge: 0, path: "/" });
      }

      if (!userData.visitCount) {
        userData = { visitCount: 0, restrictedUntil: null };
      }

      userData.visitCount += 1;

      if (userData.visitCount > MAX_VISIT_LIMIT) {
        userData.restrictedUntil = now + RESTRICTION_MINUTES * 60 * 1000;
        setCookie(
          res,
          restrictedKey,
          JSON.stringify({ restrictedUntil: userData.restrictedUntil }),
          {
            maxAge: RESTRICTION_MINUTES * 60,
            path: "/",
          }
        );
        setCookie(res, cookieKey, "", { maxAge: 0, path: "/" });
        return res.status(429).json({
          message: `Too many requests. You are restricted for ${RESTRICTION_MINUTES} minutes.`,
        });
      }

      setCookie(res, cookieKey, JSON.stringify(userData), {
        maxAge: 3600, // 1-hour expiry
        path: "/",
      });
    }

    next();
  } catch (error) {
    console.error("Error in siteVisitMonitor:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get a cookie by name
export const getCookie = (req: Request, name: string): string | null => {
  const cookies = req.cookies || {};
  return cookies[name] || null;
};

// Set a cookie dynamically
interface CookieOptions {
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  path?: string;
  maxAge?: number;
  expires?: Date;
}

export const setCookie = (
  res: Response,
  key: string,
  value: string,
  options: CookieOptions = {}
): void => {
  const {
    secure = false,
    httpOnly = true,
    sameSite = "Lax",
    path = "/",
    maxAge,
    expires,
  } = options;

  const cookieOptions: Record<string, any> = {
    httpOnly,
    secure,
    sameSite,
    path,
  };

  if (maxAge) cookieOptions.maxAge = maxAge * 1000;
  if (expires) cookieOptions.expires = new Date(expires);

  res.cookie(key, value, cookieOptions);
};

// Delete a cookie
export const deleteCookie = (
  res: Response,
  name: string,
  options: CookieOptions = {}
): void => {
  const { path = "/", secure = false, httpOnly = true } = options;

  res.cookie(name, "", {
    maxAge: 0,
  });
};
