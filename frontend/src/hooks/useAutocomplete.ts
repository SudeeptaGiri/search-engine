import { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:3000';

export function useAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/autocomplete?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        const next = data.suggestions || [];
        setSuggestions(next);
        setShowSuggestions(next.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return {
    suggestions,
    showSuggestions,
    setShowSuggestions,
    setSuggestions,
  };
}