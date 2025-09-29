import { getClientProfile } from '@/lib/client/profile'
import ClientQuickView from '@/components/client/ClientQuickView'

export default async function QuickPage({ params }: { params: { partyId: string } }) {
  const data = await getClientProfile(params.partyId)
  return <ClientQuickView data={data} />
}
