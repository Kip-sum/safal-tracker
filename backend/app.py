import os, sqlite3, random, secrets
from datetime import date, timedelta
from flask import Flask, request, jsonify, g

DB = os.path.join(os.path.dirname(__file__), "safal.db")
app = Flask(__name__)
TOKENS = set()
ADMIN = ("admin@safal.co.ke", "admin123")

def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close(_):
    d = g.pop("db", None)
    if d: d.close()

def rows(sql, args=()):
    return [dict(r) for r in db().execute(sql, args).fetchall()]

def one(sql, args=()):
    r = db().execute(sql, args).fetchone()
    return dict(r) if r else None

@app.before_request
def auth():
    if request.path.startswith("/api") and request.path != "/api/login":
        if request.headers.get("Authorization", "").replace("Bearer ", "") not in TOKENS:
            return jsonify(error="Please sign in"), 401

SCHEMA = """
CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY, name TEXT, company TEXT, phone TEXT,
  email TEXT, location TEXT, type TEXT, status TEXT DEFAULT 'Active', notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id),
  product_id INTEGER REFERENCES products(id), quantity INTEGER, amount REAL, date TEXT, status TEXT);
"""

def init_db():
    c = sqlite3.connect(DB)
    c.executescript(SCHEMA)
    if not c.execute("SELECT 1 FROM customers").fetchone():
        random.seed(7)
        cust = [("ABC Builders Ltd","ABC Construction","Nairobi, Kenya","Contractor","Active","Reliable customer with consistent orders. Primarily purchases roofing and steel products."),
                ("XYZ Hardware","XYZ Hardware Stores","Mombasa, Kenya","Distributor","Active",""),
                ("East Africa Ltd","East Africa Builders","Kisumu, Kenya","Contractor","Active",""),
                ("Kiptoo Hardware","Kiptoo Hardware","Nakuru, Kenya","Retailer","Inactive",""),
                ("Mombasa Supplies","Mombasa Building Sup.","Mombasa, Kenya","Distributor","Active",""),
                ("Kilimani Contractors","Kilimani Group","Nairobi, Kenya","Contractor","Active",""),
                ("Lake Region Dealers","Lake Region Ltd","Kisumu, Kenya","Distributor","Active",""),
                ("Dar Steel Traders","Dar Steel Co.","Dar es Salaam, Tanzania","Distributor","Active","")]
        for i, (n, co, loc, t, s, notes) in enumerate(cust, 1):
            c.execute("INSERT INTO customers VALUES(?,?,?,?,?,?,?,?,?)",
                (i, n, co, f"07{random.randint(10,99)} {random.randint(100,999)} {random.randint(100,999)}",
                 n.split()[0].lower() + "@example.co.ke", loc, t, s, notes))
        prods = [("Roofing Sheet","Roofing",500),("Steel Panel","Steel",600),("Roofing Accessories","Roofing",250),
                 ("Building Materials","General",400),("Accessories","General",150)]
        for i, p in enumerate(prods, 1): c.execute("INSERT INTO products VALUES(?,?,?,?)", (i, *p))
        fixed = [(1,1,500,250000,"2026-10-20","Completed"),(2,2,300,180000,"2026-10-21","Completed"),
                 (3,1,640,320000,"2026-10-22","Pending")]
        for cid, pid, q, a, d, s in fixed:
            c.execute("INSERT INTO orders(customer_id,product_id,quantity,amount,date,status) VALUES(?,?,?,?,?,?)", (cid,pid,q,a,d,s))
        for _ in range(60):
            pid = random.randint(1, 5); q = random.randint(20, 600)
            d = date(2026, 1, 1) + timedelta(days=random.randint(0, 295))
            c.execute("INSERT INTO orders(customer_id,product_id,quantity,amount,date,status) VALUES(?,?,?,?,?,?)",
                (random.choices(range(1, 9), [5,3,3,1,2,2,2,2])[0], pid, q, q * prods[pid-1][2],
                 d.isoformat(), random.choice(["Completed"]*4 + ["Pending"])))
        c.commit()
    c.close()

ORDER_SQL = """SELECT printf('ORD-%03d', o.id) AS order_id, o.id, c.name AS customer, p.name AS product,
  o.quantity, o.amount, o.date, o.status FROM orders o JOIN customers c ON c.id=o.customer_id
  JOIN products p ON p.id=o.product_id"""

@app.post("/api/login")
def login():
    d = request.json or {}
    if (d.get("email"), d.get("password")) != ADMIN:
        return jsonify(error="Incorrect email or password"), 401
    t = secrets.token_hex(16); TOKENS.add(t)
    return jsonify(token=t)

def pct(a, b): return round((a - b) / b * 100) if b else 0

def monthly():
    return rows("SELECT strftime('%Y-%m', date) m, SUM(amount) total, COUNT(*) n FROM orders GROUP BY m ORDER BY m")

