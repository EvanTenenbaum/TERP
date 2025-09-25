export function normalizeSpaces(str: string) {
  return str.replace(/\s+/g, ' ').trim()
}

export function normalizeFlowerProductName(vendorCode: string, strainName: string) {
  const left = normalizeSpaces(vendorCode || '')
  const right = normalizeSpaces(strainName || '')
  if (!left || !right) return null
  return `${left} - ${right}`
}
