import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE, SESSION_DAYS } from "../config.js";
import { HttpError } from "../utils/httpError.js";

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});

// POST /api/auth/login
export const login = async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    throw new HttpError(400, "Username and password are required");
  }

  const usernameOk = username.trim() === process.env.ADMIN_USERNAME;
  // Always run bcrypt so a wrong username takes as long as a wrong password.
  const passwordOk = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!usernameOk || !passwordOk) throw new HttpError(401, "Incorrect username or password");

  const token = jwt.sign({ username: process.env.ADMIN_USERNAME }, process.env.JWT_SECRET, {
    expiresIn: `${SESSION_DAYS}d`,
  });
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 });
  res.json({ username: process.env.ADMIN_USERNAME });
};

// GET /api/auth/me  (behind requireAuth)
export const me = (req, res) => {
  res.json({ username: req.user.username });
};

// POST /api/auth/logout
export const logout = (req, res) => {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
  res.json({ message: "Logged out" });
};
