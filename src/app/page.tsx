export default function HomePage() {
  return (
    <div className="px-4 py-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to ERPv3</h1>
        <p className="text-xl text-gray-600 mb-8">
          Enterprise Resource Planning System
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
          <a href="/quotes" className="block p-6 bg-white rounded-lg border shadow-card hover:bg-gray-50 transition-colors">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Quotes</h2>
            <p className="text-gray-600">Manage sales quotes and convert to orders</p>
          </a>
          <a href="/inventory/cycle-count" className="block p-6 bg-white rounded-lg border shadow-card hover:bg-gray-50 transition-colors">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Inventory</h2>
            <p className="text-gray-600">Cycle counts, adjustments, and transfers</p>
          </a>
          <a href="/finance/dashboard" className="block p-6 bg-white rounded-lg border shadow-card hover:bg-gray-50 transition-colors">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Finance</h2>
            <p className="text-gray-600">AR/AP aging and payment processing</p>
          </a>
        </div>
      </div>
    </div>
  );
}
