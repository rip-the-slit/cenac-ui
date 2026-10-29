import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFetcher } from "react-router";

import { normalizeId } from "./classLoaderUtils";

const MAX_SUGGESTIONS = 5;
const MIN_OVERLAY_WIDTH = 256;
const EMPTY_PARAMS = {};

function hasIdQuery(value) {
  return /\d/.test(value);
}

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
  onClose,
  queryParam = "id",
  queryParams = EMPTY_PARAMS,
  idAttribute = "id",
  normalizeQuery = normalizeId,
  isQueryValid = hasIdQuery,
  autoSelectExactMatch = true,
}) {
  const { data, load, state } = useFetcher();
  const overlayRef = useRef(null);
  const autoSelectedRef = useRef("");
  const callbacksRef = useRef(null);
  callbacksRef.current = { onSelect, onClose };
  const [position, setPosition] = useState(null);
  const [results, setResults] = useState([]);
  const [resultQuery, setResultQuery] = useState("");
  const normalizedQuery = normalizeQuery(query);
  const deferredQuery = useDeferredValue(normalizedQuery);
  const hasQuery = isQueryValid(normalizedQuery);
  const params = new URLSearchParams(queryParams);
  params.set(queryParam, deferredQuery);
  params.set("page", "1");
  params.set("limit", String(MAX_SUGGESTIONS));
  const requestUrl = `${endpoint}?${params}`;

  const close = useCallback((reason = "dismiss") => {
    setPosition(null);
    callbacksRef.current.onClose?.(reason);
  }, []);

  const select = useCallback((record) => {
    callbacksRef.current.onSelect(record);
    anchorRef.current?.querySelector("input")?.focus();
    close("select");
  }, [anchorRef, close]);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || !hasQuery) {
      setPosition(null);
      return;
    }

    setPosition(getPosition(anchor));
  }, [anchorRef, hasQuery, normalizedQuery]);

  useEffect(() => {
    if (!isQueryValid(deferredQuery)) {
      return;
    }
    load(requestUrl);
  }, [deferredQuery, isQueryValid, load, requestUrl]);

  useEffect(() => {
    const responseQuery = data?.filters?.[queryParam] ?? deferredQuery;
    if (state !== "idle" || responseQuery !== deferredQuery || !Array.isArray(data?.rows)) {
      autoSelectedRef.current = "";
      return;
    }

    const nextResults = data.rows.slice(0, MAX_SUGGESTIONS);
    setResults(nextResults);
    setResultQuery(responseQuery);

    const exactMatch =
      nextResults.length === 1 &&
      autoSelectExactMatch &&
      normalizedQuery === deferredQuery &&
      normalizeQuery(nextResults[0][idAttribute]) === normalizedQuery;
    const signature = exactMatch
      ? `${responseQuery}:\0${nextResults[0][idAttribute]}`
      : "";

    if (exactMatch && autoSelectedRef.current !== signature) {
      autoSelectedRef.current = signature;
      select(nextResults[0]);
    }
  }, [autoSelectExactMatch, data, deferredQuery, idAttribute, normalizeQuery, normalizedQuery, queryParam, select, state]);

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
      if (!anchor.contains(document.activeElement) &&
          !overlayRef.current?.contains(document.activeElement)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        anchor.querySelector("input")?.focus();
        close();
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const options = Array.from(overlayRef.current?.querySelectorAll('[role="option"]') || []);
        if (!options.length) return;
        event.preventDefault();
        const index = options.indexOf(document.activeElement);
        const nextIndex = event.key === "ArrowDown"
          ? (index + 1) % options.length
          : (index <= 0 ? options.length - 1 : index - 1);
        options[nextIndex].focus();
      } else if (event.key === "Enter" && anchor.contains(event.target)) {
        const option = overlayRef.current?.querySelector('[role="option"]');
        if (option) {
          event.preventDefault();
          option.click();
        }
      }
    }

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("focusin", closeFromOutside);
    document.addEventListener("keydown", closeFromKeyboard, true);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("focusin", closeFromOutside);
      document.removeEventListener("keydown", closeFromKeyboard, true);
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
    select,
    visible: Boolean(position && hasQuery && results.length > 0),
  };
}
