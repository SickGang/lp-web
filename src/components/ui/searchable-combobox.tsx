import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  placeholder?: string;
  options: ComboboxOption[];
  value: string;
  selectedLabel?: string;
  onChange: (value: string, label: string) => void;
  /** Серверный поиск: без локальной фильтрации, вызывается при вводе */
  onSearchChange?: (query: string) => void;
  disabled?: boolean;
  emptyText?: string;
  maxVisible?: number;
};

export function SearchableCombobox({
  label,
  placeholder = "Начните вводить...",
  options,
  value,
  selectedLabel,
  onChange,
  onSearchChange,
  disabled = false,
  emptyText = "Ничего не найдено",
  maxVisible = 80,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const displayValue = open ? query : (selectedLabel ?? "");

  const filtered = onSearchChange
    ? options
    : options.filter((o) =>
        o.label.toLowerCase().includes(query.trim().toLowerCase()),
      );
  const visible = filtered.slice(0, maxVisible);
  const hasMore = filtered.length > maxVisible;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlightIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (opt: ComboboxOption) => {
    onChange(opt.value, opt.label);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlightIndex((i) => Math.min(i + 1, visible.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && open && visible[highlightIndex]) {
      e.preventDefault();
      pick(visible[highlightIndex]);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-sm text-muted-foreground">{label}</label>
      <div
        className={cn(
          "flex items-center rounded-md border border-input bg-background transition-colors",
          open && "border-[#D9E57F]/60 ring-1 ring-[#D9E57F]/30",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={displayValue}
          placeholder={value ? undefined : placeholder}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          onFocus={() => !disabled && setOpen(true)}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            onSearchChange?.(next);
            if (value) {
              onChange("", "");
            }
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          className="px-3 text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          aria-label="Открыть список"
        >
          <ChevronDown
            size={16}
            strokeWidth={2}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-xl"
        >
          {visible.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>
          ) : (
            visible.map((opt, index) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm text-foreground transition-colors",
                  index === highlightIndex && "bg-[#D9E57F]/15 text-foreground",
                  opt.value === value && "text-[#9ab84a]",
                )}
                onMouseEnter={() => setHighlightIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(opt);
                }}
              >
                {opt.label}
              </li>
            ))
          )}
          {hasMore && (
            <li className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              Показано {maxVisible} из {filtered.length}. Уточните поиск.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
