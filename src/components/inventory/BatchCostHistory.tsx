'use client';

import { useState } from 'react';
import { formatCostForDisplay, parseCostToCents } from '@/lib/cogs';
import { addBatchCostChange } from '@/actions/inventory';

interface BatchCost {
  id: string;
  unitCost: number;
  effectiveFrom: Date;
}

interface BatchCostHistoryProps {
  batchId: string;
  batchCosts: BatchCost[];
}

export default function BatchCostHistory({ batchId, batchCosts }: BatchCostHistoryProps) {
  const [isAddingCost, setIsAddingCost] = useState(false);
  const [newCost, setNewCost] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const unitCostCents = parseCostToCents(newCost);
      const effectiveFromDate = new Date(effectiveDate);

      const result = await addBatchCostChange(batchId, unitCostCents, effectiveFromDate);

      if (result.success) {
        setIsAddingCost(false);
        setNewCost('');
        setEffectiveDate(new Date().toISOString().split('T')[0]);
        // The page will be revalidated automatically
      } else {
        alert(result.error || 'Failed to add cost change');
      }
    } catch (error) {
      console.error('Error adding cost change:', error);
      alert('Failed to add cost change');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Cost History</h3>
          <button
            onClick={() => setIsAddingCost(true)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
          >
            Add Cost Change
          </button>
        </div>
      </div>

      {isAddingCost && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
          <form onSubmit={handleAddCost} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="newCost" className="block text-sm font-medium text-gray-700 mb-1">
                  New Unit Cost ($)
                </label>
                <input
                  type="number"
                  id="newCost"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  required
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="effectiveDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Effective From
                </label>
                <input
                  type="date"
                  id="effectiveDate"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAddingCost(false)}
                className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Cost'}
              </button>
            </div>
          </form>
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This cost change will only affect future allocations. 
              Existing allocations will continue to use their original cost basis.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Effective From
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {batchCosts.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                  No cost history available
                </td>
              </tr>
            ) : (
              batchCosts.map((cost, index) => (
                <tr key={cost.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(cost.effectiveFrom).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCostForDisplay(cost.unitCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {index === 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Current
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Historical
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

