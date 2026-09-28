import mongoose from "mongoose";

// Central error handler: every error response is JSON shaped as { message, errors? }.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [
        field,
        e.kind === "required" ? `${field} is required` : e.message,
      ])
    );
    return res.status(400).json({ message: "Please check the highlighted fields", errors });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid value for ${err.path}` });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Malformed JSON body" });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? "Something went wrong on the server" : err.message });
};

export default errorHandler;
