/**
 * SearchHighlight Component
 * Highlights search query matches within text
 */

interface SearchHighlightProps {
  text: string;
  query: string;
}

export function SearchHighlight({ text, query }: SearchHighlightProps) {
  if (!query || !text) {
    return <>{text}</>;
  }

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  
  return (
    <>
      {parts.map((part, _index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={`highlight-${part}`} className="bg-yellow-200 dark:bg-yellow-900 font-semibold">
            {part}
          </mark>
        ) : (
          <span key={`text-${part.substring(0, 20)}`}>{part}</span>
        )
      )}
    </>
  );
}

