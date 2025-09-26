import { redirect } from 'next/navigation'

export default function LotsRedirect() {
  redirect('/inventory/products')
}
