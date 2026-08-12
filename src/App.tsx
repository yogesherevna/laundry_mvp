import { useEffect, useState } from 'react';
import { IonApp, IonIcon, IonSpinner } from '@ionic/react';
import {
    homeOutline,
    addCircleOutline,
    carOutline,
    listOutline,
    peopleOutline,
    barChartOutline,
    settingsOutline,
    cashOutline,
    searchOutline,
    printOutline,
    checkmarkCircleOutline
} from 'ionicons/icons';

import type { Order, Screen } from './types';

import { 
    addDeliveryPayment, 
    createOrder, 
    getCustomerOrders, 
    getCustomers, 
    getItemReport, 
    getOrder, 
    getOrders, 
    getPaymentTotals, 
    getServiceItems, 
    getStats, 
    updateServiceRate, 
    updateSettings, 
    initDatabase 
} from './db/database';

const nav: any[] = [
    ['dashboard', 'मुख्य पान', homeOutline],
    ['newOrder', 'नवीन ऑर्डर', addCircleOutline],
    ['deliverSearch', 'कपडे द्या', carOutline],
    ['pending', 'बाकी ऑर्डर्स', listOutline],
    ['customers', 'ग्राहक', peopleOutline],
    ['reports', 'रिपोर्ट', barChartOutline],
    ['collections', 'आजचा हिशोब', cashOutline],
    ['settings', 'सेटिंग्ज', settingsOutline]
];

const money = (n: number) =>
    `₹ ${Number(n || 0).toLocaleString('en-IN')}`;

