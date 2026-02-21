import type { PropsWithChildren } from "react";
import { Link, useLocation } from "wouter";

const tabs = [
  { href: "/slice-v1-lab/purchase-orders", label: "Purchase Orders" },
  { href: "/slice-v1-lab/product-intake", label: "Product Intake" },
  { href: "/slice-v1-lab/inventory", label: "Inventory Browse" },
];

export function SliceV1WorkbenchLayout({ children }: PropsWithChildren) {
  const [location] = useLocation();

  return (
    <div
      className="min-h-screen bg-[#f5f5f2] text-slate-900"
      style={{ fontFamily: '"IBM Plex Sans","SF Pro Text","Segoe UI",sans-serif' }}
    >
      <header className="border-b border-slate-300 bg-[#efefe9] px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-600">
              Calm Power Slice Lab
            </p>
            <p className="text-base font-semibold tracking-tight">
              Purchase Order → Product Intake → Received
            </p>
          </div>
          <nav className="flex items-center gap-2">
            {tabs.map(tab => {
              const active = location.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-sm border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <p className="ml-auto text-xs text-slate-500">
            Isolated testing frontend (local branch only)
          </p>
        </div>
      </header>
      <main className="h-[calc(100vh-73px)] overflow-auto">{children}</main>
    </div>
  );
}

export default SliceV1WorkbenchLayout;
