"use client";

import { useEffect, useId, useRef, useState } from "react";
import { filterOptions } from "@/lib/case-form";

interface Props {
  label: string;
  options: Record<string, string>;
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

/**
 * Searchable multi-select: selected values show as removable chips, the input
 * filters the remaining options. Keyboard: type to filter, ArrowUp/ArrowDown to
 * move, Enter to pick (never submits the surrounding form), Escape to close,
 * Backspace on an empty input removes the last chip.
 */
export default function MultiSelect({ label, options, selected, onChange, placeholder }: Props) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = filterOptions(options, selected, query);
  const activeIndex = Math.min(active, Math.max(matches.length - 1, 0));

  useEffect(() => {
    function onDocumentMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

  function add(value: string) {
    onChange([...selected, value]);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  }

  function remove(value: string) {
    onChange(selected.filter((v) => v !== value));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      // Enter must never submit the case form from here.
      e.preventDefault();
      if (open && matches[activeIndex]) add(matches[activeIndex][0]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && query === "" && selected.length > 0) {
      remove(selected[selected.length - 1]);
    }
  }

  return (
    <div ref={rootRef}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium mb-1.5"
        style={{ color: "var(--color-text-primary)" }}
      >
        {label}
      </label>

      <div
        className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-lg"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border-strong)",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 text-xs rounded-md font-medium"
            style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
          >
            {options[value] ?? value}
            <button
              type="button"
              onClick={() => remove(value)}
              aria-label={`Fjern ${options[value] ?? value}`}
              className="px-1 rounded"
              style={{ color: "var(--color-accent)" }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[activeIndex] ? `${listId}-${matches[activeIndex][0]}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={selected.length === 0 ? (placeholder ?? "Skriv for å søke …") : ""}
          autoComplete="off"
          className="flex-1 min-w-[8rem] px-1 py-1 text-sm outline-none bg-transparent"
          style={{ color: "var(--color-text-primary)" }}
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="mt-1 max-h-56 overflow-auto rounded-lg py-1 text-sm"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
          }}
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2" style={{ color: "var(--color-text-muted)" }}>
              Ingen treff
            </li>
          ) : (
            matches.map(([value, text], i) => (
              <li
                key={value}
                id={`${listId}-${value}`}
                role="option"
                aria-selected={i === activeIndex}
                // mousedown (not click) so the input keeps focus and the list doesn't close first
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(value);
                }}
                onMouseEnter={() => setActive(i)}
                className="px-3 py-1.5 cursor-pointer"
                style={{
                  backgroundColor: i === activeIndex ? "var(--color-accent-soft)" : "transparent",
                  color: "var(--color-text-primary)",
                }}
              >
                {text}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
