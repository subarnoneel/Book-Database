// Finds books in the library that may be the same as a book being added.
// Pure functions only (no database access), so they can be unit-tested directly.
//
// How a title is compared:
// 1. normalise: NFC, lower case, no punctuation, Bangla digits -> 0-9, no leading "the/a/an"
// 2. fold Bangla spelling variants that don't change the word (ি/ী, ু/ূ, শ/ষ/স, ...)
// 3. split off a series volume ("খণ্ড ২", "Part II", "দ্বিতীয় খণ্ড", trailing "2")
// 4. compare the remaining base title: exact, near-exact (typos), or one containing the other
// 5. for Bangla vs English script, compare a rough romanised consonant skeleton

import { normalizeText } from "../utils/text.js";

// ---------------------------------------------------------------------------
// Normalising and folding

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const HAS_BANGLA = /[ঀ-৿]/;
const HAS_LATIN = /[a-z]/;

// Spelling variants that are commonly mixed up but mean the same word.
const BANGLA_FOLDS = {
  "ড়": "র", // ড় -> র
  "ড়": "র",
  "ঢ়": "র", // ঢ় -> র
  "ঢ়": "র",
  "য়": "য", // য় -> য
  "য়": "য",
  "়": "", // any other nukta
  "ী": "ি", // ী -> ি
  "ূ": "ু", // ূ -> ু
  "ঈ": "ই", // ঈ -> ই
  "ঊ": "উ", // ঊ -> উ
  "ঁ": "", // chandrabindu
  "ৎ": "ত", // ৎ -> ত
  "ণ": "ন", // ণ -> ন
  "শ": "স", // শ -> স
  "ষ": "স", // ষ -> স
  "‌": "", // zero-width non-joiner
  "‍": "", // zero-width joiner
};
// One pass over the text; two-character sequences are listed first so they win.
const BANGLA_FOLD_RE = new RegExp(
  Object.keys(BANGLA_FOLDS)
    .sort((a, b) => b.length - a.length)
    .join("|"),
  "g"
);

const foldBangla = (text) => (HAS_BANGLA.test(text) ? text.replace(BANGLA_FOLD_RE, (m) => BANGLA_FOLDS[m]) : text);

