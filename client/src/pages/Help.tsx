import { useState, useEffect } from 'react';
import { Search, BookOpen, Package, ShoppingCart, Users, BarChart3, DollarSign } from 'lucide-react';

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');

  // Clear search when component mounts
  useEffect(() => {
    setSearchQuery('');
  }, []);

  const sections = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: BarChart3,
      description: 'Your command center for real-time business insights',
      topics: [
        'Customizing data cards',
        'Understanding key metrics',
        'Drill-down navigation'
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      icon: Package,
      description: 'Track batches, locations, and stock levels',
      topics: [
        'Creating and managing batches',
        'Location hierarchy (Site → Zone → Rack → Shelf → Bin)',
        'Batch lifecycle and status management',
        'COGS tracking (Fixed vs Range)',
        'Profitability analysis',
        'Price simulation tool'
      ]
    },
    {
      id: 'orders',
      title: 'Orders & Fulfillment',
      icon: ShoppingCart,
      description: 'From quote to delivery',
      topics: [
        'Creating orders and quotes',
        'Fulfillment workflow (PENDING → PACKED → SHIPPED)',
        'Processing returns',
        'Order status history'
      ]
    },
    {
      id: 'clients',
      title: 'Client Management',
      icon: Users,
      description: 'Build strong customer relationships',
      topics: [
        'Managing client profiles',
        'Communication logging',
        'Tracking client needs',
        'Viewing order history'
      ]
    },
    {
      id: 'profitability',
      title: 'Profitability Analysis',
      icon: DollarSign,
      description: 'Understand your margins and ROI',
      topics: [
        'Batch profitability metrics',
        'Margin vs markup calculations',
        'Price simulation',
        'Top performers report'
      ]
    }
  ];

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">TERP Help Center</h1>
          </div>
          <p className="text-lg text-gray-600">
            Learn how to use TERP's powerful features to manage your business
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help topics..."
              aria-label="Search help topics"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {section.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{section.description}</p>
                    <ul className="space-y-2">
                      {section.topics.map((topic, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span className="text-sm text-gray-700">{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {filteredSections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No help topics found for "{searchQuery}"
            </p>
            <p className="text-gray-400 mt-2">
              Try searching for something else or browse all topics above
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Need More Help?
            </h3>
            <p className="text-gray-700">
              Can't find what you're looking for? Contact your system administrator
              or check the complete training guide for detailed walkthroughs with screenshots.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

