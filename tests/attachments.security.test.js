/**
 * @jest-environment node
 */
const prisma = require('../src/lib/prisma').default
const fs = require('fs').promises

describe('Attachments security', () => {
  let att
  beforeAll(async () => {
    const tmpPath = `/tmp/att_${Date.now()}.txt`
    await fs.writeFile(tmpPath, 'hello')
    att = await prisma.attachment.create({ data: { entityType:'test', entityId:'e1', fileName:'a.txt', filePath: tmpPath, mimeType: 'text/plain', fileSize: 5, archived: false } })
  })
  afterAll(async () => {
    await prisma.attachment.delete({ where: { id: att.id } }).catch(()=>{})
  })

  test('list hides filePath and requires auth', async () => {
    const mod = require('../src/app/api/attachments/list/route.ts')
    const res = await mod.GET(new Request('http://localhost/api/attachments/list'))
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.attachments[0].filePath).toBeUndefined()
  })

  test('file endpoint returns content', async () => {
    const mod = require('../src/app/api/attachments/file/route.ts')
    const res = await mod.GET(new Request(`http://localhost/api/attachments/file?id=${att.id}`))
    expect(res.status).toBe(200)
    const buf = await res.arrayBuffer()
    expect(buf.byteLength).toBeGreaterThan(0)
  })
})
