import React, { useState } from "react";
import { trpc } from "../../utils/trpc"; // Adjust based on your trpc hook location
import Head from "next/head";
import Link from "next/link";
import { format } from "date-fns";

const LiveShoppingList = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: sessions, isLoading, refetch } = trpc.liveShopping.listSessions.useQuery({});
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Head>
        <title>Live Shopping Sessions | TERP</title>
      </Head>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Shopping</h1>
          <p className="text-gray-500">Manage real-time sales sessions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          + New Session
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Host</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled/Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">Loading sessions...</td>
                </tr>
              ) : sessions?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">No sessions found.</td>
                </tr>
              ) : (
                sessions?.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {session.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {session.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {session.hostName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {session.itemCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                      {session.scheduledAt 
                        ? format(new Date(session.scheduledAt), "MMM d, h:mm a") 
                        : format(new Date(session.createdAt), "MMM d, h:mm a")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/live-shopping/${session.id}`} className="text-indigo-600 hover:text-indigo-900">
                        Open Console
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateSessionModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }} 
        />
      )}
    </div>
  );
};

// --- Sub Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    SCHEDULED: "bg-blue-100 text-blue-800",
    PAUSED: "bg-yellow-100 text-yellow-800",
    ENDED: "bg-gray-100 text-gray-800",
    CONVERTED: "bg-purple-100 text-purple-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
};

const CreateSessionModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  // Simple form state management
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Fetch clients for dropdown
  const { data: clients } = trpc.clients.getAll.useQuery({ limit: 100 });
  
  const createMutation = trpc.liveShopping.createSession.useMutation({
    onSuccess: () => onSuccess(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!clientId) return;
    
    createMutation.mutate({
      clientId: parseInt(clientId),
      title: title || undefined,
      scheduledAt: scheduledAt || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create New Session</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Client</label>
            <select 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              required
            >
              <option value="">Select a Client</option>
              {clients?.items.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Session Title (Optional)</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Q3 Restock Review"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Schedule For (Optional)</label>
            <input 
              type="datetime-local" 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank to start immediately</p>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isLoading || !clientId}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {createMutation.isLoading ? "Creating..." : "Create Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LiveShoppingList;
