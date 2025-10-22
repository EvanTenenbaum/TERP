'use client';
import React from 'react';

export default function LoginPage() {
  const [userId, setUserId] = React.useState('dev-user');
  const [role, setRole] = React.useState('SUPER_ADMIN');
  const [msg, setMsg] = React.useState('');

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/auth/dev-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) {
      setMsg('Logged in. You can navigate back.');
    } else {
      const t = await res.text();
      setMsg('Failed: ' + t);
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Login (Dev Only)</h1>
      <p className="text-sm text-gray-600">This page is disabled in production unless explicitly enabled. It sets an auth cookie with your userId and role.</p>
      <form onSubmit={login} className="space-y-3">
        <input className="border p-2 w-full" value={userId} onChange={e=>setUserId(e.target.value)} placeholder="User ID" />
        <select className="border p-2 w-full" value={role} onChange={e=>setRole(e.target.value)}>
          {['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button className="bg-black text-white px-4 py-2 rounded">Login</button>
      </form>
      {msg && <div className="text-sm">{msg}</div>}
    </div>
  );
}
