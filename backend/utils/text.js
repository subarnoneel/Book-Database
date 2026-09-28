// Trim, collapse internal whitespace and apply Unicode NFC normalization.
export const normalizeText = (value) =>
  String(value).normalize("NFC").replace(/\s+/g, " ").trim();

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