/** Lower-cased, folded words of a title or name. */
export function tokens(text) {
  let s = normalizeText(text ?? "").toLowerCase();
  s = s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
  s = s.replace(/&/g, " and ");
  s = foldBangla(s);
  // Punctuation and symbols become spaces (includes the Bangla full stop "।").
  s = s.replace(/[\p{P}\p{S}]/gu, " ");
  return s.split(/\s+/).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Series volumes

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
const ORDINAL_WORDS = Object.fromEntries(
  [
    ["প্রথম", 1], ["দ্বিতীয়", 2], ["তৃতীয়", 3], ["চতুর্থ", 4], ["পঞ্চম", 5],
    ["ষষ্ঠ", 6], ["সপ্তম", 7], ["অষ্টম", 8], ["নবম", 9], ["দশম", 10],
    ["first", 1], ["second", 2], ["third", 3], ["fourth", 4], ["fifth", 5],
    ["sixth", 6], ["seventh", 7], ["eighth", 8], ["ninth", 9], ["tenth", 10],
  ].map(([word, n]) => [tokens(word)[0], n])
);
// Words that mark a volume number next to them: "খণ্ড ২", "২য় খণ্ড", "Vol. 3", "Part II".
const VOLUME_MARKERS = new Set(
  ["খণ্ড", "খন্ড", "পর্ব", "ভাগ", "vol", "volume", "part", "pt", "book", "no"].map((w) => tokens(w)[0])
);
const COLLECTION_WORD = tokens("সমগ্র")[0];
// "১ম", "২য়", "৩য়", "৪র্থ", "৫ম", "৬ষ্ঠ" after folding and digit conversion.
const NUMBERED_ORDINAL = /^(\d{1,2})(ম|য|র্থ|স্ঠ|তম|st|nd|rd|th)$/;

const MAX_PLAIN_VOLUME = 50; // a bare trailing "1984" is a title, not volume 1984

function parseVolume(token, { allowRoman }) {
  if (/^\d{1,3}$/.test(token)) return Number(token);
  const numbered = NUMBERED_ORDINAL.exec(token);
  if (numbered) return Number(numbered[1]);
  if (ORDINAL_WORDS[token]) return ORDINAL_WORDS[token];
  if (allowRoman && ROMAN[token]) return ROMAN[token];
  return null;
}

/** Splits a title into its base words and an optional volume number. */
export function splitVolume(words) {
  for (let i = 0; i < words.length; i++) {
    if (!VOLUME_MARKERS.has(words[i])) continue;
    for (const j of [i + 1, i - 1]) {
      if (j < 0 || j >= words.length) continue;
      const volume = parseVolume(words[j], { allowRoman: true });
      if (volume !== null) {
        const base = words.filter((_, k) => k !== i && k !== j);
        if (base.length) return { base, volume };
      }
    }
  }
  if (words.length >= 2) {
    // Trailing number or ordinal: "মিসির আলি সমগ্র ২", "Harry Potter 2", "হিমু ২য়".
    const last = words[words.length - 1];
    const volume = parseVolume(last, { allowRoman: words[words.length - 2] === COLLECTION_WORD || /^[ivx]+$/.test(last) });
    if (volume !== null && volume <= MAX_PLAIN_VOLUME) return { base: words.slice(0, -1), volume };
    // Leading ordinal word: "দ্বিতীয় খণ্ড ..." without a marker is rare, but "প্রথম আলো" is a real title,
    // so leading words are only treated as volumes next to a marker (handled above).
  }
  return { base: words, volume: null };
}

// ---------------------------------------------------------------------------
// Rough romanisation, for comparing Bangla with English spellings

const CONSONANTS = {
  ক: "k", খ: "kh", গ: "g", ঘ: "gh", ঙ: "ng", চ: "ch", ছ: "chh", জ: "j", ঝ: "jh", ঞ: "n",
  ট: "t", ঠ: "th", ড: "d", ঢ: "dh", ণ: "n", ত: "t", থ: "th", দ: "d", ধ: "dh", ন: "n",
  প: "p", ফ: "ph", ব: "b", ভ: "bh", ম: "m", য: "j", র: "r", ল: "l", শ: "sh", ষ: "sh",
  স: "s", হ: "h",
};
const VOWELS = { অ: "o", আ: "a", ই: "i", ঈ: "i", উ: "u", ঊ: "u", ঋ: "ri", এ: "e", ঐ: "oi", ও: "o", ঔ: "ou" };
const VOWEL_SIGNS = { "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u", "ৃ": "ri", "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou" };
const OTHER = { "ং": "ng", "ঃ": "h", "ঁ": "n", "ৎ": "t" };
const HASANTA = "্";

function romanizeBangla(text) {
  const chars = [...text.normalize("NFC")];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (CONSONANTS[c]) {
      out += CONSONANTS[c];
      const next = chars[i + 1];
      // Inherent vowel between consonants; silent at the end of a word.
      if (next && CONSONANTS[next]) out += "o";
    } else if (VOWELS[c]) out += VOWELS[c];
    else if (VOWEL_SIGNS[c]) out += VOWEL_SIGNS[c];
    else if (OTHER[c]) out += OTHER[c];
    else if (c === HASANTA || c === "়") continue;
    else out += c;
  }
  return out;
}

// Consonant skeleton of a romanised string: spelling of vowels and aspiration varies a lot
// between transliterations (Panchali / Pachali, Bandyopadhyay / Bondopadhyay), consonants less so.
function skeleton(latin) {
  return latin
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/ph/g, "f")
    .replace(/(kh|gh|chh|ch|jh|th|dh|bh|sh)/g, (m) => m[0])
    .replace(/[aeiouwy]/g, "")
    .replace(/(.)\1+/g, "$1");
}

const crossScriptKey = (words) => skeleton(words.map((w) => (HAS_BANGLA.test(w) ? romanizeBangla(w) : w)).join(""));

// ---------------------------------------------------------------------------
// String similarity