@app.get("/api/dashboard")
def dashboard():
    m = monthly(); cur, prev = (m[-1], m[-2]) if len(m) > 1 else (m[-1], {"total": 0, "n": 0})
    tot = one("SELECT COUNT(*) n, SUM(amount) s FROM orders")
    ncust = one("SELECT COUNT(*) n FROM customers")["n"]
    return jsonify(customers=ncust, orders=tot["n"], sales=tot["s"], avg=tot["s"] / tot["n"],
        sales_delta=pct(cur["total"], prev["total"]), orders_delta=pct(cur["n"], prev["n"]),
        monthly=m,
        top_customers=rows("""SELECT c.id, c.name, COUNT(*) orders, SUM(o.amount) spent FROM orders o
            JOIN customers c ON c.id=o.customer_id GROUP BY c.id ORDER BY spent DESC LIMIT 5"""),
        recent=rows(ORDER_SQL + " ORDER BY o.date DESC, o.id DESC LIMIT 5"))

@app.get("/api/customers")
def customers():
    q, loc, t = (request.args.get(k, "") for k in ("q", "location", "type"))
    return jsonify(rows("""SELECT c.*, (SELECT COUNT(*) FROM orders WHERE customer_id=c.id) orders FROM customers c
        WHERE (c.name LIKE ? OR c.company LIKE ?) AND c.location LIKE ? AND c.type LIKE ? ORDER BY c.id""",
        (f"%{q}%", f"%{q}%", f"%{loc}%", f"%{t}%")))

@app.post("/api/customers")
def add_customer():
    d = request.json or {}
    if not d.get("name"): return jsonify(error="Customer name is required"), 400
    cur = db().execute("INSERT INTO customers(name,company,phone,email,location,type,status) VALUES(?,?,?,?,?,?,'Active')",
        (d["name"], d.get("company", ""), d.get("phone", ""), d.get("email", ""), d.get("location", ""), d.get("type", "Contractor")))
    db().commit()
    return jsonify(id=cur.lastrowid), 201

@app.get("/api/customers/<int:cid>")
def customer(cid):
    c = one("SELECT * FROM customers WHERE id=?", (cid,))
    if not c: return jsonify(error="Customer not found"), 404
    s = one("SELECT COUNT(*) n, COALESCE(SUM(amount),0) s FROM orders WHERE customer_id=?", (cid,))
    c.update(total_orders=s["n"], total_spent=s["s"], avg=s["s"] / s["n"] if s["n"] else 0,
             orders=rows(ORDER_SQL + " WHERE o.customer_id=? ORDER BY o.date DESC", (cid,)))
    return jsonify(c)

@app.get("/api/products")
def products(): return jsonify(rows("SELECT * FROM products"))

@app.get("/api/orders")
def orders():
    q, cust, st = (request.args.get(k, "") for k in ("q", "customer", "status"))
    return jsonify(rows(ORDER_SQL + """ WHERE (printf('ORD-%03d', o.id) LIKE ? OR p.name LIKE ?)
        AND c.name LIKE ? AND o.status LIKE ? ORDER BY o.date DESC, o.id DESC""", (f"%{q}%", f"%{q}%", f"%{cust}%", f"%{st}%")))

@app.post("/api/orders")
def add_order():
    d = request.json or {}
    p = one("SELECT * FROM products WHERE id=?", (d.get("product_id"),))
    if not p or not d.get("customer_id") or int(d.get("quantity") or 0) < 1:
        return jsonify(error="Choose a customer, product and quantity"), 400
    qty = int(d["quantity"]); amount = float(d.get("amount") or qty * p["price"])
    cur = db().execute("INSERT INTO orders(customer_id,product_id,quantity,amount,date,status) VALUES(?,?,?,?,?,?)",
        (d["customer_id"], p["id"], qty, amount, d.get("date") or date.today().isoformat(), d.get("status", "Pending")))
    db().commit()
    return jsonify(id=cur.lastrowid), 201

@app.get("/api/sales")
def sales():
    m = monthly(); cur, prev = m[-1], (m[-2] if len(m) > 1 else {"total": 0})
    tot = one("SELECT COUNT(*) n, SUM(amount) s FROM orders")
    loc = rows("""SELECT TRIM(SUBSTR(c.location, 1, INSTR(c.location||',', ',')-1)) location, SUM(o.amount) total
        FROM orders o JOIN customers c ON c.id=o.customer_id GROUP BY location ORDER BY total DESC""")
    return jsonify(this_month=cur["total"], last_month=prev["total"], growth=pct(cur["total"], prev["total"]),
        total=tot["s"], orders=tot["n"], avg=tot["s"] / tot["n"], monthly=m, by_location=loc)

init_db()
if __name__ == "__main__":
    app.run(debug=True, port=5000)
