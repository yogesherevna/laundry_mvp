# Laundry Software - Real SQLite Version

This version is NOT static mock data.

## Data storage

The app uses `@capacitor-community/sqlite`.

- Android/iOS: native SQLite database.
- Browser development: SQLite is backed by `jeep-sqlite`/sql.js and persisted in IndexedDB.
- The application tables are real SQLite tables:
  - customers
  - service_items
  - orders
  - order_items
  - payments
  - app_settings

The SQLite plugin is a current community plugin for native SQLite; its docs specify using `execute` for DDL and `run` for bound INSERT/UPDATE/DELETE and `query` for SELECT. Web storage uses jeep-sqlite. See the official plugin documentation.

## Run in browser

```bash
npm install
npm run dev
```

Create an order, refresh the browser, and the order remains because it is stored in the SQLite web store.

## Run Android

Prerequisites: Android Studio and Android SDK.

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Then run the Android app from Android Studio.

For later changes:

```bash
npm run android
```

## Important

Demo rows are inserted ONLY the first time the database is empty. They are not read from a static TypeScript array.

## Current real flow

New Order
 -> SQLite customers/orders/order_items/payments
 -> Receipt reads SQLite

Deliver Order
 -> SQLite payment INSERT + order UPDATE
 -> Dashboard/Pending/Customer/Reports read SQLite

Settings
 -> service_items rates are updated in SQLite

## Next development

1. Replace demo date with real device date.
2. Add proper date picker.
3. Add order edit/cancel.
4. Add database backup/export.
5. Add login.
6. Add Node.js/PostgreSQL sync.
7. Add printer and WhatsApp.
