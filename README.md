# Election Desk | Supabase Web Application

A responsive, high-performance Election Management Web Application built with **React**, **Tailwind CSS**, and **Supabase (PostgreSQL)**.

---

## Live Database Backend
- **Supabase Project:** `cvrcipyodrlwaqhwrqoi.supabase.co`
- **Total Real Voters in Supabase:** **754 electors** (Kadiyapulanka Ward 2)
- **Voter Photos Linked:** **846 photos** in `/Photos/`

---

## Key Features

1. **Role-Based Authentication (4 Roles)**
   - Accounts configured directly in the Supabase `public.users` table:
     - **`admin`** (`admin` / `admin123`): Full rights (voters, amounts, party tags, user management, CSV import/export)
     - **`agent`** (`agent` / `agent123`): Authorized to edit Party Tags (`isysrcp`, `isTDP`, `isJSP`, `other`)
     - **`user`** (`user` / `user123`): Strictly read-only access
     - **`distributor`** (`distributor` / `dist123`): Authorized to change Amount and notes
   - **Admin User Management:** Administrators can add new users and edit existing accounts directly from the UI.

2. **Supabase Live Dashboard**
   - **Total Voters** tally directly from Supabase `public.voters`.
   - **isysrcp**: Live count & percentage.
   - **isTDP**: Live count & percentage.
   - **isJSP**: Live count & percentage.
   - **other**: Live count & percentage.
   - **amount**: Total disbursed funds in INR and funded voter count.
   - Visual progress bar showing live party breakdown from PostgreSQL.

3. **Voter Roll (Web & Mobile Experience)**
   - **Real Photo Display**: Each voter's real face photo is loaded from `/Photos/page_XX_row_YY_photo_ZZ.jpg`. Click any photo to enlarge.
   - **One-Tap Party Tagging**: Instantly updates `isysrcp`, `isTDP`, `isJSP`, `other` directly in Supabase.
   - **Disbursement Tracking**: Modal to enter `amount`, `amountgivenuser`, `amountgivenTime`, and `note`, writing straight to Supabase.
   - **Telugu & English Search**: Live filter across voter names, EPIC ID, house number, and serial number.
   - **Filter Tabs**: Filter by party (`isysrcp`, `isTDP`, `isJSP`, `other`) or payment status (`amount > 0`).

4. **CSV Import & Export (Exact Supabase Columns)**
   - Supports:
     `serial_number, voter_id, voter_name_telugu, voter_name_english, relative_name, relation_type, house_number, age, gender, ward_number, image_path, is_verified, isysrcp, isTDP, isJSP, other, amount, amountgivenuser, amountgivenTime, note`
   - One-click **"Sample CSV"** button to download the formatted template.

---

## Page Routes (React Router)

The application uses standard `react-router-dom` navigation with real browser URLs:
- **`/login`**: Sign-in page authenticated against Supabase `public.users`.
- **`/` (or `/dashboard`)**: Live analytical metrics, party breakdowns, and disbursement tallies.
- **`/voters`**: Full electoral directory with real photos, search, party tags, and amount modals.
- **`/users`**: User management table for Administrators to add, edit, and delete staff accounts.
- Automatic route protection and redirect to `/login` for unauthenticated sessions.

---

## How to Run

```bash
# 1. Start the web application
npm run dev
```

Open the local URL (typically `http://localhost:5173`) in your desktop or mobile browser.
