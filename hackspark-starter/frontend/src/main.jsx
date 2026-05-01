import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => today().slice(0, 7);
const money = (value) => Number(value || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
const categories = ['', 'ELECTRONICS', 'FURNITURE', 'VEHICLES', 'TOOLS', 'OUTDOOR', 'SPORTS', 'MUSIC', 'OFFICE', 'CAMERAS'];

function api(path, options = {}) {
  const token = localStorage.getItem('rentpi_token');
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Something went wrong. Please try again.');
    }
    return data;
  });
}

function useRoute() {
  const [route, setRoute] = useState(window.location.pathname === '/' ? '/trending' : window.location.pathname);
  useEffect(() => {
    const sync = () => setRoute(window.location.pathname === '/' ? '/trending' : window.location.pathname);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const go = (path) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };
  return [route, go];
}

function App() {
  const [route, go] = useRoute();
  const [token, setToken] = useState(localStorage.getItem('rentpi_token') || '');
  const nav = [
    ['/trending', 'Trending'],
    ['/products', 'Products'],
    ['/availability', 'Availability'],
    ['/chat', 'Chat'],
    ['/profile', 'Profile'],
    ['/insights', 'Insights']
  ];
  const auth = token
    ? <button className="btn ghost" onClick={() => { localStorage.removeItem('rentpi_token'); setToken(''); }}>Sign out</button>
    : <div className="auth-links"><button onClick={() => go('/login')}>Login</button><button onClick={() => go('/register')}>Register</button></div>;

  return (
    <div className="min-h-screen bg-rent-50 text-rent-950">
      <header className="sticky top-0 z-20 border-b border-rent-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button className="brand" onClick={() => go('/trending')}>RentPi</button>
          <nav className="nav-scroll">
            {nav.map(([path, label]) => <button key={path} className={route === path ? 'active' : ''} onClick={() => go(path)}>{label}</button>)}
          </nav>
          <div className="ml-auto">{auth}</div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5">
        {route === '/login' && <Auth mode="login" onDone={(jwt) => { setToken(jwt); go('/products'); }} />}
        {route === '/register' && <Auth mode="register" onDone={(jwt) => { setToken(jwt); go('/products'); }} />}
        {route === '/products' && <Products />}
        {route === '/availability' && <Availability />}
        {route === '/chat' && <Chat />}
        {route === '/profile' && <Profile />}
        {route === '/insights' && <Insights />}
        {route === '/trending' && <Trending />}
      </main>
    </div>
  );
}

function Panel({ title, subtitle, action, children }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-rent-950">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-rent-700">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Notice({ children, kind = 'info' }) {
  return <div className={`notice ${kind}`}>{children}</div>;
}

function SkeletonCards() {
  return <div className="grid-list">{Array.from({ length: 6 }).map((_, i) => <div className="card skeleton h-32" key={i} />)}</div>;
}

function Auth({ mode, onDone }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = mode === 'register' ? form : { email: form.email, password: form.password };
      const data = await api(`/users/${mode}`, { method: 'POST', body: JSON.stringify(body) });
      localStorage.setItem('rentpi_token', data.token);
      onDone(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Panel title={mode === 'register' ? 'Create account' : 'Welcome back'} subtitle="Authenticate through the API gateway and keep your session local to this browser.">
      <form className="form-card max-w-md" onSubmit={submit}>
        {mode === 'register' && <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />}
        <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} required />
        <Field label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} required />
        {error && <Notice kind="error">{error}</Notice>}
        <button className="btn primary" disabled={loading}>{loading ? 'Please wait...' : mode === 'register' ? 'Register' : 'Login'}</button>
      </form>
    </Panel>
  );
}

function Field({ label, value, onChange, type = 'text', ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </label>
  );
}

function Trending() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api(`/analytics/recommendations?date=${today()}&limit=6`);
      setItems(data.recommendations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  return (
    <Panel title="Trending today" subtitle="Seasonal recommendations based on historical demand around today's date." action={<button className="btn secondary" onClick={load}>Refresh</button>}>
      {loading && <SkeletonCards />}
      {error && <Notice kind="error">{error}</Notice>}
      {!loading && !error && items.length === 0 && <Notice>No recommendations are available yet.</Notice>}
      {!loading && !error && <div className="grid-list">{items.map((item) => <ProductCard key={item.productId} product={item} score={item.score} />)}</div>}
    </Panel>
  );
}

