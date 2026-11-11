# Biginex

Minimal GST invoicing — **4 main routes**, PDF, offline, installable PWA.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Landing |
| `/login` | Sign in |
| `/register` | Sign up + business name |
| `/invoices` | List |
| `/invoices/new` | Create (customer + items as **rows**, static sample chips) |
| `/invoices/[id]` | Detail · **Print** · **Download PDF** |

No separate customers/products pages.

## Setup (new Supabase project)

1. Create a **new** project at supabase.com  
2. SQL Editor → run `supabase/schema.sql`  
3. Auth → Email on (optional: disable confirm email for local)  
4. Auth URLs: Site `http://localhost:3000`, Redirect `http://localhost:3000/**`  
5. Copy URL + anon key  

```bash
cp .env.example .env.local
# fill keys
npm install
npm run dev
```

PWA: `npm run build && npm start` then Install from browser.

## Offline

- Create invoice offline → Dexie queue → auto-sync when online  
- List uses last cached data offline  
