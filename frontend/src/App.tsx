// // frontend/src/App.tsx
// import { useState, useEffect, useCallback } from 'react';

// const API_BASE = 'http://localhost:3000';

// interface SearchResult {
//   url: string;
//   title: string;
//   snippet: string;
//   score: number;
// }

// interface SearchResponse {
//   query: string;
//   results: SearchResult[];
//   totalResults: number;
//   page: number;
//   totalPages: number;
//   timeTaken: number;
//   algorithm: string;
//   cached: boolean;
// }

// function App() {
//   const [query, setQuery] = useState('');
//   const [results, setResults] = useState<SearchResponse | null>(null);
//   const [suggestions, setSuggestions] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [page, setPage] = useState(1);
//   const [showSuggestions, setShowSuggestions] = useState(false);

//   // Debounced autocomplete
//   useEffect(() => {
//     if (query.length < 2) {
//       setSuggestions([]);
//       return;
//     }

//     const timer = setTimeout(async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE}/autocomplete?q=${encodeURIComponent(query)}`
//         );
//         const data = await res.json();
//         setSuggestions(data.suggestions || []);
//         setShowSuggestions(true);
//       } catch {
//         setSuggestions([]);
//       }
//     }, 200);

//     return () => clearTimeout(timer);
//   }, [query]);

//   const search = useCallback(async (searchQuery: string, searchPage: number = 1) => {
//     if (!searchQuery.trim()) return;

//     setLoading(true);
//     setShowSuggestions(false);

//     try {
//       const res = await fetch(
//         `${API_BASE}/search?q=${encodeURIComponent(searchQuery)}&page=${searchPage}&limit=10`
//       );
//       const data: SearchResponse = await res.json();
//       setResults(data);
//       setPage(searchPage);
//     } catch (error) {
//       console.error('Search failed:', error);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     search(query, 1);
//   };

//   return (
//     <div style={{
//       maxWidth: '800px',
//       margin: '0 auto',
//       padding: '40px 20px',
//       fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
//     }}>
//       {/* Header */}
//       <h1 style={{
//         textAlign: 'center',
//         fontSize: '48px',
//         marginBottom: '30px',
//         background: 'linear-gradient(135deg, #4285f4, #ea4335, #fbbc05, #34a853)',
//         WebkitBackgroundClip: 'text',
//         WebkitTextFillColor: 'transparent',
//       }}>
//         MiniSearch
//       </h1>

//       {/* Search Bar */}
//       <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
//         <div style={{
//           display: 'flex',
//           border: '2px solid #ddd',
//           borderRadius: '24px',
//           overflow: 'hidden',
//           boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
//         }}>
//           <input
//             type="text"
//             value={query}
//             onChange={(e) => setQuery(e.target.value)}
//             onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
//             placeholder="Search the web..."
//             style={{
//               flex: 1,
//               padding: '14px 24px',
//               fontSize: '16px',
//               border: 'none',
//               outline: 'none',
//             }}
//           />
//           <button
//             type="submit"
//             disabled={loading}
//             style={{
//               padding: '14px 28px',
//               background: '#4285f4',
//               color: 'white',
//               border: 'none',
//               cursor: 'pointer',
//               fontSize: '16px',
//               fontWeight: 'bold',
//             }}
//           >
//             {loading ? '...' : '🔍'}
//           </button>
//         </div>

//         {/* Autocomplete Dropdown */}
//         {showSuggestions && suggestions.length > 0 && (
//           <div style={{
//             position: 'absolute',
//             top: '100%',
//             left: 0,
//             right: 0,
//             background: 'white',
//             border: '1px solid #ddd',
//             borderRadius: '8px',
//             marginTop: '4px',
//             boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
//             zIndex: 10,
//           }}>
//             {suggestions.map((suggestion, i) => (
//               <div
//                 key={i}
//                 onClick={() => {
//                   setQuery(suggestion);
//                   setShowSuggestions(false);
//                   search(suggestion, 1);
//                 }}
//                 style={{
//                   padding: '10px 20px',
//                   cursor: 'pointer',
//                   borderBottom: i < suggestions.length - 1 ? '1px solid #eee' : 'none',
//                 }}
//                 onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
//                 onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
//               >
//                 🔍 {suggestion}
//               </div>
//             ))}
//           </div>
//         )}
//       </form>

