'use client'
export default function AttachmentsPanel({
  partyId,
  customerId,
  vendorId,
}: {
  partyId: string
  customerId?: string
  vendorId?: string
}) {
  return (
    <div className="rounded border p-4">
      <div className="text-sm text-gray-600">
        Attachments for Party <code className="font-mono">{partyId}</code>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Integrate with existing attachments endpoints (entityType='party' preferred; otherwise customer/vendor).
      </div>
    </div>
  )
}
