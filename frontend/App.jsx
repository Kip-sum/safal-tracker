import { useState, useEffect, useCallback } from "react";

const card = "rounded-xl border border-line bg-white p-4.5";
const btn = "cursor-pointer rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-blue-700";
const ghost = "cursor-pointer rounded-lg border border-brand bg-white px-3.5 py-1 text-brand hover:bg-blue-50";
const field = "w-full rounded-lg border border-line bg-white px-3 py-2";
const th = "border-b border-line px-2 py-2.5 text-left text-xs font-medium text-mute";
const td = "border-b border-line px-2 py-3";
const lbl = "grid gap-1 text-xs text-mute";
const tone = { Active: "green", Completed: "green", Pending: "amber", Inactive: "red" };
const toneCls = {
  green: "border-green-200 bg-green-50 text-green-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
};

const KSh = n => "KSh " + Math.round(n || 0).toLocaleString();
const short = n => n >= 1e6 ? `KSh ${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `KSh ${Math.round(n / 1e3)}K` : `KSh ${Math.round(n)}`;
const fdate = d => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const mlabel = m => MON[+m.split("-")[1] - 1];

async function api(path, body) {
  const t = localStorage.getItem("token");
  const r = await fetch("/api" + path, { method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(t && { Authorization: "Bearer " + t }) },
    body: body && JSON.stringify(body) });
  const d = await r.json();
  if (r.status === 401 && path !== "/login") { localStorage.removeItem("token"); location.reload(); }
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}
function useApi(path) {
  const [data, setData] = useState(null);
  const load = useCallback(() => api(path).then(setData).catch(() => setData(null)), [path]);
  useEffect(() => { load(); }, [load]);
  return [data, load];
}
const Badge = ({ s }) => <span className={`rounded-md border px-2.5 py-0.5 text-xs ${toneCls[tone[s]]}`}>{s}</span>;
const Delta = ({ v }) => <div className={`text-xs ${v >= 0 ? "text-green-600" : "text-red-600"}`}>{v >= 0 ? "↑" : "↓"} {Math.abs(v)}% vs last month</div>;
const Stat = ({ label, value, delta }) => <div className={card}><span className="text-mute">{label}</span><b className="my-1.5 block text-2xl">{value}</b>{delta !== undefined && <Delta v={delta} />}</div>;
const Head = ({ title, sub, action }) => <div className="mb-5 flex items-start justify-between gap-3"><div><h1 className="text-[22px] font-bold">{title}</h1><p className="mt-1 text-mute">{sub}</p></div>{action}</div>;
const Table = ({ cols, children }) => <div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr>{cols.map(c => <th key={c} className={th}>{c}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
const grid = "mb-4 grid gap-4";

function LineChart({ data }) {
  const W = 600, H = 200, max = Math.max(...data.map(d => d.total)) * 1.1;
  const pts = data.map((d, i) => [20 + i * (W - 40) / Math.max(data.length - 1, 1), H - 30 - d.total / max * (H - 50)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p.join(",")).join(" ");
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sales by month">
    <path d={`${line} L${pts.at(-1)[0]},${H - 30} L20,${H - 30}Z`} className="fill-brand/10" />
    <path d={line} className="fill-none stroke-brand" strokeWidth="2.5" />
    {pts.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="3.5" className="fill-brand" /><text x={p[0]} y={H - 10} fontSize="11" textAnchor="middle" className="fill-mute">{mlabel(data[i].m)}</text></g>)}
  </svg>;
}
function BarChart({ data }) {
  const W = 600, H = 200, max = Math.max(...data.map(d => d.total)) * 1.1, bw = (W - 40) / data.length;
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sales by month">
    {data.map((d, i) => { const h = d.total / max * (H - 50); return <g key={i}>
      <rect x={24 + i * bw} y={H - 30 - h} width={bw - 12} height={h} rx="3" className="fill-brand" />
      <text x={24 + i * bw + (bw - 12) / 2} y={H - 10} fontSize="11" textAnchor="middle" className="fill-mute">{mlabel(d.m)}</text></g>; })}
  </svg>;
}

function Login({ onIn }) {
  const [f, setF] = useState({ email: "", password: "" }), [err, setErr] = useState("");
  const go = async e => { e.preventDefault(); try { const { token } = await api("/login", f); localStorage.setItem("token", token); onIn(); } catch (x) { setErr(x.message); } };
  return <div className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
    <div className="hidden flex-col justify-between bg-gradient-to-br from-navy to-blue-800 p-12 text-white lg:flex">
      <div className="text-2xl font-extrabold tracking-wider">SAFAL<small className="block text-[9px] font-semibold tracking-[.3em]">GROUP</small></div>
      <div><h2 className="mb-3 text-4xl font-bold leading-tight">Building Africa<br />with Pride</h2><p className="max-w-xs opacity-85">Quality steel products and building solutions for a stronger tomorrow.</p></div><span /></div>
    <div className="grid place-content-center p-8"><form className="grid w-[min(380px,86vw)] gap-3" onSubmit={go}>
      <h1 className="text-[22px] font-bold">Welcome back</h1><p className="text-mute">Sign in to continue to Safal Customer & Sales Tracker</p>
      <label className={lbl}>Email address<input className={field} type="email" required placeholder="you@company.com" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
      <label className={lbl}>Password<input className={field} type="password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
      {err && <p className="text-red-600">{err}</p>}<button className={btn}>Sign in</button>
      <p className="text-mute">Demo: admin@safal.co.ke / admin123</p></form></div></div>;
}

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-10 grid place-items-center bg-navy/50" onClick={onClose}>
    <div className={`${card} w-[min(440px,92vw)]`} onClick={e => e.stopPropagation()}><h2 className="mb-3 text-[15px] font-semibold">{title}</h2>{children}</div></div>;
}

const OrderTable = ({ rows }) => <Table cols={["Order ID", "Customer", "Product", "Amount", "Date", "Status"]}>
  {rows.map(o => <tr key={o.id}><td className={td}><b>{o.order_id}</b></td><td className={td}>{o.customer}</td><td className={td}>{o.product}</td><td className={td}>{KSh(o.amount)}</td><td className={td}>{fdate(o.date)}</td><td className={td}><Badge s={o.status} /></td></tr>)}</Table>;

function Dashboard() {
  const [d] = useApi("/dashboard");
  if (!d) return <p>Loading…</p>;
  return <>
    <Head title="Good morning, Admin" sub="Here's what's happening with your business today." />
    <div className={`${grid} sm:grid-cols-2 xl:grid-cols-4`}><Stat label="Total customers" value={d.customers} /><Stat label="Total orders" value={d.orders} delta={d.orders_delta} />
      <Stat label="Total sales" value={short(d.sales)} delta={d.sales_delta} /><Stat label="Avg. order value" value={KSh(d.avg)} /></div>
    <div className={`${grid} lg:grid-cols-[2fr_1.2fr]`}><div className={card}><h2 className="mb-3 text-[15px] font-semibold">Sales overview</h2><LineChart data={d.monthly} /></div>
      <div className={card}><h2 className="mb-3 text-[15px] font-semibold">Top customers</h2><Table cols={["Customer", "Orders", "Spent"]}>
        {d.top_customers.map(c => <tr key={c.id}><td className={td}>{c.name}</td><td className={td}>{c.orders}</td><td className={td}>{short(c.spent)}</td></tr>)}</Table></div></div>
    <div className={card}><h2 className="mb-3 text-[15px] font-semibold">Recent orders</h2><OrderTable rows={d.recent} /></div></>;
}

function Customers({ open }) {
  const [q, setQ] = useState(""), [loc, setLoc] = useState(""), [type, setType] = useState(""), [adding, setAdding] = useState(false);
  const [rows, load] = useApi(`/customers?q=${encodeURIComponent(q)}&location=${loc}&type=${type}`);
  const [f, setF] = useState({ name: "", company: "", phone: "", email: "", location: "", type: "Contractor" }), [err, setErr] = useState("");
  const save = async e => { e.preventDefault(); try { await api("/customers", f); setAdding(false); load(); } catch (x) { setErr(x.message); } };
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return <>
    <Head title="Customers" sub="Manage your customer records" action={<button className={btn} onClick={() => setAdding(true)}>+ Add customer</button>} />
    <div className={card}><div className="mb-3.5 flex flex-wrap gap-2.5"><input className={`${field} min-w-44 flex-[2]`} placeholder="Search customers…" value={q} onChange={e => setQ(e.target.value)} />
      <select className={`${field} flex-1 sm:w-auto`} value={loc} onChange={e => setLoc(e.target.value)}><option value="">All locations</option>{["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Tanzania"].map(l => <option key={l}>{l}</option>)}</select>
      <select className={`${field} flex-1 sm:w-auto`} value={type} onChange={e => setType(e.target.value)}><option value="">All types</option>{["Contractor", "Distributor", "Retailer"].map(l => <option key={l}>{l}</option>)}</select></div>
      {!rows ? <p>Loading…</p> : !rows.length ? <p className="text-mute">No customers match your search.</p> :
        <Table cols={["Customer name", "Company", "Location", "Type", "Status", "Total orders", ""]}>
          {rows.map(c => <tr key={c.id}><td className={td}><b>{c.name}</b></td><td className={td}>{c.company}</td><td className={td}>{c.location}</td><td className={td}>{c.type}</td><td className={td}><Badge s={c.status} /></td><td className={td}>{c.orders}</td>
            <td className={td}><button className={ghost} onClick={() => open(c.id)}>View</button></td></tr>)}</Table>}</div>
    {adding && <Modal title="Add customer" onClose={() => setAdding(false)}><form className="grid gap-3" onSubmit={save}>
      <label className={lbl}>Customer name<input className={field} required value={f.name} onChange={set("name")} /></label><label className={lbl}>Company<input className={field} value={f.company} onChange={set("company")} /></label>
      <label className={lbl}>Phone<input className={field} value={f.phone} onChange={set("phone")} /></label><label className={lbl}>Email<input className={field} type="email" value={f.email} onChange={set("email")} /></label>
      <label className={lbl}>Location<input className={field} placeholder="Nairobi, Kenya" value={f.location} onChange={set("location")} /></label>
      <label className={lbl}>Type<select className={field} value={f.type} onChange={set("type")}><option>Contractor</option><option>Distributor</option><option>Retailer</option></select></label>
      {err && <p className="text-red-600">{err}</p>}<button className={btn}>Save customer</button></form></Modal>}</>;
}

function CustomerDetail({ id, back }) {
  const [c] = useApi("/customers/" + id);
  if (!c) return <p>Loading…</p>;
  return <>
    <button className="mb-3 cursor-pointer text-brand" onClick={back}>← Back to customers</button>
    <div className={`${card} mb-4 flex items-center gap-4`}><div className="grid size-16 place-items-center rounded-xl bg-blue-50 text-3xl">🏢</div>
      <div><h1 className="text-[22px] font-bold">{c.name} <Badge s={c.status} /></h1><p className="mt-1 text-mute">{c.type} · {c.location}</p><p className="mt-1 text-mute">{c.phone} · {c.email}</p></div></div>
    <div className={`${grid} sm:grid-cols-3`}><Stat label="Total orders" value={c.total_orders} /><Stat label="Total spent" value={KSh(c.total_spent)} /><Stat label="Average order value" value={KSh(c.avg)} /></div>
    <div className={`${grid} lg:grid-cols-[2fr_1.2fr]`}><div className={card}><h2 className="mb-3 text-[15px] font-semibold">Purchase history</h2><Table cols={["Order ID", "Product", "Amount", "Date", "Status"]}>
      {c.orders.map(o => <tr key={o.id}><td className={td}><b>{o.order_id}</b></td><td className={td}>{o.product}</td><td className={td}>{KSh(o.amount)}</td><td className={td}>{fdate(o.date)}</td><td className={td}><Badge s={o.status} /></td></tr>)}</Table></div>
      <div className={card}><h2 className="mb-3 text-[15px] font-semibold">Customer notes</h2><p className="text-mute">{c.notes || "No notes yet."}</p></div></div></>;
}

function Orders() {
  const [q, setQ] = useState(""), [cust, setCust] = useState(""), [st, setSt] = useState(""), [adding, setAdding] = useState(false);
  const [rows, load] = useApi(`/orders?q=${encodeURIComponent(q)}&customer=${encodeURIComponent(cust)}&status=${st}`);
  const [customers] = useApi("/customers"), [products] = useApi("/products");
  const [f, setF] = useState({ customer_id: "", product_id: "", quantity: "", amount: "", date: new Date().toISOString().slice(0, 10), status: "Pending" }), [err, setErr] = useState("");
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const price = products?.find(p => p.id == f.product_id)?.price;
  const save = async e => { e.preventDefault(); try { await api("/orders", f); setAdding(false); setErr(""); load(); } catch (x) { setErr(x.message); } };
  return <>
    <Head title="Orders" sub="Track and manage customer orders" action={<button className={btn} onClick={() => setAdding(true)}>+ New order</button>} />
    <div className={card}><div className="mb-3.5 flex flex-wrap gap-2.5"><input className={`${field} min-w-44 flex-[2]`} placeholder="Search orders…" value={q} onChange={e => setQ(e.target.value)} />
      <select className={`${field} flex-1 sm:w-auto`} value={cust} onChange={e => setCust(e.target.value)}><option value="">All customers</option>{customers?.map(c => <option key={c.id}>{c.name}</option>)}</select>
      <select className={`${field} flex-1 sm:w-auto`} value={st} onChange={e => setSt(e.target.value)}><option value="">All statuses</option><option>Completed</option><option>Pending</option></select></div>
      {!rows ? <p>Loading…</p> : !rows.length ? <p className="text-mute">No orders found.</p> : <OrderTable rows={rows} />}</div>
    {adding && <Modal title="New order" onClose={() => setAdding(false)}><form className="grid gap-3" onSubmit={save}>
      <label className={lbl}>Customer<select className={field} required value={f.customer_id} onChange={set("customer_id")}><option value="">Select customer</option>{customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className={lbl}>Product<select className={field} required value={f.product_id} onChange={set("product_id")}><option value="">Select product</option>{products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className={lbl}>Quantity<input className={field} type="number" min="1" required value={f.quantity} onChange={set("quantity")} /></label>
      <label className={lbl}>Amount (KSh) — leave blank to use price × quantity{price && f.quantity ? ` (${KSh(price * f.quantity)})` : ""}<input className={field} type="number" value={f.amount} onChange={set("amount")} /></label>
      <label className={lbl}>Date<input className={field} type="date" value={f.date} onChange={set("date")} /></label>
      <label className={lbl}>Status<select className={field} value={f.status} onChange={set("status")}><option>Pending</option><option>Completed</option></select></label>
      {err && <p className="text-red-600">{err}</p>}<button className={btn}>Save order</button></form></Modal>}</>;
}

function Sales() {
  const [s] = useApi("/sales");
  if (!s) return <p>Loading…</p>;
  const max = s.by_location[0]?.total || 1;
  return <>
    <Head title="Sales" sub="Your sales performance and trends" />
    <div className={`${grid} sm:grid-cols-2 xl:grid-cols-4`}><Stat label="This month" value={short(s.this_month)} /><Stat label="Last month" value={short(s.last_month)} />
      <Stat label="Growth" value={`${s.growth}%`} /><Stat label="Total orders" value={s.orders} /></div>
    <div className={`${grid} lg:grid-cols-2`}><div className={card}><h2 className="mb-3 text-[15px] font-semibold">Sales by month</h2><BarChart data={s.monthly} /></div>
      <div className={card}><h2 className="mb-3 text-[15px] font-semibold">Sales by location</h2>{s.by_location.map(l => <div className="my-3 grid grid-cols-[90px_1fr_64px] items-center gap-2.5 text-[13px]" key={l.location}><span>{l.location}</span>
        <div className="h-2 rounded bg-blue-100"><div className="h-full rounded bg-brand" style={{ width: l.total / max * 100 + "%" }} /></div><span>{short(l.total)}</span></div>)}</div></div></>;
}

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("token")), [page, setPage] = useState("Dashboard"), [cid, setCid] = useState(null);
  if (!authed) return <Login onIn={() => setAuthed(true)} />;
  const go = p => { setPage(p); setCid(null); };
  const nav = "cursor-pointer rounded-lg px-3 py-2.5 text-left hover:bg-white/10";
  return <div className="flex min-h-screen"><nav className="sticky top-0 flex h-screen w-16 shrink-0 flex-col gap-1 bg-navy px-3 py-5 text-blue-100 lg:w-52">
    <div className="px-2.5 pb-6 text-[22px] font-extrabold tracking-wider text-white"><span className="lg:hidden">S</span><span className="hidden lg:block">SAFAL<small className="block text-[9px] font-semibold tracking-[.3em]">GROUP</small></span></div>
    {["Dashboard", "Customers", "Orders", "Sales"].map(p => <button key={p} className={`${nav} ${page === p ? "bg-brand text-white hover:bg-brand" : ""}`} onClick={() => go(p)}><span className="lg:hidden">{p[0]}</span><span className="hidden lg:inline">{p}</span></button>)}
    <button className={`${nav} mt-auto`} onClick={() => { localStorage.removeItem("token"); setAuthed(false); }}><span className="lg:hidden">⎋</span><span className="hidden lg:inline">Sign out</span></button></nav>
    <main className="min-w-0 flex-1 p-4 sm:p-8">
      {page === "Dashboard" && <Dashboard />}
      {page === "Customers" && (cid ? <CustomerDetail id={cid} back={() => setCid(null)} /> : <Customers open={setCid} />)}
      {page === "Orders" && <Orders />}{page === "Sales" && <Sales />}</main></div>;
}
