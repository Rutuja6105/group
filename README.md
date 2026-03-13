# शिवतेज Group Finance — Render Deployment

## Deploy Steps

### 1. Upload to GitHub
Create new repo and upload all files from this ZIP.

### 2. Deploy on Render
- render.com → New → Web Service → connect GitHub repo
- Build Command: npm install && npm run build
- Start Command: node server.js

### 3. Add Environment Variable
Key: DATABASE_URL
Value: postgresql://postgres:YOUR_PASSWORD@db.voaniokkktdmpatipdze.supabase.co:5432/postgres

### 4. Click Deploy!

Login: treasurer / shivtej@2025
