import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, classify, findDuplicates, splitVolume, tokens } from "../services/duplicateFinder.js";

// Kind of the best match for `name/author` against a single existing book, or null.
const kindOf = (name, author, existingName, existingAuthor, options = {}) => {
  const books = [{ _id: "x", name: existingName, author: existingAuthor }];
  return findDuplicates({ name, author, ...options }, books)[0]?.kind ?? null;
};

test("exact title and author, ignoring case, spaces and initials punctuation", () => {
  assert.equal(kindOf("The Hobbit", "J.R.R. Tolkien", "the hobbit ", "J. R. R. Tolkien"), "duplicate");
});

test("leading English article is ignored", () => {
  assert.equal(kindOf("Hobbit", "Tolkien", "The Hobbit", "J.R.R. Tolkien"), "duplicate");
});

test("composed and decomposed য় are the same", () => {
  const composed = "নয়া দিগন্ত"; // নয়া দিগন্ত with য় as one code point
  const decomposed = "নয়া দিগন্ত"; // য + ় (nukta)
  assert.equal(kindOf(composed, "", decomposed, ""), "duplicate");
});

test("Bangla vowel-length variants in the author fold together", () => {
  assert.equal(kindOf("হিমু", "হুমায়ুন আহমেদ", "হিমু", "হুমায়ূন আহমেদ"), "duplicate");
});

test("spaces inside a Bangla title don't matter", () => {
  assert.equal(kindOf("কপোট্রনিক সুখদুঃখ", "মুহম্মদ জাফর ইকবাল", "কপোট্রনিক সুখ দুঃখ", "মুহম্মদ জাফর ইকবাল"), "duplicate");
});

test("subtitle added, same author -> likely", () => {
  assert.equal(kindOf("নন্দিত নরকে: উপন্যাস", "হুমায়ূন আহমেদ", "নন্দিত নরকে", "হুমায়ূন আহমেদ"), "likely");
});

test("typo in the title, same author -> likely", () => {
  assert.equal(kindOf("Pride and Prejudise", "Jane Austen", "Pride and Prejudice", "Jane Austen"), "likely");
});

test("different volumes of a series are not duplicates", () => {
  assert.equal(kindOf("মিসির আলি সমগ্র ২", "হুমায়ূন আহমেদ", "মিসির আলি সমগ্র ১", "হুমায়ূন আহমেদ"), "series");
});

test("same volume written differently is a duplicate", () => {
  assert.equal(kindOf("Harry Potter Part II", "J.K. Rowling", "Harry Potter Vol. 2", "J.K. Rowling"), "duplicate");
  assert.equal(kindOf("শরৎ রচনাবলী দ্বিতীয় খণ্ড", "শরৎচন্দ্র", "শরৎ রচনাবলী খণ্ড ২", "শরৎচন্দ্র"), "duplicate");
  assert.equal(kindOf("শরৎ রচনাবলী ২য় খণ্ড", "শরৎচন্দ্র", "শরৎ রচনাবলী খণ্ড ২", "শরৎচন্দ্র"), "duplicate");
});

test("one with a volume number, one without -> series-unknown", () => {
  assert.equal(kindOf("ফেলুদা সমগ্র", "সত্যজিৎ রায়", "ফেলুদা সমগ্র ১", "সত্যজিৎ রায়"), "series-unknown");
});

test("Bangla title vs its English transliteration -> other-script", () => {
  assert.equal(
    kindOf("Pather Panchali", "Bibhutibhushan Bandyopadhyay", "পথের পাঁচালী", "বিভূতিভূষণ বন্দ্যোপাধ্যায়"),
    "other-script"
  );
  assert.equal(kindOf("Gitanjali", "Rabindranath Tagore", "গীতাঞ্জলি", "রবীন্দ্রনাথ ঠাকুর"), "other-script");
});

test("same title, different author -> same-title note", () => {
  assert.equal(kindOf("গল্পের ঝুড়ি", "লেখক এক", "গল্পের ঝুড়ি", "অন্য কেউ"), "same-title");
});

test("generic one-word title by a different author is not flagged", () => {
  assert.equal(kindOf("কবিতা", "জীবনানন্দ দাশ", "কবিতা", "শামসুর রাহমান"), null);
});

test("alternate title from a scan matches a differently named book", () => {
  assert.equal(kindOf("Song Offerings", "Rabindranath Tagore", "গীতাঞ্জলি", "রবীন্দ্রনাথ ঠাকুর", { alternates: ["গীতাঞ্জলি"] }), "other-script");
});

