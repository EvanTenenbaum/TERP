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
      training: `**Getting Started with Your Dashboard**

The Dashboard provides a real-time overview of your business through customizable data cards. Each card displays key metrics and can be clicked to drill down into detailed views.

**Customization**

Click "Customize Dashboard" to add, remove, or rearrange cards. Your layout preferences are saved automatically. Cards can be organized by priority—place your most critical metrics at the top for quick access.

**Drill-Down Navigation**

Click any metric value to view the underlying data. For example, clicking "Total Inventory Value" filters the inventory view to show all contributing batches. This makes it easy to investigate trends or verify calculations.

**Quick Notes**

Use the notes section to track important reminders or action items. These persist across sessions and are visible only to you.

**What's Happening Behind the Scenes**

TERP continuously aggregates data from inventory, orders, and clients to calculate dashboard metrics in real-time. Trends are computed automatically based on historical data, and alerts are triggered when thresholds are exceeded.`
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
      training: `**Understanding Batch-Based Inventory**

TERP uses a batch system where each product lot is tracked individually with its own cost, location, and profitability metrics. This granular approach provides precise margin calculations and inventory visibility.

**Location Hierarchy**

Locations follow a five-tier structure: Site → Zone → Rack → Shelf → Bin. This hierarchy allows you to track inventory at any level of detail, from warehouse-wide views down to specific bin locations.

**Batch Lifecycle**

Each batch progresses through states as it moves through your system. Status changes are logged automatically, creating an audit trail from receipt to sale.

**COGS Tracking**

TERP supports both fixed-price and range-based COGS. Fixed pricing assigns a single cost to a batch, while range pricing tracks minimum and maximum costs for products with variable supplier pricing.

**Profitability Analysis**

Margin percentages are calculated automatically for each batch using the formula: (Sale Price - COGS) / Sale Price. This provides instant visibility into which products are most profitable.

**Price Simulation**

The simulation tool lets you model pricing changes before implementing them. Adjust the price and immediately see the impact on margin, markup, and projected profit.

**Best Practice**

Low stock alerts exist for a reason. Set appropriate thresholds and monitor them regularly to avoid stockouts.`
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
      training: `**Order Workflow Overview**

Orders progress through three primary states:

1. **PENDING** - Order created, awaiting fulfillment
2. **PACKED** - Items prepared for shipment
3. **SHIPPED** - Order dispatched to customer

Each status change is timestamped and logged for tracking purposes.

**Creating Orders**

Navigate to "Create Order," select a client, add products, and save. The system automatically reserves inventory and calculates totals based on the client's pricing profile.

**Working with Quotes**

Quotes function as draft orders. Create a quote when pricing needs approval or the customer is evaluating options. Convert quotes to orders with a single click when ready to fulfill.

**Processing Returns**

When processing a return, TERP automatically returns inventory to available stock and adjusts financial records. The original order maintains a complete history of the return transaction.

**Audit Trail**

Every status change, modification, and note is logged with a timestamp and user attribution. This creates a complete record of each order's lifecycle.

**Useful Pattern**

Review order history by client to identify purchasing patterns. This data can inform inventory planning and reveal opportunities for proactive outreach.`
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
      training: `**Client Profile Management**

Each client profile contains contact information, TERI code (unique identifier), client type classification, and a complete order history. This centralized view provides context for every customer interaction.

**Communication Logging**

Log calls, emails, and meetings directly in the client profile. Include dates, topics discussed, and any commitments made. This creates a searchable record that's accessible to your entire team.

**Order History Analysis**

The order history shows every transaction with a client, sorted chronologically. Use this to identify purchasing patterns, seasonal trends, or changes in buying behavior.

**Total Sales Tracking**

The "Total Sales" metric displays lifetime revenue from each client. Sort clients by this value to identify your highest-value relationships.

**Important Note**

High order volume doesn't always correlate with high profitability. Cross-reference order history with margin data to understand true client value.

**Preparation Strategy**

Before client calls, review their profile and recent order history. This context allows for more informed conversations and demonstrates attention to detail.`
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
      training: `**Understanding Profitability Metrics**

Revenue indicates sales volume. Profit indicates business health. TERP focuses on profit-based analysis to support informed pricing decisions.

**Margin vs. Markup**

These terms are often confused but represent different calculations:

- **Margin:** Profit as a percentage of sale price. Example: $100 sale with $30 profit = 30% margin
- **Markup:** Profit as a percentage of cost. Example: $70 cost sold for $100 = 43% markup

TERP displays both metrics for complete visibility.

**Profitability Dashboard**

Sort products by margin to identify your most and least profitable items. This view often reveals surprising patterns in product performance.

**Top Performers Report**

This report ranks products by total profit contribution—not revenue or volume. Focus optimization efforts on this list for maximum impact.

**Price Simulation**

Model pricing changes before implementation. Enter a new price to see immediate calculations of resulting margin, markup, and profit impact.

**Common Discovery**

Many businesses unknowingly sell certain products at a loss or minimal margin. Regular profitability reviews help identify and correct these situations.

**Recommended Cadence**

Run profitability analysis monthly rather than quarterly or annually. Market conditions and costs change frequently enough to warrant regular review.`
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
                        <li key={`page-item-${index}`} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span className="text-sm text-gray-700">{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="prose prose-sm max-w-none">
                      <div 
                        className="text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: section.training
                            .split('\n\n')
                            .map(para => {
                              // Handle bold text
                              para = para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                              // Handle list items
                              if (para.trim().startsWith('-')) {
                                const items = para.split('\n').map(item => 
                                  item.trim().startsWith('-') 
                                    ? `<li>${item.substring(1).trim()}</li>` 
                                    : item
                                ).join('');
                                return `<ul class="list-disc pl-5 space-y-1 my-3">${items}</ul>`;
                              }
                              // Handle numbered lists
                              if (/^\d+\./.test(para.trim())) {
                                const items = para.split('\n').map(item => {
                                  const match = item.match(/^\d+\.\s*(.+)/);
                                  return match ? `<li>${match[1]}</li>` : item;
                                }).join('');
                                return `<ol class="list-decimal pl-5 space-y-1 my-3">${items}</ol>`;
                              }
                              return `<p class="mb-3">${para}</p>`;
                            })
                            .join('')
                        }}
                      />
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
                  Download the comprehensive training guide with screenshots, detailed workflows, 
                  and step-by-step instructions for all TERP features. Includes technical explanations 
                  and best practices for each module.
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
                  The PDF includes real screenshots from TERP and "Backend Intelligence" sections 
                  that explain system architecture and automated processes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <div className="bg-gray-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Need Additional Help?
            </h3>
            <p className="text-gray-700">
              Contact your system administrator for questions not covered in this documentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