function Products() {
  const [query, setQuery] = useState({ page: 1, limit: 12, category: '' });
  const [state, setState] = useState({ loading: true, error: '', data: [], totalPages: 1, total: 0 });
  const [selected, setSelected] = useState(null);
  const load = async () => {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const params = new URLSearchParams({ page: query.page, limit: query.limit });
      if (query.category) params.set('category', query.category);
      const data = await api(`/rentals/products?${params.toString()}`);
      setState({ loading: false, error: '', data: data.data || [], totalPages: data.totalPages || 1, total: data.total || 0 });
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  };
  useEffect(() => { load(); }, [query.page, query.limit, query.category]);
  return (
    <Panel title="Products" subtitle="Browse RentPi inventory with pagination and category filtering.">
      <div className="toolbar">
        <label className="field compact"><span>Category</span><select value={query.category} onChange={(e) => setQuery({ ...query, category: e.target.value, page: 1 })}>{categories.map((c) => <option key={c} value={c}>{c || 'All categories'}</option>)}</select></label>
        <label className="field compact"><span>Page size</span><select value={query.limit} onChange={(e) => setQuery({ ...query, limit: Number(e.target.value), page: 1 })}><option>12</option><option>24</option><option>48</option></select></label>
        <div className="ml-auto text-sm text-rent-700">{state.total ? `${state.total.toLocaleString()} products` : 'Products'}</div>
      </div>
      {state.loading && <SkeletonCards />}
      {state.error && <Notice kind="error">{state.error}</Notice>}
      {!state.loading && !state.error && <div className="grid-list">{state.data.map((product) => <ProductCard key={product.id} product={product} onClick={() => setSelected(product)} />)}</div>}
      <div className="pager">
        <button className="btn ghost" disabled={query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Previous</button>
        <span>Page {query.page} of {state.totalPages}</span>
        <button className="btn ghost" disabled={query.page >= state.totalPages} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Next</button>
      </div>
      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </Panel>
  );
}

function ProductCard({ product, score, onClick }) {
  return (
    <button className="card text-left transition hover:-translate-y-0.5 hover:shadow-soft" onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <span className="badge">{product.category || 'UNCATEGORIZED'}</span>
        {score !== undefined && <span className="score">{score}</span>}
      </div>
      <h2 className="mt-4 line-clamp-2 text-base font-semibold">{product.name || `Product #${product.productId || product.id}`}</h2>
      <div className="mt-3 flex items-center justify-between text-sm text-rent-700">
        <span>ID {product.productId || product.id}</span>
        {product.pricePerDay !== undefined && <strong>{money(product.pricePerDay)}/day</strong>}
      </div>
    </button>
  );
}

function ProductModal({ product, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div><span className="badge">{product.category}</span><h2 className="mt-3 text-lg font-semibold">{product.name}</h2></div>
          <button className="icon-btn" onClick={onClose}>x</button>
        </div>
        <dl className="detail-list">
          <div><dt>Product ID</dt><dd>{product.id}</dd></div>
          <div><dt>Owner ID</dt><dd>{product.ownerId}</dd></div>
          <div><dt>Daily price</dt><dd>{money(product.pricePerDay)}</dd></div>
        </dl>
      </div>
    </div>
  );
}

function Availability() {
  const [form, setForm] = useState({ id: '', from: today(), to: today() });
  const [state, setState] = useState({ loading: false, error: '', result: null });
  const submit = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: '', result: null });
    try {
      const data = await api(`/rentals/products/${form.id}/availability?from=${form.from}&to=${form.to}`);
      setState({ loading: false, error: '', result: data });
    } catch (err) {
      setState({ loading: false, error: err.message, result: null });
    }
  };
  return (
    <Panel title="Availability" subtitle="Check whether a product is free for a requested date range.">
      <form className="toolbar" onSubmit={submit}>
        <Field label="Product ID" value={form.id} onChange={(id) => setForm({ ...form, id })} required />
        <Field label="From" type="date" value={form.from} onChange={(from) => setForm({ ...form, from })} required />
        <Field label="To" type="date" value={form.to} onChange={(to) => setForm({ ...form, to })} required />
        <button className="btn primary self-end" disabled={state.loading}>{state.loading ? 'Checking...' : 'Check'}</button>
      </form>
      {state.error && <Notice kind="error">{state.error}</Notice>}
      {state.result && <AvailabilityResult data={state.result} />}
    </Panel>
  );
}

function AvailabilityResult({ data }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card lg:col-span-1">
        <span className={data.available ? 'status ok' : 'status busy'}>{data.available ? 'Available' : 'Conflict found'}</span>
        <h2 className="mt-4 text-base font-semibold">Product #{data.productId}</h2>
        <p className="mt-2 text-sm text-rent-700">{data.from} to {data.to}</p>
      </div>
      <Periods title="Busy periods" items={data.busyPeriods} empty="No busy periods overlap this range." />
      <Periods title="Free windows" items={data.freeWindows} empty="No free window found in this range." />
    </div>
  );
}

function Periods({ title, items = [], empty }) {
  return <div className="card"><h3 className="text-sm font-semibold">{title}</h3><div className="mt-3 space-y-2">{items.length ? items.map((item, i) => <div className="period" key={i}>{item.start} <span /> {item.end}</div>) : <p className="text-sm text-rent-700">{empty}</p>}</div></div>;
}