test("a title containing another, same author -> likely (accepted false alarm)", () => {
  assert.equal(kindOf("Animal Farm and 1984", "George Orwell", "Animal Farm", "George Orwell"), "likely");
});

test("titles that differ only by a number are different books", () => {
  assert.equal(kindOf("Filler 52", "Filler Author", "Filler 51", "Filler Author"), null);
  assert.equal(kindOf("গণিত ৮ম শ্রেণি", "জাতীয় শিক্ষাক্রম বোর্ড", "গণিত ৭ম শ্রেণি", "জাতীয় শিক্ষাক্রম বোর্ড"), null);
  assert.equal(kindOf("Class 8 Mathematics", "NCTB", "Class 7 Mathematics", "NCTB"), null);
});

test("unrelated books are not flagged", () => {
  assert.equal(kindOf("The Hobbit", "J.R.R. Tolkien", "Dune", "Frank Herbert"), null);
  assert.equal(kindOf("নন্দিত নরকে", "হুমায়ূন আহমেদ", "শঙ্খনীল কারাগার", "হুমায়ূন আহমেদ"), null);
  assert.equal(kindOf("1984", "George Orwell", "Animal Farm", "George Orwell"), null);
});

test("a book is not matched against itself when editing", () => {
  const books = [{ _id: "a1", name: "Dune", author: "Frank Herbert" }];
  assert.deepEqual(findDuplicates({ name: "Dune", author: "Frank Herbert", excludeId: "a1" }, books), []);
});

test("too-short input is not checked", () => {
  assert.deepEqual(findDuplicates({ name: "a" }, [{ _id: "1", name: "a", author: "x" }]), []);
});

test("volume parsing", () => {
  assert.deepEqual(splitVolume(tokens("মিসির আলি সমগ্র ২")), { base: tokens("মিসির আলি সমগ্র"), volume: 2 });
  assert.equal(splitVolume(tokens("Harry Potter Part II")).volume, 2);
  assert.equal(splitVolume(tokens("ষষ্ঠ খণ্ড রচনাবলী")).volume, 6);
  assert.equal(splitVolume(tokens("৪র্থ খণ্ড রচনাবলী")).volume, 4);
  assert.equal(splitVolume(tokens("Animal Farm 1984")).volume, null); // a year, not a volume
  assert.equal(splitVolume(tokens("প্রথম আলো")).volume, null); // a real title
});

test("results are ordered most serious first", () => {
  const books = [
    { _id: "1", name: "মিসির আলি সমগ্র ১", author: "হুমায়ূন আহমেদ" },
    { _id: "2", name: "মিসির আলি সমগ্র ২", author: "হুমায়ূন আহমেদ" },
    { _id: "3", name: "মিসির আলি সমগ্র ৩", author: "হুমায়ূন আহমেদ" },
  ];
  const kinds = findDuplicates({ name: "মিসির আলি সমগ্র ২", author: "হুমায়ূন আহমেদ" }, books).map((m) => m.kind);
  assert.deepEqual(kinds, ["duplicate", "series", "series"]);
});

test("5,000 books: first check < 300 ms, later checks (while typing) < 50 ms", () => {
  const books = Array.from({ length: 5000 }, (_, i) => ({ _id: String(i), name: `বই নম্বর ${i} গল্প`, author: `লেখক ${i % 300}` }));
  books.push({ _id: "target", name: "পথের পাঁচালী", author: "বিভূতিভূষণ বন্দ্যোপাধ্যায়" });
  const time = (input) => {
    const start = performance.now();
    const matches = findDuplicates(input, books);
    return { ms: performance.now() - start, matches };
  };
  const first = time({ name: "Pather Panchali", author: "Bibhutibhushan Bandyopadhyay" });
  assert.equal(first.matches[0]?.book._id, "target");
  assert.ok(first.ms < 300, `first check took ${first.ms.toFixed(1)} ms`);
  const later = time({ name: "Pather Panchal", author: "Bibhutibhushan Bandyopadhyay" });
  assert.ok(later.ms < 50, `later check took ${later.ms.toFixed(1)} ms`);
});

test("analyze exposes base key and script", () => {
  const info = analyze("The Old Man and the Sea", "Ernest Hemingway");
  assert.equal(info.script, "en");
  assert.equal(info.volume, null);
  assert.ok(info.baseKey.startsWith("oldman"));
  assert.ok(classify(info, analyze("Old Man and the Sea", "Hemingway"))?.kind === "duplicate");
});
