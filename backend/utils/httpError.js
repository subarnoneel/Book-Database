export class HttpError extends Error {
  // `details` is merged into the JSON error response (e.g. { duplicates: [...] }).
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
