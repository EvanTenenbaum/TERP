import { getClientProfile } from '@/lib/client/profile'
import ClientProfile from './ClientProfile'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: { partyId: string } }) {
  const data = await getClientProfile(params.partyId)
  return <ClientProfile data={data} />
}
