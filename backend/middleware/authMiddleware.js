import jwt from "jsonwebtoken";
import { AUTH_COOKIE } from "../config.js";

export const requireAuth = (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return res.status(401).json({ message: "Not logged in" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Session expired, please log in again" });
  }
};
