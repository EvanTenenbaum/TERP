import { notFound } from 'next/navigation';
import { getQuote } from '@/actions/quotes';
import QuoteDetails from '@/components/quotes/QuoteDetails';

interface QuotePageProps {
  params: {
    id: string;
  };
}

export default async function QuotePage({ params }: QuotePageProps) {
  const quoteResponse = await getQuote(params.id);

  if (!quoteResponse.success || !quoteResponse.quote) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <QuoteDetails quote={quoteResponse.quote} />
    </div>
  );
}

