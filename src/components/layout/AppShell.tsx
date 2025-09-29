"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SystemBanner } from "@/components/ui/Banner";
import { ToastProvider } from "@/components/ui/Toast";
import type { UserRole } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
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

const _nav: NavGroup[] = [
  {
    title: "General",
    items: [
      { label: "Home", href: "/", icon: HomeIcon },
      { label: "Search", href: "/search", icon: MagnifyingGlassIcon },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Sales", href: "/sales", icon: DocumentTextIcon },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Inventory", href: "/inventory", icon: Squares2X2Icon },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Finance", href: "/finance", icon: DocumentTextIcon },
    ],
  },
  {
    title: "Clients",
    items: [
      { label: "Clients", href: "/clients", icon: DocumentTextIcon },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Analytics", href: "/analytics", icon: Squares2X2Icon },
    ],
  },
];

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function filterNavForRole(groups: NavGroup[], role?: UserRole): NavGroup[] {
  if (!role || role === 'SUPER_ADMIN') return groups
  return groups.filter(g => {
    if (role === 'SALES' && g.title === 'Finance') return false
    if (role === 'ACCOUNTING' && g.title === 'Sales') return false
    if (role === 'READ_ONLY' && (g.title === 'Sales' || g.title === 'Finance')) return false
    return true
  })
}

export default function AppShell({ children, role }: { children: React.ReactNode; role?: UserRole }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const nav = filterNavForRole(_nav, role);

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

  // Keyboard shortcuts: Ctrl/Cmd+K (search), Ctrl/Cmd+N (new/context), ? (help)
  useEffect(() => {
    function isTypingEl(el: any) { return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) }
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey
      if (isTypingEl(e.target)) return
      if (meta && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); router.push('/search'); return }
      if (meta && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); if (cta) router.push(cta.href); return }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); setShowHelp((v)=>!v); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, cta])

  return (
    <ToastProvider>
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
            <NavContent pathname={pathname} nav={nav} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:z-20 bg-white border-r">
          <div className="h-14 border-b flex items-center px-4 font-semibold">ERPv2</div>
          <NavContent pathname={pathname} nav={nav} />
        </aside>

        {/* Main content */}
        <div className="flex-1 w-full md:ml-64">
          <SystemBanner />
          {/* Help overlay */}
          {showHelp && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded shadow-lg p-4 w-[90vw] max-w-md">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">Keyboard Shortcuts</h2>
                  <button aria-label="Close" onClick={()=>setShowHelp(false)} className="rounded p-1 hover:bg-gray-100">✕</button>
                </div>
                <ul className="text-sm space-y-1">
                  <li><kbd className="px-1 border rounded">Ctrl/Cmd</kbd> + <kbd className="px-1 border rounded">K</kbd> — Global search</li>
                  <li><kbd className="px-1 border rounded">Ctrl/Cmd</kbd> + <kbd className="px-1 border rounded">N</kbd> — New/context action</li>
                  <li><kbd className="px-1 border rounded">?</kbd> — Toggle this help</li>
                </ul>
              </div>
            </div>
          )}

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
    </ToastProvider>
  );
}

function NavContent({ pathname, nav, onNavigate }: { pathname: string | null; nav: NavGroup[]; onNavigate?: () => void }) {
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
