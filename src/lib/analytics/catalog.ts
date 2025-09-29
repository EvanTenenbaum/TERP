import prisma from '@/lib/prisma'

type Catalog = {
  metrics: { id:string; label:string; domain:'SALES'|'FINANCE'|'INVENTORY'|'OPERATIONS'; defaultViz:'kpi'|'bar'|'line'|'pie'|'table' }[]
  dimensions: { id:string; label:string }[]
  breakdowns: { id:string; label:string }[]
  filters: { field:string; label:string; type:'select'|'text'|'number' }[]
  options: { customers:{id:string; label:string}[]; vendors:{id:string; label:string}[]; products:{id:string; label:string}[] }
}

let cache: { at: number; data: Catalog } | null = null

export async function getCatalog(): Promise<Catalog> {
  const now = Date.now()
  if (cache && now - cache.at < 5*60_000) return cache.data

  const [customers, vendors, products] = await Promise.all([
    prisma.customer.findMany({ select: { id:true, companyName:true }, take: 100, orderBy: { companyName: 'asc' } }),
    prisma.vendor.findMany({ select: { id:true, vendorCode:true }, take: 100, orderBy: { vendorCode: 'asc' } }),
    prisma.product.findMany({ select: { id:true, name:true }, take: 100, orderBy: { name: 'asc' } }),
  ])

  const data: Catalog = {
    metrics: [
      { id:'sales_total', label:'Sales Total', domain:'SALES', defaultViz:'kpi' },
      { id:'sales_by_customer', label:'Sales by Customer', domain:'SALES', defaultViz:'bar' },
      { id:'sales_by_product', label:'Sales by Product', domain:'SALES', defaultViz:'bar' },
      { id:'ar_over_90', label:'AR > 90 Days', domain:'FINANCE', defaultViz:'kpi' },
      { id:'ar_aging_buckets', label:'AR Aging Buckets', domain:'FINANCE', defaultViz:'bar' },
      { id:'inventory_turns', label:'Inventory Turns (approx.)', domain:'INVENTORY', defaultViz:'kpi' },
      { id:'inventory_qty_by_category', label:'Inventory Qty by Category', domain:'INVENTORY', defaultViz:'bar' },
    ],
    dimensions: [
      { id:'customer', label:'Customer' },
      { id:'product', label:'Product' },
      { id:'vendor', label:'Vendor' },
    ],
    breakdowns: [
      { id:'month', label:'Month' },
      { id:'category', label:'Category' },
    ],
    filters: [
      { field:'customerId', label:'Customer', type:'select' },
      { field:'vendorId', label:'Vendor', type:'select' },
      { field:'productId', label:'Product', type:'select' },
    ],
    options: {
      customers: customers.map(c => ({ id: c.id, label: c.companyName })),
      vendors: vendors.map(v => ({ id: v.id, label: v.vendorCode })),
      products: products.map(p => ({ id: p.id, label: p.name })),
    }
  }

  cache = { at: now, data }
  return data
}
