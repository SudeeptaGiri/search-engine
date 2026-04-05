import Autocomplete from './Autocomplete';

interface SearchBarProps {
  query: string;
  loading: boolean;
  suggestions: string[];
  showSuggestions: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestionSelect: (value: string) => void;
  onFocus: () => void;
}

export default function SearchBar({
  query,
  loading,
  suggestions,
  showSuggestions,
  onQueryChange,
  onSubmit,
  onSuggestionSelect,
  onFocus,
}: SearchBarProps) {
  return (
    <form
      className="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="search__bar">
        <div className="search__icon" aria-hidden>
          ⌕
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={onFocus}
          placeholder="Search domains, documents, and signals..."
          className="search__input"
        />
        <button type="submit" disabled={loading} className="btn btn--primary">
          {loading ? 'Searching' : 'Search'}
        </button>
      </div>

      <Autocomplete
        suggestions={suggestions}
        visible={showSuggestions}
        onSelect={onSuggestionSelect}
      />
    </form>
  );
}