"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  CubeIcon,
  QueueListIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const nav: NavGroup[] = [
  {
    title: "General",
    items: [
      { label: "Home", href: "/", icon: HomeIcon },
      { label: "Search", href: "/search", icon: MagnifyingGlassIcon },
      { label: "Attachments", href: "/attachments", icon: DocumentTextIcon },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Quotes", href: "/quotes", icon: DocumentTextIcon },
      { label: "Orders", href: "/orders", icon: DocumentTextIcon },
      { label: "B2B Orders", href: "/b2b/orders", icon: DocumentTextIcon },
      { label: "Price Books", href: "/price-books", icon: DocumentTextIcon },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Overview", href: "/inventory", icon: Squares2X2Icon },
      { label: "Products", href: "/inventory/products", icon: CubeIcon },
      { label: "Categories", href: "/inventory/categories", icon: Squares2X2Icon },
      { label: "Transfers", href: "/inventory/transfers", icon: QueueListIcon },
      { label: "Purchase Orders", href: "/inventory/purchase-orders", icon: QueueListIcon },
      { label: "Low Stock", href: "/inventory/low-stock", icon: ExclamationTriangleIcon },
      { label: "Returns", href: "/inventory/returns", icon: ArchiveBoxIcon },
      { label: "Discrepancies", href: "/inventory/discrepancies", icon: ExclamationTriangleIcon },
      { label: "Adjustments", href: "/inventory/adjustments", icon: QueueListIcon },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Accounts Receivable", href: "/finance/ar", icon: DocumentTextIcon },
      { label: "Dunning", href: "/finance/ar/dunning", icon: DocumentTextIcon },
      { label: "Accounts Payable", href: "/finance/ap", icon: DocumentTextIcon },
      { label: "Payments", href: "/finance/payments", icon: DocumentTextIcon },
      { label: "Credits", href: "/finance/credits", icon: DocumentTextIcon },
      { label: "Vendor Settlements", href: "/finance/vendor-settlements", icon: DocumentTextIcon },
      { label: "Vendor Rebates", href: "/finance/vendor-rebates", icon: DocumentTextIcon },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Overview", href: "/analytics", icon: Squares2X2Icon },
      { label: "Profitability", href: "/analytics/profitability", icon: Squares2X2Icon },
      { label: "Alerts", href: "/alerts", icon: ExclamationTriangleIcon },
      { label: "Audit Log", href: "/admin/audit-log", icon: DocumentTextIcon },
    ],
  },
];

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Breadcrumb data
  const segments = (pathname || '/').split('/').filter(Boolean)
  const crumbs = segments.map((seg, i) => ({
    label: seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))

  // Contextual quick actions
  const ctaMap: Record<string, { href: string; label: string } | undefined> = {
    '/quotes': { href: '/quotes/new', label: 'New Quote' },
    '/b2b/orders': { href: '/b2b/orders/new', label: 'New B2B Order' },
    '/inventory/products': { href: '/inventory/products/new', label: 'Add Product' },
  }
  const cta = Object.keys(ctaMap).find((k) => pathname?.startsWith(k)) ? ctaMap[Object.keys(ctaMap).find((k) => pathname?.startsWith(k)) as string] : undefined

  return (
    <div className="min-h-screen bg-gray-50">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white border px-3 py-1 rounded shadow">Skip to content</a>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="text-sm text-gray-600">ERPv2</div>
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-900/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 w-64 bg-white border-r shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold">Navigation</span>
              <button
                aria-label="Close navigation"
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <NavContent pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:z-20 bg-white border-r">
          <div className="h-14 border-b flex items-center px-4 font-semibold">ERPv2</div>
          <NavContent pathname={pathname} />
        </aside>

        {/* Main content */}
        <div className="flex-1 w-full md:ml-64">
          {/* Breadcrumb and actions */}
          <div className="px-4 md:px-6 pt-3 md:pt-4">
            {crumbs.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
                  <ol className="flex flex-wrap gap-1">
                    <li><Link href="/" className="hover:text-gray-900">Home</Link></li>
                    {crumbs.map((c) => (
                      <li key={c.href} className="flex items-center">
                        <span className="mx-1 text-gray-400">/</span>
                        <Link href={c.href} className="hover:text-gray-900">{c.label}</Link>
                      </li>
                    ))}
                  </ol>
                </nav>
                {cta && (
                  <Link href={cta.href} className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
                    {cta.label}
                  </Link>
                )}
              </div>
            )}
          </div>
          <main id="main" className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function NavContent({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <nav className="overflow-y-auto px-3 py-4 space-y-6">
      {nav.map((group) => (
        <div key={group.title}>
          <div className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{group.title}</div>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={classNames(
                      active
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-transparent",
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm border"
                    )}
                  >
                    {Icon ? <Icon className="h-5 w-5" /> : null}
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
