import { useEffect, useState } from "react";
import { findDuplicates } from "../services/api";

const DELAY_MS = 400;
// Kinds that mean "this is probably a book you already have": saving asks for confirmation.
export const BLOCKING_KINDS = new Set(["duplicate", "likely"]);

/**
 * Looks for books already in the library that match the title/author being entered.
 * Waits for a pause in typing, and ignores answers to out-of-date questions.
 */
export default function useDuplicateCheck({ name, author, alternates, excludeId }) {
  const [matches, setMatches] = useState([]);
  const [checking, setChecking] = useState(false);
  const altKey = (alternates ?? []).join("\u0000");

  useEffect(() => {
    const title = name.trim();
    if ([...title].length < 2) {
      setMatches([]);
      setChecking(false);
      return;
    }
    const controller = new AbortController();
    setChecking(true);
    const timer = setTimeout(() => {
      findDuplicates(
        { name: title, author: author.trim(), alternates: altKey ? altKey.split("\u0000") : [], excludeId },
        { signal: controller.signal }
      )
        .then(({ data }) => {
          setMatches(data.matches);
          setChecking(false);
        })
        .catch((err) => {
          if (err.code !== "ERR_CANCELED") setChecking(false);
        });
    }, DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name, author, altKey, excludeId]);

  return { matches, checking, blocking: matches.filter((m) => BLOCKING_KINDS.has(m.kind)) };
}
