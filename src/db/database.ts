import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';
import 'jeep-sqlite';

const DB_NAME = 'laundry';
const DB_VERSION = 1;

let initialized = false;

const sqlite = CapacitorSQLite as any;

async function prepareWeb() {
  if (Capacitor.getPlatform() !== 'web') return;

  await customElements.whenDefined('jeep-sqlite');
  await sqlite.initWebStore();
}

async function ensureConnection() {
  await prepareWeb();

  /*
   * IMPORTANT:
   * Do NOT call isDBExists() here.
   *
   * isDBExists() requires an opened database connection.
   * On first Android launch there is no connection yet.
   *
   * Instead:
   * 1. Check whether a connection already exists.
   * 2. Create the connection if required.
   * 3. Open the connection.
   */

  let connectionExists = false;

  try {
    const connection = await sqlite.isConnection({
      database: DB_NAME,
      readonly: false
    });

    connectionExists = !!connection.result;
  } catch {
    connectionExists = false;
  }

  if (!connectionExists) {
    try {
      await sqlite.createConnection({
        database: DB_NAME,
        version: DB_VERSION,
        encrypted: false,
        mode: 'no-encryption',
        readonly: false
      });
    } catch (error: any) {
      /*
       * It is possible that the connection was created by
       * another initialization call between isConnection()
       * and createConnection().
       *
       * Continue and check/open it below.
       */
      console.log('SQLite createConnection:', error);
    }
  }

  /*
   * Now the connection should exist.
   * Check whether it is open.
   */
  try {
    const open = await sqlite.isDBOpen({
      database: DB_NAME,
      readonly: false
    });

    if (!open.result) {
      await sqlite.open({
        database: DB_NAME,
        readonly: false
      });
    }
  } catch (error) {
    /*
     * If the connection was not available, try creating it once
     * more and then open it.
     */
    await sqlite.createConnection({
      database: DB_NAME,
      version: DB_VERSION,
      encrypted: false,
      mode: 'no-encryption',
      readonly: false
    });

    await sqlite.open({
      database: DB_NAME,
      readonly: false
    });
  }
}

async function exec(statements: string) {
  return sqlite.execute({
    database: DB_NAME,
    statements,
    transaction: true,
    readonly: false
  });
}

async function run(statement: string, values: any[] = []) {
  return sqlite.run({
    database: DB_NAME,
    statement,
    values,
    transaction: true,
    readonly: false
  });
}

export async function query<T = any>(
  statement: string,
  values: any[] = []
): Promise<T[]> {
  const result = await sqlite.query({
    database: DB_NAME,
    statement,
    values,
    readonly: false
  });

  return (result.values ?? []) as T[];
}

