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
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={`highlight-${index}-${part}`} className="bg-yellow-200 dark:bg-yellow-900 font-semibold">
            {part}
          </mark>
        ) : (
          <span key={`text-${index}-${part.substring(0, 10)}`}>{part}</span>
        )
      )}
    </>
  );
}

