export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${url} ${res.status}`);
  return res.json();
}
export async function apiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${url} ${res.status}: ${text}`);
  }
  try { return await res.json(); } catch { return {} as T; }
}
