import { useState, useEffect } from 'react';
import { Search, BookOpen, Package, ShoppingCart, Users, BarChart3, DollarSign, ChevronDown, ChevronUp, Download, FileText } from 'lucide-react';

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
      ],
      details: 'The Dashboard provides a comprehensive overview of your business with customizable data cards, real-time metrics, and quick access to important information. You can customize which cards appear, drill down into specific metrics, and track key performance indicators at a glance.'
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
      ],
      details: 'TERP\'s inventory system uses a batch-based approach with detailed location tracking. Each batch has its own lifecycle, cost tracking (COGS), and profitability metrics. The system automatically calculates margins, tracks stock levels, and provides powerful tools for price simulation and profitability analysis.'
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
      ],
      details: 'Manage your entire order lifecycle from quote creation through fulfillment and delivery. Track order status, process returns, and maintain a complete audit trail. The system automatically updates inventory levels and provides real-time visibility into order fulfillment progress.'
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
      ],
      details: 'Maintain detailed client profiles with contact information, communication history, and order tracking. View complete order history, track client preferences, and build stronger relationships through organized client management.'
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
      ],
      details: 'Analyze profitability at the batch level with detailed margin and markup calculations. Use the price simulation tool to model different pricing scenarios and identify your top-performing products. TERP automatically calculates ROI and provides actionable insights for pricing decisions.'
    }
  ];

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCardClick = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

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
            const isExpanded = expandedSection === section.id;
            return (
              <div
                key={section.id}
                onClick={() => handleCardClick(section.id)}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg flex-shrink-0">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {section.title}
                      </h3>
                      <div className="flex-shrink-0 mt-1">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
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
                
                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h4 className="font-semibold text-gray-900 mb-2">More Information</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {section.details}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                      <FileText className="w-4 h-4" />
                      <span>See complete training guide below for detailed walkthroughs with screenshots</span>
                    </div>
                  </div>
                )}
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

        {/* Training Guide Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-100">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg flex-shrink-0">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  📚 Complete Training Guide
                </h3>
                <p className="text-gray-700 mb-6">
                  Download our comprehensive training guide with screenshots, step-by-step instructions, 
                  and detailed explanations of all TERP features. Perfect for new users and as a reference 
                  for experienced users.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a 
                    href="/TERP_Training_Guide.pdf" 
                    download
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-5 h-5" />
                    Download PDF Guide
                  </a>
                  <a 
                    href="/TERP_Training_Guide.md" 
                    download
                    className="inline-flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileText className="w-5 h-5" />
                    Download Markdown
                  </a>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  💡 <strong>Tip:</strong> The training guide includes real screenshots from TERP, 
                  detailed workflows, and "Backend Intelligence" sections that explain how features work.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <div className="bg-gray-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Need More Help?
            </h3>
            <p className="text-gray-700">
              Can't find what you're looking for? Contact your system administrator or 
              check the complete training guide above for detailed walkthroughs with screenshots.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