function levenshtein(a, b) {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** 1 = identical, 0 = nothing in common. Compares by code point, so Bangla works. */
export function similarity(a, b) {
  const x = [...a];
  const y = [...b];
  if (!x.length && !y.length) return 1;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

// ---------------------------------------------------------------------------
// Titles and authors

const LEADING_ARTICLES = new Set(["the", "a", "an"]);

/** Everything needed to compare one title + author. */
export function analyze(title, author = "") {
  let words = tokens(title);
  if (words.length > 1 && LEADING_ARTICLES.has(words[0])) words = words.slice(1);
  const { base, volume } = splitVolume(words);
  const authorWords = tokens(author);
  return {
    words,
    base,
    baseKey: base.join(""),
    volume,
    script: HAS_BANGLA.test(base.join("")) ? "bn" : HAS_LATIN.test(base.join("")) ? "en" : "other",
    authorWords,
    authorKey: authorWords.join(""),
  };
}

// Romanised skeletons are only needed for cross-script checks, so they are computed lazily.
const crossKey = (info, part) => {
  info.crossKeys ??= {};
  info.crossKeys[part] ??= crossScriptKey(part === "title" ? info.base : info.authorWords);
  return info.crossKeys[part];
};

/** "same" | "different" | "unknown" (when either author is blank). */
export function compareAuthors(a, b) {
  if (!a.authorKey || !b.authorKey) return "unknown";
  if (a.authorKey === b.authorKey) return "same";
  // Same set of name words, or one contains the other ("Tolkien" vs "J R R Tolkien").
  const setA = new Set(a.authorWords);
  const setB = new Set(b.authorWords);
  const [small, large] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  if ([...small].every((w) => large.has(w)) && [...small].some((w) => [...w].length > 2)) return "same";
  if (similarity(a.authorKey, b.authorKey) >= 0.85) return "same";
  const scriptA = HAS_BANGLA.test(a.authorKey) ? "bn" : "en";
  const scriptB = HAS_BANGLA.test(b.authorKey) ? "bn" : "en";
  if (scriptA !== scriptB) {
    const ka = crossKey(a, "author");
    const kb = crossKey(b, "author");
    if (ka.length >= 3 && kb.length >= 3 && similarity(ka, kb) >= 0.75) return "same";
  }
  return "different";
}

// One title is the other plus extra words, e.g. a subtitle: "নন্দিত নরকে উপন্যাস".
function containsTitle(a, b) {
  const [short, long] = a.base.length <= b.base.length ? [a.base, b.base] : [b.base, a.base];
  if (short.length < 2 || short.length === long.length) return false;
  for (let i = 0; i + short.length <= long.length; i++) {
    if (short.every((w, k) => long[i + k] === w)) return true;
  }
  return false;
}

// Titles with different numbers are different books ("Class 7" vs "Class 8", "Book 51" vs
// "Book 52"), however similar the rest is.
const numbersOf = (info) => (info.numbers ??= info.words.join(" ").match(/\d+/g)?.join(",") ?? "");
const numbersDiffer = (a, b) => numbersOf(a) !== "" && numbersOf(b) !== "" && numbersOf(a) !== numbersOf(b);

// One-word titles like "কবিতা" or "Poems" are shared by many unrelated books.
const isGeneric = (info) => info.base.length === 1 && [...info.baseKey].length < 8;

export const KIND_ORDER = ["duplicate", "likely", "series-unknown", "other-script", "same-title", "series"];
// Kinds that should stop a save until the user confirms.
export const BLOCKING_KINDS = new Set(["duplicate", "likely"]);

// Cheap length check before an edit-distance comparison: two strings can only reach
// `minSim` if their lengths are close enough.
const lengthsAllow = (a, b, minSim) => {
  const la = [...a].length;
  const lb = [...b].length;
  return Math.min(la, lb) / Math.max(la, lb) >= minSim;
};

/**
 * How `existing` relates to `candidate`, or null if it doesn't.
 * @returns {{ kind: string, reason: string, score: number } | null}
 */
export function classify(candidate, existing, { alternates = [] } = {}) {
  if (!candidate.baseKey || !existing.baseKey) return null;
  // Comparing authors is the costly part, so it only happens once a title looks related.
  let authorResult;
  const authors = () => (authorResult ??= compareAuthors(candidate, existing));
  const generic = isGeneric(candidate);

  if (candidate.baseKey === existing.baseKey) {
    if (candidate.volume === existing.volume) {
      if (authors() === "different") {
        return generic ? null : { kind: "same-title", reason: "Same title, different author", score: 1 };
      }
      if (authors() === "unknown" && generic) {
        return { kind: "same-title", reason: "A book with this title is already in the library", score: 1 };
      }
      return {
        kind: "duplicate",
        reason: authors() === "same" ? "Same title and author" : "Same title",
        score: 1,
      };
    }
    if (authors() === "different") return null;
    if (candidate.volume !== null && existing.volume !== null) {
      return { kind: "series", reason: `Another volume of the same series (volume ${existing.volume})`, score: 0.9 };
    }
    return { kind: "series-unknown", reason: "Same title, but only one of them has a volume number", score: 0.95 };
  }

  // Typos or an added subtitle, by the same author.
  if (!generic && candidate.script === existing.script && !numbersDiffer(candidate, existing)) {
    const sim = lengthsAllow(candidate.baseKey, existing.baseKey, 0.85) ? similarity(candidate.baseKey, existing.baseKey) : 0;
    if ((sim >= 0.85 || containsTitle(candidate, existing)) && authors() === "same") {
      if (candidate.volume !== null && existing.volume !== null && candidate.volume !== existing.volume) {
        return { kind: "series", reason: `Another volume of a similar series (volume ${existing.volume})`, score: sim };
      }
      return {
        kind: "likely",
        reason: sim >= 0.85 ? "Very similar title, same author" : "Same title with extra words, same author",
        score: sim,
      };
    }
  }

  // Bangla vs English spelling of the same title.
  if (
    candidate.script !== existing.script &&
    candidate.script !== "other" &&
    existing.script !== "other" &&
    !numbersDiffer(candidate, existing)
  ) {
    const kc = crossKey(candidate, "title");
    const ke = crossKey(existing, "title");
    if (kc.length >= 3 && ke.length >= 3 && lengthsAllow(kc, ke, 0.7)) {
      const sim = similarity(kc, ke);
      if (sim >= 0.8 && authors() !== "different") {
        return { kind: "other-script", reason: "Looks like the same title in the other script", score: sim };
      }
    }
  }

  // Alternate titles from the photo scan (translations / transliterations).
  for (const alt of alternates) {
    const match =
      alt.baseKey === existing.baseKey ||
      (lengthsAllow(alt.baseKey, existing.baseKey, 0.9) && similarity(alt.baseKey, existing.baseKey) >= 0.9);
    if (match && authors() !== "different") return { kind: "other-script", reason: "Known by another title", score: 0.85 };
  }
  return null;
}

const titleOrder = new Intl.Collator("bn", { numeric: true });

// Library titles are analysed once and reused: the check runs on every pause in typing.
const analyzeCache = new Map();
const MAX_CACHE = 20_000;
const analyzeCached = (name, author) => {
  const key = `${name}\u0000${author ?? ""}`;
  let info = analyzeCache.get(key);
  if (!info) {
    if (analyzeCache.size >= MAX_CACHE) analyzeCache.clear();
    info = analyze(name, author);
    analyzeCache.set(key, info);
  }
  return info;
};

/**
 * Possible duplicates of { name, author } among `books`, best first.
 * @param {{ name: string, author?: string, alternates?: string[], excludeId?: string }} input
 * @param {{ _id: unknown, name: string, author: string }[]} books
 */
export function findDuplicates({ name, author = "", alternates = [], excludeId = null }, books, limit = 5) {
  const candidate = analyze(name, author);
  if ([...candidate.words.join("")].length < 2) return [];
  const alts = alternates.map((t) => analyze(t, author)).filter((a) => a.baseKey && a.baseKey !== candidate.baseKey);

  const matches = [];
  for (const book of books) {
    if (excludeId && String(book._id) === String(excludeId)) continue;
    const match = classify(candidate, analyzeCached(book.name, book.author), { alternates: alts });
    if (match) matches.push({ book, ...match });
  }
  return matches
    .sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        b.score - a.score ||
        titleOrder.compare(a.book.name, b.book.name) // volumes in order: ১, ২, ৩
    )
    .slice(0, limit);
}
