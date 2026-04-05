interface AutocompleteProps {
  suggestions: string[];
  visible: boolean;
  onSelect: (value: string) => void;
}

export default function Autocomplete({ suggestions, visible, onSelect }: AutocompleteProps) {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div className="autocomplete">
      {suggestions.map((suggestion, i) => (
        <button
          key={`${suggestion}-${i}`}
          type="button"
          className="autocomplete__item"
          onClick={() => onSelect(suggestion)}
        >
          <span className="autocomplete__icon">⌕</span>
          <span>{suggestion}</span>
        </button>
      ))}
    </div>
  );
}