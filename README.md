# Inventory & Daily Reconciliation App

A simple, beginner-friendly app built around three things:

1. **Stock is kept accurate** — it goes down when an employee records a sale,
   and up when the owner restocks.
2. **Employees record what was sold at the end of the day**, plus any notes
   for the owner.
3. **The owner compares money brought to them against what was actually
   sold**, and instantly sees whether it matches.

## Setup

1. Install [Node.js](https://nodejs.org/) v22.5 or later.
2. In this folder, run:
   ```
   npm install
   npm run seed
   npm start
   ```
3. Open http://localhost:3000 in your browser.
4. Log in with the owner account printed by the seed step:
   - username: `owner`
   - password: `changeme123`

## How it works

**As the owner**, you:
- Add products to the catalog (name, price, starting quantity)
- Add employee logins
- Restock items as new deliveries arrive
- At the end of the day, look at each employee's submission and enter the
  actual cash they brought you — the app tells you immediately if it
  matches what should have been earned from the items sold

**As an employee**, you:
- At the end of your shift, enter how many of each item were sold
- Add any notes the owner should know about
- Submit — this automatically reduces the stock counts and calculates the
  expected revenue for the owner to check against

## Project structure

```
inventory-app/
  server.js                 - Express app entrypoint
  db.js                     - SQLite schema + connection
  seed.js                   - Creates the first owner account + sample products
  middleware/auth.js        - JWT auth + role-checking
  routes/auth.js            - Login, employee account creation
  routes/products.js        - Product catalog + restocking
  routes/daily-records.js   - End-of-day sales submission + cash reconciliation
  public/
    index.html              - Login page
    employee.html / .js     - End-of-day sales recording
    owner.html / .js        - Restock, product/employee management, reconciliation
    shared.js                - Auth state + API helper used by every page
    style.css                - Shared styling
```

## Suggested next steps

- Add a way to edit or correct a submitted daily record.
- Add a simple history view so the owner can look back at past weeks.
- Add a "change password" feature (none is built in yet).

## Deploying (Render)

Settings Render needs:

| Setting | Value |
|---|---|
| Build Command | `npm install` |
| Start Command | `npm start` |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | a long random string (keep it private) |
| `OWNER_PASSWORD` | your owner password, at least 8 characters |
| `OWNER_USERNAME` | optional, defaults to `owner` |
| `DB_PATH` | only if you attach a persistent disk, e.g. `/var/data/inventory.db` |

In production the server refuses to start if `JWT_SECRET` or `OWNER_PASSWORD`
is missing. The owner account is created automatically on first start.

**Important:** Render's free tier has an ephemeral filesystem, so the SQLite
database is wiped on restarts and redeploys. Free hosting is fine for a demo.
For the shop's real records, use a paid instance with a persistent disk and
set `DB_PATH` to a file inside the disk's mount path.
