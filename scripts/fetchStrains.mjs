import fs from 'fs'
import path from 'path'

const DATA_DIR = path.resolve('data')
const OUT_FILE = path.join(DATA_DIR, 'strains_otreeba.json')

async function fetchStrains() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

  const all = []
  let page = 1
  const count = 200
  const base = 'https://api.otreeba.com/v1/strains'
  const headers = {}
  if (process.env.OTREEBA_API_KEY) headers['Authorization'] = `Bearer ${process.env.OTREEBA_API_KEY}`

  while (true) {
    const url = `${base}?page=${page}&count=${count}&sort=name`
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Otreeba API error ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data?.data)) all.push(...data.data)
    const totalPages = data?.meta?.pagination?.totalPages ?? page
    if (page >= totalPages) break
    page++
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2))
  console.log(`Fetched ${all.length} strains -> ${OUT_FILE}`)
}

fetchStrains().catch((err) => {
  console.error(err)
  process.exit(1)
})
