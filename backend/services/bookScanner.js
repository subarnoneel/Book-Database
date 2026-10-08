import { GoogleGenAI } from "@google/genai";
import { HttpError } from "../utils/httpError.js";
import { normalizeText } from "../utils/text.js";
import { getMonthUsage, recordCloudScan } from "./scanUsage.js";

// Two ways to reach Gemini, tried in this order:
// - "cloud": Google Cloud (Agent Platform / Vertex AI) with GOOGLE_VERTEX_API_KEY. Paid per
//   scan from the Google Cloud credit, reliable, no daily limit. Used until this month's
//   estimated spend reaches SCAN_MONTHLY_BUDGET_USD (see scanUsage.js).
// - "free": the Gemini API free tier with GEMINI_API_KEY. About 20 scans a day per model,
//   and the newer models are often busy.
// Within each, models are tried in order; a busy (503), rate-limited or missing model
// falls through to the next. gemini-3.8-flash leads on Cloud: it read Bangla most
// accurately in testing and is cheap. On the free tier gemini-2.5-flash was the most
// reliably available.
const listFromEnv = (name, fallback) => {
  const configured = (process.env[name] || "").split(",").map((m) => m.trim()).filter(Boolean);
  return configured.length ? configured : fallback;
};

const BACKENDS = {
  cloud: {
    apiKey: () => process.env.GOOGLE_VERTEX_API_KEY,
    vertexai: true,
    models: () => listFromEnv("GEMINI_CLOUD_MODELS", ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-3.5-flash"]),
  },
  free: {
    apiKey: () => process.env.GEMINI_API_KEY,
    vertexai: false,
    models: () => listFromEnv("GEMINI_MODELS", ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-3.5-flash"]),
  },
};
const RETRYABLE = new Set([429, 500, 503, 504]);

const CONFIDENCE = { type: "string", enum: ["high", "medium", "low"] };

// Gemini is forced to answer in exactly this shape.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean", description: "false if no book cover/page is visible or nothing is readable" },
    title: { type: "string" },
    author: { type: "string" },
    publisher: { type: "string" },
    genre: { type: "string" },
    confidence: {
      type: "object",
      properties: { title: CONFIDENCE, author: CONFIDENCE, publisher: CONFIDENCE, genre: CONFIDENCE },
      required: ["title", "author", "publisher", "genre"],
    },
    notes: { type: "string", description: "Short note for the user if something was hard to read; otherwise empty" },
    alternateTitles: {
      type: "array",
      items: { type: "string" },
      description: "Other well-known titles of the same work (transliteration, translation); empty if unknown",
    },
  },
  required: ["found", "title", "author", "publisher", "genre", "confidence", "notes", "alternateTitles"],
};

const buildPrompt = ({ authors, publishers, genres }) => `You are reading photos of one book from a family's home library in Bangladesh.
The photos may show the front cover, the inner title page, the spine or the copyright page of the SAME book.
Most books are Bangla; some are English.

Extract:
- title: the book's main title. Include a subtitle only if it is clearly part of the title. Leave out series names, slogans and review quotes.
- author: the writer. Leave out role words such as "লেখক", "রচনা", "by". If there are several authors, join them with ", ".
- For English text printed in ALL CAPITALS, return normal capitalisation (e.g. "ERNEST HEMINGWAY" -> "Ernest Hemingway").
- publisher: the publishing house name only (no address, no "প্রকাশক:" label). It is often a logo or small text at the bottom of the cover, spine or title page. Use "" if it is not visible.
- genre: one short genre for the book. Prefer one from EXISTING GENRES; otherwise a short genre in the same language as the title.
- alternateTitles: only if you actually know this book, up to 3 other titles the same work is commonly known by: its romanised spelling (e.g. "পথের পাঁচালী" -> "Pather Panchali"), its Bangla spelling for an English title, or a well-known translated title (e.g. "গীতাঞ্জলি" -> "Gitanjali", "Song Offerings"). Use [] if you don't know the book. These are used to spot books already in the library, so never guess.

Rules:
- Copy text exactly as printed, in its original script. Never translate or transliterate (Bangla stays Bangla, English stays English).
- If the author or publisher is the same person/company as an entry in EXISTING AUTHORS / EXISTING PUBLISHERS (even if spelled slightly differently on the book), return the existing spelling exactly.
- If you recognise the book you may use that knowledge to complete a partly hidden word, but never invent text; mark such fields "low".
- confidence: "high" = clearly printed and certain, "medium" = some doubt, "low" = guessed or partly unreadable. Genre is a suggestion, so it is at most "medium" unless printed on the book.
- If no book is visible or nothing can be read, set found to false and leave the fields empty.

EXISTING AUTHORS: ${JSON.stringify(authors)}
EXISTING PUBLISHERS: ${JSON.stringify(publishers)}
EXISTING GENRES: ${JSON.stringify(genres)}`;

const REQUEST_TIMEOUT_MS = 40_000;
const BUSY_COOLDOWN_MS = 10 * 60 * 1000;

const clients = {};
const getClient = (backend) => {
  // SDK retries are off (attempts: 1): on a busy model it is faster to move to the next one.
  clients[backend] ??= new GoogleGenAI({
    apiKey: BACKENDS[backend].apiKey(),
    vertexai: BACKENDS[backend].vertexai,
    httpOptions: { timeout: REQUEST_TIMEOUT_MS, retryOptions: { attempts: 1 } },
  });
  return clients[backend];
};

export const scanningStatus = () => ({
  cloudEnabled: Boolean(BACKENDS.cloud.apiKey()),
  freeEnabled: Boolean(BACKENDS.free.apiKey()),
});

