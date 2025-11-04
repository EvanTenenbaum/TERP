import { InboxPanel } from "@/components/inbox/InboxPanel";

export function InboxPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="bg-card border rounded-lg shadow-sm h-[calc(100vh-8rem)]">
        <InboxPanel />
      </div>
    </div>
  );
}
