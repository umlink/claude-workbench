import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { searchSessions, type SearchResult } from "../../lib/tauri";
import { useSessionStore } from "../../state/sessionStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchPanelProps {
  onClose?: () => void;
}

export function SearchPanel(_props: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { openTab } = useSessionStore();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await searchSessions(query);
      setResults(res);
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 bg-card border rounded-md px-2.5 py-1.5">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search sessions..."
            className="flex-1 bg-transparent border-none shadow-none p-0 h-auto text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQuery("")}
              className="h-6 w-6 p-0"
            >
              <X size={12} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {isSearching && (
          <div className="text-center py-5 text-muted-foreground text-sm">
            Searching...
          </div>
        )}

        {!isSearching && results.length === 0 && query && (
          <div className="text-center py-5 text-muted-foreground text-sm">
            No results found
          </div>
        )}

        {results.map((result, i) => (
          <div
            key={i}
            className="py-2.5 px-3 border-b cursor-pointer hover:bg-accent"
            onClick={() => {
              openTab(result.session_id);
            }}
          >
            <div className="text-sm font-medium text-foreground mb-1">
              {result.session_name}
            </div>
            <div
              className="text-xs text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: result.snippet.replace(/>>>/g, '<span style="color:hsl(var(--primary));font-weight:600">').replace(/<<</g, "</span>"),
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