// "backend:model" pairs that recently answered "busy" or "not found", with when to try
// them again, so later scans don't wait on them.
const unavailableUntil = new Map();
const isCoolingDown = (key) => (unavailableUntil.get(key) ?? 0) > Date.now();

// Busy, rate-limited, retired (404) or timed out (no status): worth trying another model.
const isBusy = (err) => err.status === undefined || RETRYABLE.has(err.status) || err.status === 404;

// The free tier allows a small number of requests per model per day (e.g. 20). Google's
// 429 names the quota; a daily one won't clear in minutes, so skip that model for longer.
const DAILY_COOLDOWN_MS = 60 * 60 * 1000;
const isDailyQuota = (err) => err.status === 429 && /PerDay/i.test(err.message ?? "");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Loose key for comparing names: ignore case, spaces and punctuation.
const nameKey = (s) => normalizeText(s).toLowerCase().replace(/[\s.,\-'"()।]/g, "");

// If Gemini returns a variant of a name we already have, use our spelling.
const snapToExisting = (value, existing) => {
  if (!value) return value;
  const key = nameKey(value);
  return existing.find((e) => nameKey(e) === key) ?? value;
};

/**
 * Reads book details from 1–3 photos.
 * @param {{ data: string, mimeType: string }[]} images base64 image data
 * @param {{ authors: string[], publishers: string[], genres: string[] }} library existing names
 */
export async function scanBook(images, library) {
  const { cloudEnabled, freeEnabled } = scanningStatus();
  if (!cloudEnabled && !freeEnabled) {
    throw new HttpError(503, "Book scanning is not set up: no Gemini API key on the server.");
  }
  const budgetReached = cloudEnabled && (await getMonthUsage()).budgetReached;

  // Every backend/model pair to try, in order.
  const attempts = [];
  if (cloudEnabled && !budgetReached) attempts.push(...BACKENDS.cloud.models().map((model) => ({ backend: "cloud", model })));
  if (freeEnabled) attempts.push(...BACKENDS.free.models().map((model) => ({ backend: "free", model })));
  if (attempts.length === 0) {
    throw new HttpError(429, "This month's scanning budget has been used up. Scanning will work again next month.");
  }

  const contents = [
    ...images.map((img) => ({ inlineData: { data: img.data, mimeType: img.mimeType } })),
    { text: buildPrompt(library) },
  ];

  const tryModel = async ({ backend, model }) => {
    const response = await getClient(backend).models.generateContent({
      model,
      contents,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
        temperature: 0,
      },
    });
    // Paid Cloud scans count towards the monthly budget, even if the answer turns out unusable.
    if (backend === "cloud") await recordCloudScan(model, response.usageMetadata);
    const text = response.text;
    if (!text) throw new HttpError(422, "The AI could not read this photo. Try a clearer photo.");

    const raw = JSON.parse(text);
    return {
      found: Boolean(raw.found),
      title: normalizeText(raw.title ?? ""),
      author: snapToExisting(normalizeText(raw.author ?? ""), library.authors),
      publisher: snapToExisting(normalizeText(raw.publisher ?? ""), library.publishers),
      genre: snapToExisting(normalizeText(raw.genre ?? ""), library.genres),
      confidence: raw.confidence ?? {},
      notes: normalizeText(raw.notes ?? ""),
      alternateTitles: (Array.isArray(raw.alternateTitles) ? raw.alternateTitles : [])
        .map((t) => normalizeText(String(t)))
        .filter(Boolean)
        .slice(0, 3),
      model: response.modelVersion ?? model,
      via: backend,
    };
  };

  let lastError;
  let sawDailyQuota = false;
  const started = Date.now();
  const skipped = [];
  // First pass skips pairs that were busy recently; if every pair fails, one more pass
  // over all of them after a short pause.
  const brokenBackends = new Set(); // e.g. invalid key: its other models won't help either
  for (const pass of [1, 2]) {
    for (const attempt of attempts) {
      const key = `${attempt.backend}:${attempt.model}`;
      if (brokenBackends.has(attempt.backend) || (pass === 1 && isCoolingDown(key))) continue;
      try {
        const result = await tryModel(attempt);
        const note = skipped.length ? ` (unavailable: ${skipped.join(", ")})` : "";
        console.log(`Scan read by ${key} in ${((Date.now() - started) / 1000).toFixed(1)}s${note}`);
        return result;
      } catch (err) {
        if (err instanceof HttpError) throw err;
        lastError = err;
        skipped.push(`${key} ${err.status ?? "timeout"}`);
        if (isDailyQuota(err)) sawDailyQuota = true;
        if (isBusy(err)) unavailableUntil.set(key, Date.now() + (isDailyQuota(err) ? DAILY_COOLDOWN_MS : BUSY_COOLDOWN_MS));
        else if (!(err instanceof SyntaxError)) brokenBackends.add(attempt.backend);
      }
    }
    if (pass === 2 || attempts.every((a) => brokenBackends.has(a.backend))) break;
    await sleep(2000);
  }

  console.error(`Scan failed after ${((Date.now() - started) / 1000).toFixed(1)}s (tried: ${skipped.join(", ")})`);
  if (sawDailyQuota) {
    const lead = budgetReached
      ? "This month's scanning budget is used up, and so are today's free scans. "
      : "Today's free scanning limit has been used up. ";
    throw new HttpError(
      429,
      lead +
        "Free scans reset every day at midnight US Pacific time (early afternoon in Bangladesh). You can still add books by typing."
    );
  }
  if (lastError?.status === 429) {
    throw new HttpError(429, "Too many scans in a short time. Please wait a minute and try again.");
  }
  if (lastError?.status === 400 || lastError?.status === 403) {
    throw new HttpError(502, "Google rejected the scan request. Check the Gemini API keys on the server.");
  }
  throw new HttpError(503, "Google's AI service is busy right now. Please try again in a minute.");
}
