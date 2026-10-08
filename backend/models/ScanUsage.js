import mongoose from "mongoose";

// One document per calendar month (UTC), counting paid Cloud scans and their estimated
// cost, so the app can stay inside the monthly Google Cloud credit.
const scanUsageSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true }, // "2026-10"
    scans: { type: Number, default: 0 },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ScanUsage = mongoose.model("ScanUsage", scanUsageSchema);
export default ScanUsage;
