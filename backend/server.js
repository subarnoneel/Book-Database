import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./utils/connectDB.js";
import bookRoutes from "./routes/bookRoutes.js";
import { verifyLogin } from "./middleware/authMiddleware.js";

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get("/api", (req, res) => {
  res.json({ message: "📡 Backend is running!" });
});

// Login route
app.post("/api/login", verifyLogin, (req, res) => {
  res.json({ message: "Login successful" });
});

// Book routes
console.log("📚 Book routes mounted at /api/books");
app.use("/api/books", bookRoutes);

// ✅ Serve frontend (for production)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../client/build");
  app.use(express.static(frontendPath));

  app.get("/*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend/dist", "index.html"));
  });
  
}

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
