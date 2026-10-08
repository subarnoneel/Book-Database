import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

const normalize = (text) => text.normalize("NFC").toLowerCase().trim();

// Text input with a suggestion dropdown. The user can pick an existing value or type a
// new one. Replaces <datalist>, whose dropdown hides entries that don't match (or equal)
// the current text and so often looks empty.
// `inlineList` makes the suggestions push the content below down instead of floating over
// it, e.g. inside a dialog where a floating list would cover the dialog's buttons.
function Combobox({ id, value, onChange, options, placeholder, emptyText, className = "", inlineList = false, ...inputProps }) {
  const [open, setOpen] = useState(false);
  // What the list is filtered by: the typed text, or "" (show everything) when the
  // list is opened with the arrow button.
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const q = normalize(query);
  const matches = q ? options.filter((o) => normalize(o).includes(q)) : options;
  const isNewValue = value.trim() && !options.some((o) => normalize(o) === normalize(value));

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    listRef.current.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const openList = (withQuery) => {
    setQuery(withQuery);
    setActiveIndex(-1);
    setOpen(true);
  };

  const select = (option) => {
    onChange(option);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openList("");
      else setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && activeIndex >= 0 && matches[activeIndex]) {
      e.preventDefault();
      select(matches[activeIndex]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        {...inputProps}
        id={id}
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        className={`${className} pr-11`}
        onChange={(e) => {
          onChange(e.target.value);
          openList(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        // An inline list stays put when focus moves on, so clicking a button below it
        // doesn't shift the layout mid-click.
        onBlur={() => !inlineList && setOpen(false)}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? "Hide suggestions" : "Show suggestions"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          inputRef.current?.focus();
          if (open) setOpen(false);
          else openList("");
        }}
        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-paper-dark hover:text-ink"
      >
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`${inlineList ? "relative" : "absolute inset-x-0 top-full z-20 shadow-lift"} mt-1 animate-fade-in overflow-hidden rounded-lg border border-paper-line bg-white`}
        >
          {matches.length > 0 ? (
            <ul ref={listRef} id={listId} role="listbox" className="max-h-60 overflow-y-auto py-1">
              {matches.map((option, i) => {
                const selected = normalize(option) === normalize(value);
                return (
                  <li
                    key={option}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(option)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-[0.95rem] ${
                      i === activeIndex ? "bg-brand-50 text-brand-800" : "text-ink"
                    }`}
                  >
                    <span className="truncate">{option}</span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p id={listId} className="px-3.5 py-3 text-sm text-ink-muted">
              {options.length === 0
                ? emptyText
                : isNewValue
                  ? `No match. “${value.trim()}” will be saved as new.`
                  : "No matches."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Combobox;
