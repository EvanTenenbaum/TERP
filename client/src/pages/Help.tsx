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
      training: `**Welcome to Your Dashboard** (Yes, we know you've seen it already)

Think of this as your business's Instagram feed, except instead of food pics, you get actual useful data. Revolutionary, right?

**The Quick Win:**
Those colorful cards at the top? They're not just pretty—click any number to drill down into the details. It's like clicking a hashtag, but for your inventory. Mind = blown.

**Customization (The Fun Part):**
Hit that "Customize Dashboard" button and drag cards around like you're rearranging furniture. Don't like seeing "Low Stock" first thing in the morning? Move it. We won't judge your avoidance tactics.

**Pro Tip:**
The "Quick Notes" section is perfect for those "I'll remember this later" moments (spoiler: you won't). Write it down. Future you will thank present you.

**What's Actually Happening Behind The Scenes:**
TERP is constantly calculating trends, flagging urgent stuff, and basically being that overachieving friend who has their life together. You're welcome.`
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
      training: `**Inventory: Where Your Money Lives**

Look, we get it. Inventory management sounds about as exciting as watching paint dry. But this is where your actual money is sitting, so... maybe pay attention? 😅

**The Batch System (It's Not Complicated, Promise):**
Every product gets a batch. Think of batches like individual Pokémon—each one has its own stats, location, and value. Gotta track 'em all.

**Location Hierarchy (Sounds Fancy, Isn't):**
Site → Zone → Rack → Shelf → Bin. It's basically like giving your product a full mailing address. "Hey Purple Haze, you live at Warehouse A, Zone 2, Rack 5, Shelf B, Bin 3." Now you can actually find it.

**The Profitability Magic:**
See those margin percentages? TERP calculates those automatically. No spreadsheets, no calculators, no crying. Just instant "am I making money on this?" answers.

**Price Simulation (The Crystal Ball):**
Want to see what happens if you change your price? Use the simulation tool. It's like a time machine, but for pricing decisions. Way cooler than it sounds.

**Real Talk:**
That "Low Stock" alert? Don't ignore it. We've seen what happens. It's not pretty.

**The Secret Sauce:**
TERP tracks your COGS (Cost of Goods Sold) automatically. Fixed price? Range pricing? We handle both. You just focus on selling stuff.`
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
      training: `**Orders: The Money-Making Part** 💰

This is where the magic happens. Well, "magic" might be overselling it. This is where you turn inventory into cash. Better?

**The Workflow (Easier Than Making Coffee):**
1. **PENDING** - Customer said yes, you haven't done anything yet
2. **PACKED** - You actually put stuff in a box (look at you go!)
3. **SHIPPED** - It's gone. Not your problem anymore. Freedom!

**Creating Orders (The Fast Way):**
Click "Create Order" → Pick a client → Add products → Hit save. Done. You just made money. Feel good about yourself.

**Quotes (For The Indecisive Customers):**
Some customers need to "think about it." Fine. Create a quote. When they finally decide (next week, next month, who knows), convert it to an order with one click. Boom.

**Returns (The Sad Part):**
Sometimes stuff comes back. It happens. Process the return, and TERP automatically puts inventory back on the shelf and adjusts your numbers. We've got your back.

**The Audit Trail:**
Every status change is tracked. Who did what, when. It's like a security camera for your orders. Useful when someone asks "where's my order?" (Spoiler: it's in the system, always has been).

**Pro Tip:**
Use the order history to see patterns. "Oh, Customer X always orders on Fridays." Now you know. Knowledge is power.`
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
      training: `**Clients: The People Who Pay You** (Important, Right?)

Let's be honest—without clients, you're just a person with a lot of inventory and some fancy software. So yeah, this section matters.

**Client Profiles (The Basics):**
Name, contact info, TERI code (that's their ID), client type. Standard stuff. But here's the cool part: TERP tracks EVERYTHING they've ever ordered. It's like having a perfect memory, except you don't have to pretend to remember their birthday.

**Communication Logging (Your New Best Friend):**
Had a phone call? Log it. Sent an email? Log it. Made a promise you'll definitely forget? LOG IT. Future you will be so grateful when a client asks "what did we talk about last month?"

**Order History (The Good Stuff):**
Click any client → See every order they've ever placed. When, what, how much. It's like their shopping biography. Use this to spot patterns, predict needs, or just look smart in meetings.

**The Secret Weapon:**
See that "Total Sales" number? That's how much money this client has given you. Ever. Use this information wisely (hint: maybe be extra nice to your top 10).

**Real Talk:**
The clients with the most orders aren't always the most profitable. Check those margins. Sometimes your "best" client is actually... not. Sorry to break it to you.

**Pro Move:**
Before calling a client, pull up their profile. Glance at recent orders. Now you sound prepared and professional. You're welcome.`
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
      training: `**Profitability: The "Are We Actually Making Money?" Section**

Revenue is vanity. Profit is sanity. Cash is reality. Let's talk sanity.

**Margin vs. Markup (Yes, They're Different):**
- **Margin:** What % of the sale price is profit. "I sold it for $100, made $30 profit = 30% margin"
- **Markup:** How much you marked it up from cost. "Cost me $70, sold for $100 = 43% markup"

TERP shows both because we're not monsters. Use whichever makes you feel better about your pricing.

**The Profitability Dashboard (Your New Obsession):**
See which products are printing money and which are... not. Sort by margin. Prepare to be surprised. That product you thought was a winner? Yeah, about that...

**Top Performers Report (The Winners Circle):**
Your best products, ranked by actual profit. Not revenue. Not volume. PROFIT. This is the list that matters. Focus here.

**Price Simulation (The "What If" Game):**
"What if I raised the price by 5%?" Click, type, see the answer. No math required. It's beautiful.

**The Harsh Truth:**
You're probably selling some stuff at a loss and don't know it. TERP knows. Check the red numbers. Fix them. Your accountant will stop crying.

**Pro Tip:**
Run profitability reports monthly. Not yearly. Monthly. Things change fast. Stay on top of it or get buried.

**The Reality Check:**
High volume ≠ high profit. Sometimes your best move is to sell less of the low-margin stuff and more of the good stuff. Revolutionary, we know.`
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
                                return `<ul class="list-disc pl-5 space-y-1">${items}</ul>`;
                              }
                              // Handle numbered lists
                              if (/^\d+\./.test(para.trim())) {
                                const items = para.split('\n').map(item => {
                                  const match = item.match(/^\d+\.\s*(.+)/);
                                  return match ? `<li>${match[1]}</li>` : item;
                                }).join('');
                                return `<ol class="list-decimal pl-5 space-y-1">${items}</ol>`;
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
                  Want the full experience? Download our comprehensive training guide with screenshots, 
                  step-by-step instructions, and all the details we couldn't fit in these cards. 
                  It's like this, but longer. And with pictures.
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
                  💡 <strong>Pro tip:</strong> The PDF has real screenshots from TERP and "Backend Intelligence" 
                  sections that explain what's happening under the hood. Nerd out responsibly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <div className="bg-gray-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Still Confused? (It Happens)
            </h3>
            <p className="text-gray-700">
              Can't find what you're looking for? Hit up your system administrator. 
              They probably know the answer. Or at least know who to ask. That's what they're there for.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

