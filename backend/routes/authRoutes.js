import express from "express";
import { rateLimit } from "express-rate-limit";
import { login, me, logout } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again in 15 minutes" },
});

router.post("/login", loginLimiter, asyncHandler(login));
router.get("/me", requireAuth, me);
router.post("/logout", logout);

export default router;