//       {/* Results */}
//       {results && (
//         <div style={{ marginTop: '30px' }}>
//           {/* Stats bar */}
//           <div style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
//             About {results.totalResults} results ({results.timeTaken}ms)
//             {results.cached && ' • cached'}
//             {' • '}{results.algorithm.toUpperCase()}
//           </div>

//           {/* Result cards */}
//           {results.results.map((result, i) => (
//             <div key={i} style={{ marginBottom: '24px' }}>
//               <div style={{ fontSize: '12px', color: '#006621' }}>
//                 {result.url}
//               </div>
//               <a
//                 href={result.url}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 style={{
//                   fontSize: '20px',
//                   color: '#1a0dab',
//                   textDecoration: 'none',
//                   lineHeight: '1.3',
//                 }}
//               >
//                 {result.title}
//               </a>
//               <div
//                 style={{ fontSize: '14px', color: '#545454', marginTop: '4px', lineHeight: '1.5' }}
//                 dangerouslySetInnerHTML={{ __html: result.snippet }}
//               />
//               <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
//                 Score: {result.score}
//               </div>
//             </div>
//           ))}

//           {/* No results */}
//           {results.results.length === 0 && (
//             <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
//               No results found for "{results.query}"
//             </div>
//           )}

//           {/* Pagination */}
//           {results.totalPages > 1 && (
//             <div style={{
//               display: 'flex',
//               justifyContent: 'center',
//               gap: '8px',
//               marginTop: '30px',
//             }}>
//               {page > 1 && (
//                 <button
//                   onClick={() => search(query, page - 1)}
//                   style={paginationButtonStyle}
//                 >
//                   ← Previous
//                 </button>
//               )}

//               {Array.from({ length: Math.min(results.totalPages, 10) }, (_, i) => i + 1).map(p => (
//                 <button
//                   key={p}
//                   onClick={() => search(query, p)}
//                   style={{
//                     ...paginationButtonStyle,
//                     background: p === page ? '#4285f4' : 'white',
//                     color: p === page ? 'white' : '#4285f4',
//                   }}
//                 >
//                   {p}
//                 </button>
//               ))}

//               {page < results.totalPages && (
//                 <button
//                   onClick={() => search(query, page + 1)}
//                   style={paginationButtonStyle}
//                 >
//                   Next →
//                 </button>
//               )}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// const paginationButtonStyle: React.CSSProperties = {
//   padding: '8px 16px',
//   border: '1px solid #4285f4',
//   borderRadius: '4px',
//   background: 'white',
//   color: '#4285f4',
//   cursor: 'pointer',
//   fontSize: '14px',
// };
import { useState } from 'react';
import { useSearch } from './hooks/useSearch';
import { useAutocomplete } from './hooks/useAutocomplete';
import SearchBar from './components/SearchBar';
import ResultsList from './components/ResultsList';
import './App.css';

export default function App() {
  const [query, setQuery] = useState('');

  const { results, loading, page, search } = useSearch();
  const { suggestions, showSuggestions, setShowSuggestions } = useAutocomplete(query);

  const handleSubmit = () => {
    setShowSuggestions(false);
    search(query, 1);
  };

  const handleSuggestionSelect = (value: string) => {
    setQuery(value);
    setShowSuggestions(false);
    search(value, 1);
  };

  return (
    <main className="app-shell">
      <div className="bg-grid" />
      <div className="bg-radial" />

      <section className="app-container">
        <header className="hero">
          <div className="hero__badge">Search Infrastructure</div>
          <h1 className="hero__title">MiniSearch</h1>
          <p className="hero__subtitle">
            Fast retrieval with relevance scoring, autocomplete, and pagination.
          </p>
        </header>

        <div className="panel panel--search">
          <SearchBar
            query={query}
            loading={loading}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            onQueryChange={setQuery}
            onSubmit={handleSubmit}
            onSuggestionSelect={handleSuggestionSelect}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
        </div>

        {results && (
          <div className="panel panel--results">
            <ResultsList
              results={results}
              page={page}
              query={query}
              onPageChange={(nextPage) => {
                setShowSuggestions(false);
                search(query, nextPage);
              }}
            />
          </div>
        )}
      </section>
    </main>
  );
}