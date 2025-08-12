import { notFound } from 'next/navigation';
import { getQuoteByToken } from '@/actions/quotes';
import SharedQuoteView from '@/components/quotes/SharedQuoteView';

interface SharedQuotePageProps {
  params: {
    token: string;
  };
}

export default async function SharedQuotePage({ params }: SharedQuotePageProps) {
  const quote = await getQuoteByToken(params.token);

  if (!quote) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <SharedQuoteView quote={quote} />
      </div>
    </div>
  );
}

