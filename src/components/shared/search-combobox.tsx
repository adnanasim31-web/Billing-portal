"use client";

import * as React from "react";
import { Check, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchComboboxProps {
  value: string;
  onChange: (value: string, option?: ComboboxOption) => void;
  fetchOptions: (query: string) => Promise<ComboboxOption[]>;
  placeholder?: string;
  initialLabel?: string;
}

/** Lightweight type-ahead search select - fetches options from the server as the user types. */
export function SearchCombobox({
  value,
  onChange,
  fetchOptions,
  placeholder = "Search...",
  initialLabel,
}: SearchComboboxProps) {
  const [query, setQuery] = React.useState(initialLabel ?? "");
  const [options, setOptions] = React.useState<ComboboxOption[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const runSearch = useDebouncedCallback(async (term: string) => {
    setIsLoading(true);
    try {
      const results = await fetchOptions(term);
      setOptions(results);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={placeholder}
          value={query}
          onFocus={() => {
            setIsOpen(true);
            runSearch(query);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            runSearch(e.target.value);
          }}
        />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-elevated">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : options.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No results</p>
          ) : (
            <ul>
              {options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-secondary",
                      value === option.value && "bg-secondary"
                    )}
                    onClick={() => {
                      onChange(option.value, option);
                      setQuery(option.label);
                      setIsOpen(false);
                    }}
                  >
                    <span>
                      {option.label}
                      {option.sublabel && (
                        <span className="ml-1.5 text-xs text-muted-foreground">{option.sublabel}</span>
                      )}
                    </span>
                    {value === option.value && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
