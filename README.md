# Safal Customer & Sales Tracker
React + Tailwind CSS + Flask + SQLite. Sample data only — inspired by a regional building-solutions company, not a real Safal system.

## Run
Backend (terminal 1):
    cd backend && pip install -r requirements.txt && python app.py      # http://127.0.0.1:5000
Frontend (terminal 2):
    cd frontend && npm install && npm run dev                           # http://localhost:5173
Login: admin@safal.co.ke / admin123

## Structure
backend/app.py  – schema (customers, products, orders), seed data, REST API
frontend/src/App.jsx – Login, Dashboard, Customers (+details), Orders, Sales
