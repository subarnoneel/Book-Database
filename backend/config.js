export const AUTH_COOKIE = "book_db_session";
export const SESSION_DAYS = 30;

const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "ADMIN_USERNAME", "ADMIN_PASSWORD_HASH"];

export const checkEnv = () => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See backend/.env.example.`);
  }
};
