import express from "express";
import { rateLimit } from "express-rate-limit";
import { scan } from "../controllers/scanController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

// Keeps a stuck button or a script from burning through the Gemini quota.
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many scans in a minute. Please wait a moment." },
});

router.post(
  "/",
  requireAuth,
  scanLimiter,
  // Photos arrive as base64 JSON, so this route needs a bigger body limit than the rest of the API.
  express.json({ limit: "16mb" }),
  asyncHandler(scan)
);

export default router;
