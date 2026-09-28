import { useEffect, useState } from "react";
import { fetchMeta } from "../services/api";

const EMPTY_META = { totalBooks: 0, genres: [], authors: [], publishers: [] };

// Library totals, genres with counts, authors and publishers. Pass a changing
// `reloadKey` to refetch (e.g. after a delete).
export default function useLibraryMeta(reloadKey = 0) {
  const [meta, setMeta] = useState(EMPTY_META);

  useEffect(() => {
    let cancelled = false;
    fetchMeta()
      .then(({ data }) => {
        if (!cancelled) setMeta(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return meta;
}
