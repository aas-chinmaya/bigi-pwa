# InvoiceFlow — Step 0 setup (online + offline)

## A. Create a NEW Supabase project

1. Go to https://supabase.com → New project  
2. Wait until the project is ready  
3. Open **SQL Editor** → New query → paste **entire** file `supabase/schema.sql` → Run  
4. **Authentication → Providers → Email** → enable  
   - For testing: Authentication → Settings → disable “Confirm email”  
5. **Project Settings → API**
   - Copy **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Only these two env vars are required for the app:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Do **not** put service_role, JWT secret, or database password in the frontend / Vercel public env.

---

## B. Local run

```bash
unzip invoiceflow.zip
cd invoiceflow
cp .env.example .env.local
# paste URL + anon key into .env.local

npm install
npm run dev
```

Open http://localhost:3000

---

## C. Vercel

1. Import the `invoiceflow` folder as a project  
2. **Settings → Environment Variables** add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   (same values as local)  
3. Redeploy  

If you used the Vercel Supabase integration, map:

| Vercel name | App name |
|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | same |
| `SUPABASE_ANON_KEY` | also set as `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

The browser only sees variables that start with `NEXT_PUBLIC_`.

---

## D. First use (fixes “Business profile missing”)

1. **Register** (name + business name + state + email + password)  
2. If you already registered before schema was applied:  
   - Open **Business** in the top nav → fill form → Save  
3. **New invoice** → select a previous customer or add one, then choose a saved item or enter a custom item → Save draft / Issue  
4. Open invoice → **Download PDF** or **Print**  
5. **Edit** / **Delete** from detail page  

---

## E. Online vs offline (Dexie + PWA)

| Action | Online | Offline |
|--------|--------|---------|
| List invoices | Supabase | Last list and queued invoices from IndexedDB |
| Create invoice | Supabase | Saved on this device → syncs when reconnected |
| Edit / Delete | Supabase | Queued offline invoices can be edited; deleting synced invoices needs online |
| PDF | From loaded detail | Available for queued invoices; open saved invoices online |
| Business profile | Supabase + cache | Cache after one online save |

Sign in and open the app online at least once before working offline. The saved browser session, business profile, invoice list, and app pages are then available on that device. Keep the app installed or revisit its pages while online so the service worker can cache the app shell and required files. Unsynced invoices are preserved if you try to log out; reconnect and sync them first.

---

## F. Security note

If you pasted `service_role`, JWT secret, or DB password in chat or a public place:  
**rotate them** in Supabase (Settings → API / Database) and update only local/Vercel secrets — never commit them.