function Chat() {
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(crypto.randomUUID());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadSessions = async () => {
    try {
      const data = await api('/chat/sessions');
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { loadSessions(); }, []);
  const openSession = async (sessionId) => {
    setActive(sessionId);
    setError('');
    try {
      const data = await api(`/chat/${sessionId}/history`);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message);
    }
  };
  const newChat = () => {
    setActive(crypto.randomUUID());
    setMessages([]);
    setInput('');
  };
  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);
    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    try {
      const data = await api('/chat', { method: 'POST', body: JSON.stringify({ sessionId: active, message: text }) });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      loadSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Panel title="Chat assistant" subtitle="Ask grounded RentPi questions about rentals, products, availability, trends, and recommendations.">
      <div className="chat-shell">
        <aside className="sessions">
          <button className="btn primary w-full" onClick={newChat}>New Chat</button>
          <div className="mt-3 space-y-2">{sessions.map((session) => <button key={session.sessionId} className={active === session.sessionId ? 'session active' : 'session'} onClick={() => openSession(session.sessionId)}><strong>{session.name}</strong><span>{new Date(session.lastMessageAt).toLocaleString()}</span></button>)}</div>
        </aside>
        <section className="chat-panel">
          {error && <Notice kind="error">{error}</Notice>}
          <div className="messages">
            {messages.length === 0 && <Notice>Start a new RentPi conversation.</Notice>}
            {messages.map((message, index) => <div className={`bubble ${message.role}`} key={index}>{message.content}</div>)}
            {loading && <div className="bubble assistant typing">Typing...</div>}
          </div>
          <div className="composer">
            <input value={input} disabled={loading} placeholder="Ask about trending products..." onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            <button className="btn primary" disabled={loading || !input.trim()} onClick={send}>Send</button>
          </div>
        </section>
      </div>
    </Panel>
  );
}

function Profile() {
  const [id, setId] = useState('42');
  const [state, setState] = useState({ loading: false, error: '', data: null });
  const load = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: '', data: null });
    try {
      const data = await api(`/users/${id}/discount`);
      setState({ loading: false, error: '', data });
    } catch (err) {
      setState({ loading: false, error: err.message, data: null });
    }
  };
  return (
    <Panel title="Profile lookup" subtitle="Check a renter's trust score and discount tier.">
      <form className="toolbar" onSubmit={load}>
        <Field label="Central user ID" value={id} onChange={setId} required />
        <button className="btn primary self-end" disabled={state.loading}>{state.loading ? 'Loading...' : 'Lookup'}</button>
      </form>
      {state.error && <Notice kind="error">{state.error}</Notice>}
      {state.data && <div className="stats"><Stat label="User ID" value={state.data.userId} /><Stat label="Security score" value={state.data.securityScore} /><Stat label="Discount" value={`${state.data.discountPercent}%`} /></div>}
    </Panel>
  );
}

function Insights() {
  const [month, setMonth] = useState(thisMonth());
  const [range, setRange] = useState({ from: thisMonth(), to: thisMonth() });
  const [surge, setSurge] = useState({ loading: false, error: '', data: [] });
  const [peak, setPeak] = useState({ loading: false, error: '', data: null });
  const loadSurge = async () => {
    setSurge({ loading: true, error: '', data: [] });
    try {
      const data = await api(`/analytics/surge-days?month=${month}`);
      setSurge({ loading: false, error: '', data: data.data || [] });
    } catch (err) {
      setSurge({ loading: false, error: err.message, data: [] });
    }
  };
  const loadPeak = async () => {
    setPeak({ loading: true, error: '', data: null });
    try {
      const data = await api(`/analytics/peak-window?from=${range.from}&to=${range.to}`);
      setPeak({ loading: false, error: '', data: data.peakWindow });
    } catch (err) {
      setPeak({ loading: false, error: err.message, data: null });
    }
  };
  const maxCount = useMemo(() => Math.max(1, ...surge.data.map((d) => d.count || 0)), [surge.data]);
  return (
    <Panel title="Analytics insights" subtitle="Spot demand surges and the strongest seven-day rental window.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <form className="inline-form" onSubmit={(e) => { e.preventDefault(); loadSurge(); }}>
            <Field label="Surge month" type="month" value={month} onChange={setMonth} />
            <button className="btn primary self-end">Load</button>
          </form>
          {surge.error && <Notice kind="error">{surge.error}</Notice>}
          <div className="bars">{surge.data.slice(0, 31).map((day) => <div className="bar-row" key={day.date}><span>{day.date.slice(8)}</span><div><i style={{ width: `${(day.count / maxCount) * 100}%` }} /></div><b>{day.count}</b></div>)}</div>
        </div>
        <div className="card">
          <form className="inline-form" onSubmit={(e) => { e.preventDefault(); loadPeak(); }}>
            <Field label="From" type="month" value={range.from} onChange={(from) => setRange({ ...range, from })} />
            <Field label="To" type="month" value={range.to} onChange={(to) => setRange({ ...range, to })} />
            <button className="btn primary self-end">Find</button>
          </form>
          {peak.error && <Notice kind="error">{peak.error}</Notice>}
          {peak.data && <div className="mt-4"><span className="badge">Peak window</span><h2 className="mt-3 text-lg font-semibold">{peak.data.from} to {peak.data.to}</h2><p className="mt-2 text-sm text-rent-700">{peak.data.totalRentals.toLocaleString()} rentals</p></div>}
        </div>
      </div>
    </Panel>
  );
}

function Stat({ label, value }) {
  return <div className="card"><span className="text-sm text-rent-700">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></div>;
}

createRoot(document.getElementById('root')).render(<App />);