export async function initDatabase() {
  if (initialized) return;

  await ensureConnection();

  await exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL UNIQUE,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS service_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      rate REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      order_date TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      balance_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'READY',
      payment_mode TEXT NOT NULL DEFAULT 'CASH',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      service_item_id INTEGER,
      item_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(service_item_id) REFERENCES service_items(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_orders_mobile_date
      ON orders(customer_id, order_date);

    CREATE INDEX IF NOT EXISTS idx_orders_status_delivery
      ON orders(status, delivery_date);
  `);

  const itemCount = await query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM service_items`
  );

  if (Number(itemCount[0]?.count ?? 0) === 0) {
    const defaults = [
      ['शर्ट', 10],
      ['पॅन्ट', 15],
      ['टी-शर्ट', 10],
      ['साडी', 30],
      ['बेडशीट', 40],
      ['ब्लँकेट', 80],
      ['इतर', 20]
    ];

    for (const [name, rate] of defaults) {
      await run(
        `INSERT INTO service_items(name, rate) VALUES(?, ?)`,
        [name, rate]
      );
    }
  }

  const orderCount = await query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM orders`
  );

  if (Number(orderCount[0]?.count ?? 0) === 0) {
    await seedDemoData();
  }

  initialized = true;
}

async function getOrCreateCustomer(
  name: string,
  mobile: string,
  address: string
) {
  const found = await query<{ id: number }>(
    `SELECT id FROM customers WHERE mobile = ? LIMIT 1`,
    [mobile]
  );

  if (found[0]?.id) {
    await run(
      `UPDATE customers SET name = ?, address = ? WHERE id = ?`,
      [name, address, found[0].id]
    );

    return found[0].id;
  }

  const result = await run(
    `INSERT INTO customers(name, mobile, address) VALUES(?,?,?)`,
    [name, mobile, address]
  );

  return Number(result.changes?.lastId);
}

export async function createOrder(input: {
  name: string;
  mobile: string;
  address: string;
  deliveryDate: string;
  paid: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD';
  items: {
    name: string;
    qty: number;
    rate: number;
  }[];
}) {
  const customerId = await getOrCreateCustomer(
    input.name,
    input.mobile,
    input.address
  );

  const total = input.items.reduce(
    (s, i) => s + i.qty * i.rate,
    0
  );

  const paid = Math.min(
    Math.max(input.paid, 0),
    total
  );

  const balance = total - paid;

  const id = `LDR${String(Date.now()).slice(-8)}`;

  /*
   * FIX:
   * customerId was previously calculated but was missing
   * from the INSERT values.
   */
  await run(
    `
      INSERT INTO orders
        (
          id,
          customer_id,
          order_date,
          delivery_date,
          total_amount,
          paid_amount,
          balance_amount,
          status,
          payment_mode
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'READY', ?)
    `,
    [
      id,
      customerId,
      today(),
      input.deliveryDate,
      total,
      paid,
      balance,
      input.paymentMode
    ]
  );

  for (const item of input.items) {
    const service = await query<{ id: number }>(
      `SELECT id FROM service_items WHERE name = ? LIMIT 1`,
      [item.name]
    );

    await run(
      `
        INSERT INTO order_items
          (
            order_id,
            service_item_id,
            item_name,
            qty,
            rate,
            amount
          )
        VALUES(?,?,?,?,?,?)
      `,
      [
        id,
        service[0]?.id ?? null,
        item.name,
        item.qty,
        item.rate,
        item.qty * item.rate
      ]
    );
  }

  if (paid > 0) {
    await run(
      `
        INSERT INTO payments
          (order_id, amount, payment_mode)
        VALUES(?,?,?)
      `,
      [id, paid, input.paymentMode]
    );
  }

  return getOrder(id);
}

export async function addDeliveryPayment(
  orderId: string,
  amount: number,
  mode: 'CASH' | 'UPI' | 'CARD'
) {
  const rows = await query<any>(
    `
      SELECT
        total_amount AS total,
        paid_amount AS paid,
        balance_amount AS balance
      FROM orders
      WHERE id = ?
    `,
    [orderId]
  );

  const order = rows[0];

  const receive = Math.min(
    Math.max(amount, 0),
    Number(order?.balance ?? 0)
  );

  await run(
    `
      UPDATE orders
      SET
        paid_amount = paid_amount + ?,
        balance_amount = balance_amount - ?,
        status = 'DELIVERED',
        payment_mode = ?
      WHERE id = ?
    `,
    [receive, receive, mode, orderId]
  );

  if (receive > 0) {
    await run(
      `
        INSERT INTO payments
          (order_id, amount, payment_mode)
        VALUES(?,?,?)
      `,
      [orderId, receive, mode]
    );
  }

  return getOrder(orderId);
}

export async function getOrder(id: string) {
  const rows = await query<any>(
    `
      SELECT
        o.id,
        c.name AS customerName,
        c.mobile,
        c.address,
        o.order_date AS orderDate,
        o.delivery_date AS deliveryDate,
        o.total_amount AS total,
        o.paid_amount AS paid,
        o.balance_amount AS balance,
        o.status,
        o.payment_mode AS paymentMode
      FROM orders o
      JOIN customers c
        ON c.id = o.customer_id
      WHERE o.id = ?
    `,
    [id]
  );

  if (!rows[0]) return null;

  const items = await query<any>(
    `
      SELECT
        item_name AS name,
        qty,
        rate
      FROM order_items
      WHERE order_id = ?
      ORDER BY id
    `,
    [id]
  );

  return {
    ...rows[0],
    items
  };
}

export async function getOrders(status?: string) {
  const where = status
    ? `WHERE o.status = ?`
    : '';

  const values = status
    ? [status]
    : [];

  const rows = await query<any>(
    `
      SELECT
        o.id,
        c.name AS customerName,
        c.mobile,
        c.address,
        o.order_date AS orderDate,
        o.delivery_date AS deliveryDate,
        o.total_amount AS total,
        o.paid_amount AS paid,
        o.balance_amount AS balance,
        o.status,
        o.payment_mode AS paymentMode
      FROM orders o
      JOIN customers c
        ON c.id = o.customer_id
      ${where}
      ORDER BY o.created_at DESC
    `,
    values
  );

  for (const row of rows) {
    row.items = await query(
      `
        SELECT
          item_name AS name,
          qty,
          rate
        FROM order_items
        WHERE order_id = ?
        ORDER BY id
      `,
      [row.id]
    );
  }

  return rows;
}

export async function getCustomers() {
  return query<any>(
    `
      SELECT
        c.id,
        c.name,
        c.mobile,
        c.address,
        COUNT(o.id) AS orderCount,
        COALESCE(SUM(o.total_amount),0) AS totalSpent,
        COALESCE(SUM(o.paid_amount),0) AS paidAmount,
        COALESCE(SUM(o.balance_amount),0) AS balanceAmount
      FROM customers c
      LEFT JOIN orders o
        ON o.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `
  );
}

export async function getCustomerOrders(mobile: string) {
  const rows = await getOrders();

  return rows.filter(
    (o: any) => o.mobile === mobile
  );
}

export async function getStats() {
  const currentDate = today();

  const rows = await query<any>(
    `
      SELECT
        COUNT(*) AS totalOrders,
        COALESCE(SUM(total_amount),0) AS totalAmount,
        COALESCE(SUM(paid_amount),0) AS paidAmount,
        COALESCE(SUM(balance_amount),0) AS balanceAmount,
        COALESCE(
          SUM(
            CASE
              WHEN status = 'READY'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS pendingDelivery
      FROM orders
    `
  );

  const todayRows = await query<any>(
    `
      SELECT
        COUNT(*) AS orders,
        COALESCE(SUM(paid_amount),0) AS collection
      FROM orders
      WHERE order_date = ?
    `,
    [currentDate]
  );

  return {
    ...rows[0],
    todayOrders: todayRows[0]?.orders ?? 0,
    todayCollection: todayRows[0]?.collection ?? 0
  };
}

export async function getItemReport() {
  return query<any>(
    `
      SELECT
        item_name AS name,
        SUM(qty) AS qty,
        SUM(amount) AS amount
      FROM order_items
      GROUP BY item_name
      ORDER BY amount DESC
    `
  );
}

export async function getPaymentTotals() {
  return query<any>(
    `
      SELECT
        payment_mode AS mode,
        COALESCE(SUM(amount),0) AS amount
      FROM payments
      GROUP BY payment_mode
    `
  );
}

export async function getServiceItems() {
  return query<any>(
    `
      SELECT
        id,
        name,
        rate
      FROM service_items
      WHERE is_active = 1
      ORDER BY id
    `
  );
}

export async function updateServiceRate(
  id: number,
  rate: number
) {
  await run(
    `UPDATE service_items SET rate = ? WHERE id = ?`,
    [rate, id]
  );
}

export async function updateSettings(
  values: Record<string, string>
) {
  for (const [key, value] of Object.entries(values)) {
    await run(
      `
        INSERT INTO app_settings(key,value)
        VALUES(?,?)
        ON CONFLICT(key)
        DO UPDATE SET value=excluded.value
      `,
      [key, value]
    );
  }
}

function today() {
  const now = new Date();

  const day = String(
    now.getDate()
  ).padStart(2, '0');

  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');

  const year = now.getFullYear();

  return `${day}-${month}-${year}`;
}

async function seedDemoData() {
  const demos = [
    [
      'योगेश',
      '9876543210',
      'पुणे',
      '20-06-2024',
      [
        ['शर्ट', 5, 10],
        ['पॅन्ट', 3, 15],
        ['टी-शर्ट', 2, 10],
        ['साडी', 1, 30]
      ],
      100,
      'CASH'
    ],

    [
      'राहुल',
      '8765432109',
      'पुणे',
      '20-06-2024',
      [
        ['शर्ट', 20, 10]
      ],
      200,
      'UPI'
    ],

    [
      'अमित',
      '9638527410',
      'पुणे',
      '21-06-2024',
      [
        ['पॅन्ट', 8, 15],
        ['साडी', 4, 50]
      ],
      200,
      'CASH'
    ],

    [
      'स्नेहा',
      '7894561230',
      'पुणे',
      '21-06-2024',
      [
        ['शर्ट', 8, 10],
        ['साडी', 2, 50]
      ],
      180,
      'UPI'
    ],

    [
      'रमेश',
      '9517534562',
      'पुणे',
      '22-06-2024',
      [
        ['ब्लँकेट', 2, 80],
        ['पॅन्ट', 4, 25]
      ],
      200,
      'CASH'
    ],

    [
      'पूजा',
      '7418529630',
      'पुणे',
      '22-06-2024',
      [
        ['साडी', 5, 30]
      ],
      150,
      'UPI'
    ],

    [
      'करण',
      '8529637410',
      'पुणे',
      '23-06-2024',
      [
        ['शर्ट', 5, 10],
        ['पॅन्ट', 2, 20]
      ],
      50,
      'CASH'
    ],

    [
      'नेहा',
      '9637418520',
      'पुणे',
      '23-06-2024',
      [
        ['शर्ट', 12, 10],
        ['टी-शर्ट', 12, 10]
      ],
      240,
      'UPI'
    ]
  ];

  for (
    const [
      name,
      mobile,
      address,
      deliveryDate,
      items,
      paid,
      mode
    ] of demos as any[]
  ) {
    const customerId =
      await getOrCreateCustomer(
        name,
        mobile,
        address
      );

    const total = items.reduce(
      (s: any, i: any) =>
        s + i[1] * i[2],
      0
    );

    const id =
      `DEMO${String(Math.random()).slice(2, 8)}`;

    const status =
      name === 'योगेश' ||
      name === 'राहुल' ||
      name === 'अमित' ||
      name === 'स्नेहा' ||
      name === 'रमेश' ||
      name === 'पूजा' ||
      name === 'करण' ||
      name === 'नेहा'
        ? 'READY'
        : 'DELIVERED';

    await run(
      `
        INSERT INTO orders
          (
            id,
            customer_id,
            order_date,
            delivery_date,
            total_amount,
            paid_amount,
            balance_amount,
            status,
            payment_mode
          )
        VALUES(?,?,?,?,?,?,?,?,?)
      `,
      [
        id,
        customerId,
        '20-06-2024',
        deliveryDate,
        total,
        paid,
        total - paid,
        status,
        mode
      ]
    );

    for (
      const [
        itemName,
        qty,
        rate
      ] of items as any[]
    ) {
      const s = await query<{ id: number }>(
        `SELECT id FROM service_items WHERE name = ?`,
        [itemName]
      );

      await run(
        `
          INSERT INTO order_items
            (
              order_id,
              service_item_id,
              item_name,
              qty,
              rate,
              amount
            )
          VALUES(?,?,?,?,?,?)
        `,
        [
          id,
          s[0]?.id ?? null,
          itemName,
          qty,
          rate,
          qty * rate
        ]
      );
    }

    if (paid > 0) {
      await run(
        `
          INSERT INTO payments
            (order_id, amount, payment_mode)
          VALUES(?,?,?)
        `,
        [id, paid, mode]
      );
    }
  }
}