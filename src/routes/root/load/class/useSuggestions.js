import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFetcher } from "react-router";

import { normalizeId } from "./studentIdUtils";

const MAX_SUGGESTIONS = 5;
const MIN_OVERLAY_WIDTH = 256;

function getPosition(anchor) {
  const rect = anchor.getBoundingClientRect();
  const width = Math.max(rect.width, MIN_OVERLAY_WIDTH);
  const maxLeft = Math.max(8, window.innerWidth - width - 8);

  return {
    left: Math.min(Math.max(8, rect.left), maxLeft),
    top: rect.bottom + 4,
    width,
  };
}

export default function useSuggestions({
  anchorRef,
  endpoint,
  query,
  onSelect,
}) {
  const { data, load, state } = useFetcher();
  const overlayRef = useRef(null);
  const autoSelectedRef = useRef("");
  const [position, setPosition] = useState(null);
  const [results, setResults] = useState([]);
  const [resultQuery, setResultQuery] = useState("");
  const normalizedQuery = normalizeId(query);
  const deferredQuery = useDeferredValue(normalizedQuery);
  const hasQuery = /\d/.test(normalizedQuery);

  const close = useCallback(() => setPosition(null), []);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || !hasQuery) {
      setPosition(null);
      return;
    }

    setPosition(getPosition(anchor));
  }, [anchorRef, hasQuery, normalizedQuery]);

  useEffect(() => {
    if (!deferredQuery || !/\d/.test(deferredQuery)) {
      return;
    }

    const params = new URLSearchParams({
      id: deferredQuery,
      page: "1",
      limit: String(MAX_SUGGESTIONS),
    });
    load(`${endpoint}?${params}`);
  }, [deferredQuery, endpoint, load]);

  useEffect(() => {
    const responseQuery = query;
    if (responseQuery !== deferredQuery || !Array.isArray(data?.rows)) {
      autoSelectedRef.current = "";
      return;
    }

    const nextResults = data.rows.slice(0, MAX_SUGGESTIONS);
    setResults(nextResults);
    setResultQuery(responseQuery);

    const exactMatch =
      nextResults.length === 1 &&
      normalizeId(nextResults[0].id) === normalizeId(responseQuery);
    const signature = exactMatch
      ? `${responseQuery}:\0${nextResults[0].id}`
      : "";

    if (exactMatch && autoSelectedRef.current !== signature) {
      autoSelectedRef.current = signature;
      onSelect(nextResults[0]);
      close();
    }
  }, [close, data, deferredQuery, onSelect]);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!position || !anchor) {
      return;
    }

    function reposition() {
      if (anchor.isConnected) {
        setPosition(getPosition(anchor));
      } else {
        close();
      }
    }

    function closeFromOutside(event) {
      const outsideAnchor = !anchor.contains(event.target);
      const outsideOverlay = !overlayRef.current?.contains(event.target);
      if (outsideAnchor && outsideOverlay) {
        close();
      }
    }

    function closeFromKeyboard(event) {
      if (event.key === "Escape") {
        close();
        anchor.querySelector("input")?.focus();
      }
    }

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("focusin", closeFromOutside);
    document.addEventListener("keydown", closeFromKeyboard);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("focusin", closeFromOutside);
      document.removeEventListener("keydown", closeFromKeyboard);
    };
  }, [anchorRef, close, position]);

  const isPending =
    normalizedQuery !== deferredQuery ||
    state !== "idle" ||
    resultQuery !== normalizedQuery;

  return {
    close,
    isPending,
    overlayRef,
    position,
    results,
    visible: Boolean(position && hasQuery && results.length > 0),
  };
}
