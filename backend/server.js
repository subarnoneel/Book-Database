import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./utils/connectDB.js";
import bookRoutes from "./routes/bookRoutes.js";
import { verifyLogin } from "./middleware/authMiddleware.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/books", bookRoutes);
app.post("/api/login", verifyLogin, (req, res) => {
  res.json({ message: "Login successful" });
});

// Serve frontend build
app.use(express.static(path.join(__dirname, "../frontend/dist")));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
