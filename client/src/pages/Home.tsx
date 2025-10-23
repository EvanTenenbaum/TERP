import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { FileText, ShoppingCart, Package, TrendingUp } from 'lucide-react';

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const stats = [
    {
      name: 'Total Quotes',
      value: '24',
      change: '+12%',
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      name: 'Active Orders',
      value: '18',
      change: '+8%',
      icon: ShoppingCart,
      color: 'text-green-600',
    },
    {
      name: 'Inventory Items',
      value: '342',
      change: '+5%',
      icon: Package,
      color: 'text-purple-600',
    },
    {
      name: 'Revenue',
      value: '$127.5K',
      change: '+18%',
      icon: TrendingUp,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's an overview of your business.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                  <p className="text-xs text-green-600 mt-1">{stat.change} from last month</p>
                </div>
                <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Quotes</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Q-2024-003</p>
                <p className="text-sm text-muted-foreground">Global Enterprises</p>
              </div>
              <p className="font-semibold">$42,300</p>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Q-2024-002</p>
                <p className="text-sm text-muted-foreground">Tech Solutions Inc.</p>
              </div>
              <p className="font-semibold">$28,900</p>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Q-2024-001</p>
                <p className="text-sm text-muted-foreground">Acme Corporation</p>
              </div>
              <p className="font-semibold">$15,750</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors">
              <p className="font-medium">Create New Quote</p>
              <p className="text-sm text-muted-foreground">Start a new sales quote</p>
            </button>
            <button className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors">
              <p className="font-medium">View Orders</p>
              <p className="text-sm text-muted-foreground">Check active orders</p>
            </button>
            <button className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors">
              <p className="font-medium">Manage Inventory</p>
              <p className="text-sm text-muted-foreground">Update stock levels</p>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