export default function App() {
    const [screen, setScreen] = useState<Screen>('dashboard');
    const [selected, setSelected] = useState<Order | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<any>({});
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // NEW: mobile sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const refresh = async () => {
        const [orderData, statsData, customerData] = await Promise.all([
            getOrders(),
            getStats(),
            getCustomers()
        ]);

        setOrders(orderData);
        setStats(statsData);
        setCustomers(customerData);
    };

    useEffect(() => {
        console.log('APP: starting database initialization');

        initDatabase()
            .then(() => {
                console.log('APP: database initialized');
                return refresh();
            })
            .then(() => {
                console.log('APP: refresh completed');
            })
            .catch((err) => {
                console.error('APP: DATABASE ERROR', err);
            })
            .finally(() => {
                console.log('APP: loading finished');
                setLoading(false);
            });
    }, []);

    const open = (o: Order, s: Screen) => {
        setSelected(o);
        setScreen(s);
        setSidebarOpen(false);
    };

    const go = (s: Screen) => {
        setScreen(s);
        setSidebarOpen(false);
    };

    if (loading) {
        return (
            <IonApp>
            <div
                style={{
                padding: '40px',
                fontSize: '24px',
                color: '#000'
                }}
            >
                डेटाबेस सुरू होत आहे...
            </div>
            </IonApp>
        );
    }

    return (
        <IonApp>
            <div className="app">

                {/* MOBILE OVERLAY */}
                {sidebarOpen && (
                    <div
                        className="sidebar-overlay"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* SIDEBAR */}
                <aside
                    className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''
                        }`}
                >
                    <div className="brand">
                        लॉन्ड्री सॉफ्टवेअर
                    </div>

                    <nav>
                        {nav.map(([id, label, icon]) => (
                            <button
                                key={id}
                                className={screen === id ? 'active' : ''}
                                onClick={() => go(id)}
                            >
                                <IonIcon icon={icon} />
                                <span>{label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="sidebar-foot">
                        डेटा SQLite मध्ये जतन होतो
                    </div>
                </aside>

                {/* MAIN */}
                <main className="main">

                    {/* TOP HEADER */}
                    <header className="topbar">

                        <button
                            className="menu"
                            onClick={() =>
                                setSidebarOpen(value => !value)
                            }
                            aria-label="मेनू"
                        >
                            ☰
                        </button>

                        <strong>
                            {nav.find(
                                n => n[0] === screen
                            )?.[1] || 'लॉन्ड्री सॉफ्टवेअर'}
                        </strong>

                    </header>

                    {/* PAGE CONTENT */}
                    <div className="content">

                        {screen === 'dashboard' && (
                            <Dashboard
                                stats={stats}
                                on={go}
                            />
                        )}

                        {screen === 'newOrder' && (
                            <NewOrder
                                onBack={() => go('dashboard')}
                                onSave={async input => {
                                    const o = await createOrder(input);

                                    await refresh();

                                    setSelected(o);
                                    go('receipt');
                                }}
                            />
                        )}

                        {screen === 'receipt' && selected && (
                            <Receipt
                                order={selected}
                                onBack={() => go('dashboard')}
                            />
                        )}

                        {screen === 'deliverSearch' && (
                            <DeliverSearch
                                orders={orders.filter(
                                    o => o.status === 'READY'
                                )}
                                onOpen={o =>
                                    open(o, 'delivery')
                                }
                            />
                        )}

                        {screen === 'delivery' && selected && (
                            <Delivery
                                order={selected}
                                onBack={() =>
                                    go('deliverSearch')
                                }
                                onDeliver={async (
                                    id,
                                    amount,
                                    mode
                                ) => {
                                    const o =
                                        await addDeliveryPayment(
                                            id,
                                            amount,
                                            mode
                                        );

                                    await refresh();

                                    setSelected(o);
                                    go('receipt');
                                }}
                            />
                        )}

                        {screen === 'pending' && (
                            <Pending
                                orders={orders.filter(
                                    o => o.status === 'READY'
                                )}
                                onDeliver={o =>
                                    open(o, 'delivery')
                                }
                            />
                        )}

                        {screen === 'customers' && (
                            <Customers
                                customers={customers}
                                onOpen={async c => {
                                    const history =
                                        await getCustomerOrders(
                                            c.mobile
                                        );

                                    setSelected(
                                        history[0] ?? null
                                    );

                                    (
                                        window as any
                                    ).__customerHistory =
                                        history;

                                    go('customerDetail');
                                }}
                            />
                        )}

                        {screen === 'customerDetail' &&
                            selected && (
                                <CustomerDetail
                                    order={selected}
                                    history={
                                        (window as any)
                                            .__customerHistory || []
                                    }
                                    onBack={() =>
                                        go('customers')
                                    }
                                />
                            )}

                        {screen === 'reports' && (
                            <Reports />
                        )}

                        {screen === 'collections' && (
                            <Collections />
                        )}

                        {screen === 'settings' && (
                            <Settings />
                        )}

                    </div>
                </main>
            </div>
        </IonApp>
    );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function Dashboard({
    stats,
    on
}: {
    stats: any;
    on: (s: Screen) => void;
}) {
    return (
        <div className="page">

            <div className="stats">

                <Stat
                    title="आजच्या ऑर्डर्स"
                    value={stats.todayOrders || 0}
                />

                <Stat
                    title="आज जमा"
                    value={money(stats.todayCollection)}
                />

                <Stat
                    title="कपडे बाकी"
                    value={stats.pendingDelivery || 0}
                />

                <Stat
                    title="पैसे बाकी"
                    value={money(stats.balanceAmount)}
                />

            </div>

            <div className="quick-grid">

                <Quick
                    icon={addCircleOutline}
                    text="नवीन ऑर्डर"
                    on={() => on('newOrder')}
                />

                <Quick
                    icon={carOutline}
                    text="कपडे द्या"
                    on={() => on('deliverSearch')}
                />

                <Quick
                    icon={listOutline}
                    text="बाकी ऑर्डर्स"
                    on={() => on('pending')}
                />

                <Quick
                    icon={cashOutline}
                    text="आजचा हिशोब"
                    on={() => on('collections')}
                />

                <Quick
                    icon={peopleOutline}
                    text="ग्राहक"
                    on={() => on('customers')}
                />

                <Quick
                    icon={barChartOutline}
                    text="रिपोर्ट"
                    on={() => on('reports')}
                />

            </div>

        </div>
    );
}


function Stat({
    title,
    value
}: {
    title: string;
    value: any;
}) {
    return (
        <div className="stat">
            <span>{title}</span>
            <strong>{value}</strong>
        </div>
    );
}


function Quick({
    icon,
    text,
    on
}: {
    icon: any;
    text: string;
    on: () => void;
}) {
    return (
        <button
            className="quick"
            onClick={on}
        >
            <IonIcon icon={icon} />
            <strong>{text}</strong>
        </button>
    );
}


/* =========================================================
   NEW ORDER
   ========================================================= */
function today() {
  const d = new Date();

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}
function NewOrder({
    onBack,
    onSave
}: {
    onBack: () => void;
    onSave: (o: any) => void;
}) {
    const [items, setItems] =
        useState<any[]>([]);

    const [mobile, setMobile] =
        useState('');

    const [name, setName] =
        useState('');

    const [address, setAddress] =
        useState('');

    const [date, setDate] =
        useState(today());

    const [paid, setPaid] =
        useState(0);

    const [mode, setMode] =
        useState<any>('CASH');

    useEffect(() => {
        getServiceItems()
            .then(setItems)
            .catch(console.error);
    }, []);

    const total = items.reduce(
        (s, i) =>
            s + i.rate * (i.qty || 0),
        0
    );

    const balance = Math.max(
        0,
        total - paid
    );

    const qty = (
        index: number,
        delta: number
    ) => {
        setItems(a =>
            a.map((x, n) =>
                n === index
                    ? {
                        ...x,
                        qty: Math.max(
                            0,
                            (x.qty || 0) + delta
                        )
                    }
                    : x
            )
        );
    };

    const save = () => {
        const selected =
            items
                .filter(
                    i => (i.qty || 0) > 0
                )
                .map(i => ({
                    name: i.name,
                    qty: i.qty,
                    rate: i.rate
                }));

        if (
            !mobile ||
            !name ||
            !selected.length
        ) {
            alert(
                'मोबाईल, नाव आणि किमान एक कपडा भरा.'
            );
            return;
        }

        onSave({
            name,
            mobile,
            address,
            deliveryDate: date,
            paid,
            paymentMode: mode,
            items: selected
        });
    };

    return (
        <div className="page">

            <div className="two-col">

                <section className="card">

                    <h2>ग्राहकाची माहिती</h2>

                    <label>मोबाईल नंबर *</label>

                    <input
                        value={mobile}
                        onChange={e =>
                            setMobile(e.target.value)
                        }
                        placeholder="मोबाईल नंबर"
                    />

                    <label>नाव *</label>

                    <input
                        value={name}
                        onChange={e =>
                            setName(e.target.value)
                        }
                        placeholder="ग्राहकाचे नाव"
                    />

                    <label>पत्ता</label>

                    <textarea
                        value={address}
                        onChange={e =>
                            setAddress(e.target.value)
                        }
                        placeholder="पत्ता"
                    />

                    <label>
                        कपडे देण्याची तारीख *
                    </label>

                    <input
                        value={date}
                        onChange={e =>
                            setDate(e.target.value)
                        }
                    />

                    <h2 className="section-gap">
                        पैशांची माहिती
                    </h2>

                    <div className="money-box">

                        <div>
                            <span>एकूण</span>
                            <b>{money(total)}</b>
                        </div>

                        <div>
                            <span>आत्ता घेतले</span>

                            <input
                                type="number"
                                value={paid}
                                onChange={e =>
                                    setPaid(
                                        Math.max(
                                            0,
                                            Number(
                                                e.target.value
                                            ) || 0
                                        )
                                    )
                                }
                            />
                        </div>

                        <div>
                            <span>बाकी</span>
                            <b>{money(balance)}</b>
                        </div>

                    </div>

                    <label>
                        पैसे कसे घेतले?
                    </label>

                    <select
                        value={mode}
                        onChange={e =>
                            setMode(e.target.value)
                        }
                    >
                        <option value="CASH">
                            रोख
                        </option>
                        <option value="UPI">
                            UPI
                        </option>
                        <option value="CARD">
                            कार्ड
                        </option>
                    </select>

                </section>


                <section className="card">

                    <h2>कपडे</h2>

                    <div className="item-table">

                        <div className="thead">
                            <span>कपडा</span>
                            <span>दर</span>
                            <span>संख्या</span>
                            <span>रक्कम</span>
                        </div>

                        {items.map((i, n) => (
                            <div
                                className="trow"
                                key={i.id}
                            >
                                <span>{i.name}</span>

                                <span>
                                    {money(i.rate)}
                                </span>

                                <div className="qty">

                                    <button
                                        onClick={() =>
                                            qty(n, -1)
                                        }
                                    >
                                        −
                                    </button>

                                    <b>
                                        {i.qty || 0}
                                    </b>

                                    <button
                                        onClick={() =>
                                            qty(n, 1)
                                        }
                                    >
                                        +
                                    </button>

                                </div>

                                <span>
                                    {money(
                                        i.rate *
                                        (i.qty || 0)
                                    )}
                                </span>

                            </div>
                        ))}

                    </div>

                </section>

            </div>


            <div className="actions">

                <button
                    className="secondary"
                    onClick={onBack}
                >
                    रद्द करा
                </button>

                <button
                    className="primary"
                    onClick={save}
                >
                    <IonIcon
                        icon={printOutline}
                    />

                    सेव्ह करा आणि पावती काढा
                </button>

            </div>

        </div>
    );
}


/* =========================================================
   RECEIPT
   ========================================================= */

function Receipt({
    order,
    onBack
}: {
    order: Order;
    onBack: () => void;
}) {
    return (
        <div className="page">

            <div className="receipt card">

                <h1>लॉन्ड्री पावती</h1>

                <hr />

                <div className="receipt-meta">

                    <div>
                        ऑर्डर नं.:
                        <b>{order.id}</b>
                        <br />

                        तारीख:
                        {order.orderDate}
                        <br />

                        ग्राहक:
                        {order.customerName}
                        <br />

                        मोबाईल:
                        {order.mobile}
                        <br />

                        पत्ता:
                        {order.address || '-'}
                    </div>

                    <div>
                        कपडे देण्याची तारीख:
                        {order.deliveryDate}
                        <br />

                        पैसे:
                        {order.paymentMode === 'CASH'
                            ? 'रोख'
                            : order.paymentMode}
                    </div>

                </div>


                <table>

                    <thead>
                        <tr>
                            <th>कपडा</th>
                            <th>संख्या</th>
                            <th>दर</th>
                            <th>रक्कम</th>
                        </tr>
                    </thead>

                    <tbody>
                        {order.items.map(i => (
                            <tr key={i.name}>
                                <td>{i.name}</td>
                                <td>{i.qty}</td>
                                <td>
                                    {money(i.rate)}
                                </td>
                                <td>
                                    {money(
                                        i.qty * i.rate
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>

                </table>


                <div className="receipt-total">

                    <div>
                        एकूण :
                        {money(order.total)}
                    </div>

                    <div>
                        जमा :
                        {money(order.paid)}
                    </div>

                    <b>
                        बाकी :
                        {money(order.balance)}
                    </b>

                </div>

                <h3>धन्यवाद!</h3>

            </div>


            <div className="actions">

                <button
                    className="secondary"
                    onClick={onBack}
                >
                    मागे
                </button>

                <button
                    className="primary"
                    onClick={() =>
                        window.print()
                    }
                >
                    <IonIcon
                        icon={printOutline}
                    />

                    पावती प्रिंट करा
                </button>

            </div>

        </div>
    );
}


/* =========================================================
   DELIVERY SEARCH
   ========================================================= */

function DeliverSearch({
    orders,
    onOpen
}: {
    orders: Order[];
    onOpen: (o: Order) => void;
}) {
    const [q, setQ] =
        useState('');

    const rows = orders.filter(
        o =>
            !q ||
            o.mobile.includes(q) ||
            o.id.includes(q) ||
            o.customerName.includes(q)
    );

    return (
        <div className="page">

            <div className="card">

                <h2>ऑर्डर शोधा</h2>

                <div className="search-input">

                    <input
                        value={q}
                        onChange={e =>
                            setQ(e.target.value)
                        }
                        placeholder="मोबाईल / ऑर्डर नंबर / नाव"
                    />

                    <button>
                        <IonIcon
                            icon={searchOutline}
                        />
                    </button>

                </div>

            </div>

            <OrderTable
                orders={rows}
                action="उघडा"
                onAction={onOpen}
            />

        </div>
    );
}


/* =========================================================
   PENDING
   ========================================================= */

function Pending({
    orders,
    onDeliver
}: {
    orders: Order[];
    onDeliver: (o: Order) => void;
}) {
    const [q, setQ] =
        useState('');

    const rows = orders.filter(
        o =>
            !q ||
            o.mobile.includes(q) ||
            o.id.includes(q) ||
            o.customerName.includes(q)
    );

    return (
        <div className="page">

            <div className="filter-row">

                <button className="selected">
                    सर्व ({rows.length})
                </button>

                <button>आज</button>
                <button>उद्या</button>
                <button>
                    उशीर झालेले
                </button>

                <input
                    value={q}
                    onChange={e =>
                        setQ(e.target.value)
                    }
                    placeholder="नाव, मोबाईल किंवा ऑर्डर नंबर"
                />

            </div>

            <OrderTable
                orders={rows}
                action="कपडे द्या"
                onAction={onDeliver}
            />

        </div>
    );
}


/* =========================================================
   ORDER TABLE
   ========================================================= */

function OrderTable({
    orders,
    action,
    onAction
}: {
    orders: Order[];
    action: string;
    onAction: (o: Order) => void;
}) {
    return (
        <div className="card table-wrap">

            <table>

                <thead>
                    <tr>
                        <th>ऑर्डर</th>
                        <th>ग्राहक</th>
                        <th>मोबाईल</th>
                        <th>देण्याची तारीख</th>
                        <th>एकूण</th>
                        <th>जमा</th>
                        <th>बाकी</th>
                        <th>स्थिती</th>
                        <th></th>
                    </tr>
                </thead>

                <tbody>

                    {orders.map(o => (
                        <tr key={o.id}>

                            <td>{o.id}</td>

                            <td>
                                {o.customerName}
                            </td>

                            <td>{o.mobile}</td>

                            <td>
                                {o.deliveryDate}
                            </td>

                            <td>
                                {money(o.total)}
                            </td>

                            <td>
                                {money(o.paid)}
                            </td>

                            <td
                                className={
                                    o.balance
                                        ? 'danger'
                                        : ''
                                }
                            >
                                {money(o.balance)}
                            </td>

                            <td>
                                <span className="badge">
                                    {o.status === 'READY'
                                        ? 'तयार'
                                        : 'दिलेली'}
                                </span>
                            </td>

                            <td>
                                <button
                                    className="small"
                                    onClick={() =>
                                        onAction(o)
                                    }
                                >
                                    {action}
                                </button>
                            </td>

                        </tr>
                    ))}

                </tbody>

            </table>

        </div>
    );
}


/* =========================================================
   DELIVERY
   ========================================================= */

function Delivery({
    order,
    onBack,
    onDeliver
}: {
    order: Order;
    onBack: () => void;
    onDeliver: (
        id: string,
        a: number,
        m: any
    ) => void;
}) {
    const [a, setA] =
        useState(order.balance);

    const [m, setM] =
        useState<any>('CASH');

    return (
        <div className="page">

            <div className="two-col">

                <section className="card">

                    <h2>ऑर्डरची माहिती</h2>

                    <p>
                        ऑर्डर नं. : {order.id}
                    </p>

                    <p>
                        ग्राहक :
                        <b>
                            {order.customerName}
                        </b>
                    </p>

                    <p>
                        मोबाईल : {order.mobile}
                    </p>

                    <p>
                        देण्याची तारीख :
                        {order.deliveryDate}
                    </p>

                    <table>

                        <thead>
                            <tr>
                                <th>कपडा</th>
                                <th>संख्या</th>
                                <th>रक्कम</th>
                            </tr>
                        </thead>

                        <tbody>
                            {order.items.map(i => (
                                <tr key={i.name}>
                                    <td>{i.name}</td>
                                    <td>{i.qty}</td>
                                    <td>
                                        {money(
                                            i.qty * i.rate
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                    </table>

                </section>


                <section className="card">

                    <h2>पैसे घेणे</h2>

                    <div className="money-box">

                        <div>
                            <span>एकूण</span>
                            <b>
                                {money(order.total)}
                            </b>
                        </div>

                        <div>
                            <span>आधी घेतले</span>
                            <b>
                                {money(order.paid)}
                            </b>
                        </div>

                        <div>
                            <span>बाकी</span>
                            <b className="danger">
                                {money(order.balance)}
                            </b>
                        </div>

                    </div>

                    <label>
                        आता किती पैसे घेतले?
                    </label>

                    <input
                        type="number"
                        value={a}
                        onChange={e =>
                            setA(
                                Math.min(
                                    order.balance,
                                    Math.max(
                                        0,
                                        Number(
                                            e.target.value
                                        ) || 0
                                    )
                                )
                            )
                        }
                    />

                    <label>
                        पैसे कसे घेतले?
                    </label>

                    <select
                        value={m}
                        onChange={e =>
                            setM(e.target.value)
                        }
                    >
                        <option value="CASH">
                            रोख
                        </option>

                        <option value="UPI">
                            UPI
                        </option>

                        <option value="CARD">
                            कार्ड
                        </option>
                    </select>

                </section>

            </div>


            <div className="actions">

                <button
                    className="secondary"
                    onClick={onBack}
                >
                    मागे
                </button>

                <button
                    className="primary success"
                    onClick={() =>
                        onDeliver(
                            order.id,
                            a,
                            m
                        )
                    }
                >
                    <IonIcon
                        icon={
                            checkmarkCircleOutline
                        }
                    />

                    कपडे दिले
                </button>

            </div>

        </div>
    );
}


/* =========================================================
   CUSTOMERS
   ========================================================= */

function Customers({
    customers,
    onOpen
}: {
    customers: any[];
    onOpen: (c: any) => void;
}) {
    const [q, setQ] =
        useState('');

    const rows =
        customers.filter(
            c =>
                !q ||
                c.mobile.includes(q) ||
                c.name.includes(q)
        );

    return (
        <div className="page">

            <div className="card">

                <div className="search-input">

                    <input
                        value={q}
                        onChange={e =>
                            setQ(e.target.value)
                        }
                        placeholder="ग्राहकाचे नाव / मोबाईल"
                    />

                    <button>
                        <IonIcon
                            icon={searchOutline}
                        />
                    </button>

                </div>

            </div>


            <div className="customer-grid">

                {rows.map(c => (
                    <button
                        className="customer-card"
                        key={c.mobile}
                        onClick={() =>
                            onOpen(c)
                        }
                    >
                        <strong>{c.name}</strong>
                        <span>{c.mobile}</span>
                        <span>
                            {c.orderCount} ऑर्डर्स
                        </span>
                        <b>
                            {money(
                                c.balanceAmount
                            )}{' '}
                            बाकी
                        </b>
                    </button>
                ))}

            </div>

        </div>
    );
}


/* =========================================================
   CUSTOMER DETAIL
   ========================================================= */

function CustomerDetail({
    order,
    history,
    onBack
}: {
    order: Order;
    history: Order[];
    onBack: () => void;
}) {
    return (
        <div className="page">

            <div className="two-col">

                <section className="card">

                    <h2>
                        ग्राहकाची माहिती
                    </h2>

                    <p>
                        नाव :
                        <b>
                            {order.customerName}
                        </b>
                    </p>

                    <p>
                        मोबाईल :
                        {order.mobile}
                    </p>

                    <p>
                        पत्ता :
                        {order.address || '-'}
                    </p>

                </section>


                <section className="card">

                    <h2>एकूण</h2>

                    <div className="stats">

                        <Stat
                            title="ऑर्डर्स"
                            value={history.length}
                        />

                        <Stat
                            title="एकूण खर्च"
                            value={money(
                                history.reduce(
                                    (s, o) =>
                                        s + o.total,
                                    0
                                )
                            )}
                        />

                        <Stat
                            title="जमा"
                            value={money(
                                history.reduce(
                                    (s, o) =>
                                        s + o.paid,
                                    0
                                )
                            )}
                        />

                        <Stat
                            title="बाकी"
                            value={money(
                                history.reduce(
                                    (s, o) =>
                                        s + o.balance,
                                    0
                                )
                            )}
                        />

                    </div>

                </section>

            </div>


            <div className="card table-wrap">

                <h2>
                    मागील ऑर्डर्स
                </h2>

                <table>

                    <thead>
                        <tr>
                            <th>ऑर्डर</th>
                            <th>तारीख</th>
                            <th>देण्याची तारीख</th>
                            <th>रक्कम</th>
                            <th>जमा</th>
                            <th>बाकी</th>
                            <th>स्थिती</th>
                        </tr>
                    </thead>

                    <tbody>

                        {history.map(o => (
                            <tr key={o.id}>

                                <td>{o.id}</td>

                                <td>
                                    {o.orderDate}
                                </td>

                                <td>
                                    {o.deliveryDate}
                                </td>

                                <td>
                                    {money(o.total)}
                                </td>

                                <td>
                                    {money(o.paid)}
                                </td>

                                <td
                                    className={
                                        o.balance
                                            ? 'danger'
                                            : ''
                                    }
                                >
                                    {money(o.balance)}
                                </td>

                                <td>
                                    {o.status === 'READY'
                                        ? 'तयार'
                                        : 'दिलेली'}
                                </td>

                            </tr>
                        ))}

                    </tbody>

                </table>

            </div>


            <button
                className="secondary"
                onClick={onBack}
            >
                मागे
            </button>

        </div>
    );
}


/* =========================================================
   REPORTS
   ========================================================= */

function Reports() {
    const [item, setItem] =
        useState<any[]>([]);

    const [stats, setStats] =
        useState<any>({});

    useEffect(() => {
        getItemReport()
            .then(setItem)
            .catch(console.error);

        getStats()
            .then(setStats)
            .catch(console.error);
    }, []);

    return (
        <div className="page">

            <div className="stats">

                <Stat
                    title="एकूण ऑर्डर्स"
                    value={
                        stats.totalOrders || 0
                    }
                />

                <Stat
                    title="एकूण रक्कम"
                    value={money(
                        stats.totalAmount
                    )}
                />

                <Stat
                    title="जमा"
                    value={money(
                        stats.paidAmount
                    )}
                />

                <Stat
                    title="बाकी"
                    value={money(
                        stats.balanceAmount
                    )}
                />

            </div>


            <div className="card table-wrap">

                <h2>
                    कपड्यांचा हिशोब
                </h2>

                <table>

                    <thead>
                        <tr>
                            <th>कपडा</th>
                            <th>एकूण संख्या</th>
                            <th>रक्कम</th>
                        </tr>
                    </thead>

                    <tbody>

                        {item.map(i => (
                            <tr key={i.name}>
                                <td>{i.name}</td>
                                <td>{i.qty}</td>
                                <td>
                                    {money(i.amount)}
                                </td>
                            </tr>
                        ))}

                    </tbody>

                </table>

            </div>

        </div>
    );
}


/* =========================================================
   COLLECTIONS
   ========================================================= */

function Collections() {
    const [p, setP] =
        useState<any[]>([]);

    useEffect(() => {
        getPaymentTotals()
            .then(setP)
            .catch(console.error);
    }, []);

    const cash =
        p.find(
            x => x.mode === 'CASH'
        )?.amount || 0;

    const upi =
        p.find(
            x => x.mode === 'UPI'
        )?.amount || 0;

    const card =
        p.find(
            x => x.mode === 'CARD'
        )?.amount || 0;

    return (
        <div className="page">

            <div className="stats">

                <Stat
                    title="रोख"
                    value={money(cash)}
                />

                <Stat
                    title="UPI"
                    value={money(upi)}
                />

                <Stat
                    title="कार्ड"
                    value={money(card)}
                />

                <Stat
                    title="एकूण जमा"
                    value={money(
                        cash + upi + card
                    )}
                />

            </div>


            <div className="card">

                <h2>
                    आजचा हिशोब
                </h2>

                <p>
                    सर्व जमा व्यवहार SQLite
                    मधील <b>payments</b> टेबलमधून
                    येतात.
                </p>

            </div>

        </div>
    );
}


/* =========================================================
   SETTINGS
   ========================================================= */

function Settings() {
    const [items, setItems] =
        useState<any[]>([]);

    useEffect(() => {
        getServiceItems()
            .then(setItems)
            .catch(console.error);
    }, []);

    return (
        <div className="page">

            <div className="card">

                <h2>
                    कपड्यांचे दर
                </h2>

                {items.map(i => (
                    <div
                        className="rate-row"
                        key={i.id}
                    >

                        <span>{i.name}</span>

                        <input
                            type="number"
                            value={i.rate}
                            onChange={async e => {
                                const rate =
                                    Number(
                                        e.target.value
                                    ) || 0;

                                setItems(a =>
                                    a.map(x =>
                                        x.id === i.id
                                            ? {
                                                ...x,
                                                rate
                                            }
                                            : x
                                    )
                                );

                                await updateServiceRate(
                                    i.id,
                                    rate
                                );
                            }}
                        />

                    </div>
                ))}

            </div>


            <div className="card">

                <h2>
                    दुकानाची माहिती
                </h2>

                <label>
                    दुकानाचे नाव
                </label>

                <input
                    defaultValue="माझी लॉन्ड्री"
                />

                <label>
                    मोबाईल नंबर
                </label>

                <input
                    defaultValue="9876543210"
                />

                <label>
                    पत्ता
                </label>

                <textarea
                    defaultValue="पुणे, महाराष्ट्र"
                />

                <button
                    className="primary save-settings"
                    onClick={() =>
                        updateSettings({
                            businessName:
                                'माझी लॉन्ड्री',
                            mobile:
                                '9876543210',
                            address:
                                'पुणे, महाराष्ट्र'
                        }).then(() =>
                            alert(
                                'बदल जतन झाले.'
                            )
                        )
                    }
                >
                    बदल जतन करा
                </button>

            </div>

        </div>
    );
}