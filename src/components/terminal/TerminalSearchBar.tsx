import { useState, useRef, useEffect } from "react";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TerminalSearchBarProps {
  onSearch: (query: string, direction: "next" | "prev") => void;
  onClose: () => void;
}

export function TerminalSearchBar({ onSearch, onClose }: TerminalSearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch(query, e.shiftKey ? "prev" : "next");
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="absolute top-2 right-4 z-[100] flex items-center gap-1 bg-card border rounded-md px-2 py-1 shadow-md">
      <Search size={14} className="text-muted-foreground flex-shrink-0" />
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value) onSearch(e.target.value, "next");
        }}
        onKeyDown={handleKeyDown}
        placeholder="Find..."
        className="w-40 bg-transparent border-none shadow-none p-0 h-7 text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onSearch(query, "prev")}
        title="Previous"
        className="h-6 w-6 p-0"
      >
        <ChevronUp size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onSearch(query, "next")}
        title="Next"
        className="h-6 w-6 p-0"
      >
        <ChevronDown size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        title="Close"
        className="h-6 w-6 p-0"
      >
        <X size={14} />
      </Button>
    </div>
  );
}
