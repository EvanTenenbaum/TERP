export type Json = Record<string, any> | any[] | null;

export async function fetcher<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  let data: any = null;
  try {
    data = await res.json();
  } catch (e) {
    // Non-JSON response
    if (!res.ok) throw Object.assign(new Error('request_failed'), { status: res.status });
    return data as T;
  }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || res.statusText || 'request_failed';
    throw Object.assign(new Error(String(msg)), { status: res.status, data });
  }
  return data as T;
}

export async function postJson<T = any>(url: string, body: any, init?: RequestInit) {
  return fetcher<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...(init || {}) });
}

export async function patchJson<T = any>(url: string, body: any, init?: RequestInit) {
  return fetcher<T>(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...(init || {}) });
}

export async function deleteJson<T = any>(url: string, body?: any, init?: RequestInit) {
  return fetcher<T>(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, ...(init || {}) });
}
