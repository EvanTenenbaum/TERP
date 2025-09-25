const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const DATA_DIR = path.resolve('data')
const JSON_FILE = path.join(DATA_DIR, 'strains_otreeba.json')
const CSV_FILE = path.join(DATA_DIR, 'strains_openthc.csv')

function mapType(t) {
  if (!t) return 'Hybrid'
  const s = String(t).toLowerCase()
  if (s.includes('indica')) return 'Indica'
  if (s.includes('sativa')) return 'Sativa'
  if (s.includes('hemp')) return 'Hemp'
  if (s.includes('ruderalis')) return 'Ruderalis'
  if (s.includes('hybrid')) return 'Hybrid'
  return 'Hybrid'
}

function normalizeName(n) {
  return String(n || '').trim().replace(/\s+/g, ' ')
}

async function upsertVariety(name, type) {
  name = normalizeName(name)
  type = mapType(type)
  if (!name) return null

  const existing = await prisma.variety.findFirst({ where: { name, type } })
  if (existing) return existing
  return prisma.variety.create({ data: { name, type } })
}

async function seedFromJson() {
  const raw = fs.readFileSync(JSON_FILE, 'utf8')
  const arr = JSON.parse(raw)
  let count = 0
  for (const item of arr) {
    const name = item?.name || item?.strain || item?.title
    const type = item?.genetics || item?.race || item?.type
    const v = await upsertVariety(name, type)
    if (v) count++
  }
  return count
}

async function seedFromCsv() {
  const raw = fs.readFileSync(CSV_FILE, 'utf8')
  const lines = raw.split(/\r?\n/).filter(Boolean)
  // Expect header: ID,Type,Strain
  const header = lines.shift()
  let count = 0
  for (const line of lines) {
    const [id, type, strain] = line.split(',')
    const v = await upsertVariety(strain, type)
    if (v) count++
  }
  return count
}

async function main() {
  console.log('🌱 Seeding Varieties...')
  let seeded = 0
  if (fs.existsSync(JSON_FILE)) {
    console.log(`Using ${JSON_FILE}`)
    seeded = await seedFromJson()
  } else if (fs.existsSync(CSV_FILE)) {
    console.log(`Using ${CSV_FILE}`)
    seeded = await seedFromCsv()
  } else {
    console.log('No data files found. Please run one of:')
    console.log('  - npm run strains:fetch')
    console.log('  - npm run strains:download:openthc')
    process.exit(1)
  }
  console.log(`✅ Seeded/ensured ${seeded} varieties`)
}

main()
  .catch((e) => {
    console.error('❌ seedVarieties failed', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
