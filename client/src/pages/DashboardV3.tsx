import DashboardLayout from '@/components/DashboardLayout';
import { DashboardPreferencesProvider, useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { DashboardHeader } from '@/components/dashboard/v3/DashboardHeader';
import { DashboardLayoutManager } from '@/components/dashboard/v3/DashboardLayoutManager';
import { CustomizationPanel } from '@/components/dashboard/v3/CustomizationPanel';

// Import v3 widgets
import {
  TransactionSnapshotWidget,
  InventorySnapshotWidget,
  TotalDebtWidget,
  SalesComparisonWidget,
  ProfitabilityWidget,
  MatchmakingOpportunitiesWidget,
} from '@/components/dashboard/widgets-v3';

// Import v2 widgets (fallback for widgets not yet migrated to v3)
import {
  SalesByClientWidget,
  CashFlowWidget,
} from '@/components/dashboard/widgets-v2';

function DashboardContent() {
  const { widgets } = useDashboardPreferences();

  const visibleWidgets = widgets.filter((w) => w.isVisible);

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'sales-by-client':
        return <SalesByClientWidget key={widgetId} />;
      case 'cash-flow':
        return <CashFlowWidget key={widgetId} />;
      case 'transaction-snapshot':
        return <TransactionSnapshotWidget key={widgetId} />;
      case 'inventory-snapshot':
        return <InventorySnapshotWidget key={widgetId} />;
      case 'total-debt':
        return <TotalDebtWidget key={widgetId} />;
      case 'sales-comparison':
        return <SalesComparisonWidget key={widgetId} />;
      case 'profitability':
        return <ProfitabilityWidget key={widgetId} />;
      case 'matchmaking-opportunities':
        return <MatchmakingOpportunitiesWidget key={widgetId} />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <DashboardHeader />
        
        <DashboardLayoutManager>
          {visibleWidgets.map((widget) => (
            <div
              key={widget.id}
              className={`
                ${widget.size === 'sm' ? 'col-span-1 md:col-span-4 lg:col-span-4' : ''}
                ${widget.size === 'md' ? 'col-span-1 md:col-span-4 lg:col-span-6' : ''}
                ${widget.size === 'lg' ? 'col-span-1 md:col-span-8 lg:col-span-8' : ''}
                ${widget.size === 'xl' ? 'col-span-1 md:col-span-8 lg:col-span-12' : ''}
                ${!widget.size ? 'col-span-1 md:col-span-4 lg:col-span-6' : ''}
              `}
            >
              {renderWidget(widget.id)}
            </div>
          ))}
        </DashboardLayoutManager>

        <CustomizationPanel />
      </div>
    </DashboardLayout>
  );
}

export default function DashboardV3() {
  return (
    <DashboardPreferencesProvider>
      <DashboardContent />
    </DashboardPreferencesProvider>
  );
}
