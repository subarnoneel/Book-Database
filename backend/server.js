import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import connectDB from "./utils/connectDB.js";
import { checkEnv } from "./config.js";
import bookRoutes from "./routes/bookRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import scanRoutes from "./routes/scanRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

dotenv.config({ quiet: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "../frontend/dist");

const app = express();
// Render (and most hosts) sit behind one proxy; needed for secure cookies and rate limiting.
app.set("trust proxy", 1);
app.use(helmet());
app.use(cookieParser());
// Mounted before the global JSON parser: it accepts photos, so it has its own larger limit.
app.use("/api/scan", scanRoutes);
app.use(express.json({ limit: "100kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api", (req, res) => res.status(404).json({ message: "API route not found" }));

// Serve the built frontend (production). In development Vite serves it instead.
if (fs.existsSync(path.join(distDir, "index.html"))) {
  app.use(express.static(distDir));
  app.get("*", (req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.use(errorHandler);

const start = async () => {
  try {
    checkEnv();
    await connectDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

start();
