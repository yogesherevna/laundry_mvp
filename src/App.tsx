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

const nav: Array<[Screen, TranslationKey, any]> = [
    ['dashboard', 'dashboard', homeOutline],
    ['newOrder', 'newOrder', addCircleOutline],
    ['deliverSearch', 'deliver', carOutline],
    ['pending', 'pending', listOutline],
    ['customers', 'customers', peopleOutline],
    ['reports', 'reports', barChartOutline],
    ['collections', 'collections', cashOutline],
    ['settings', 'settings', settingsOutline]
];

const money = (n: number) =>
    `₹ ${Number(n || 0).toLocaleString('en-IN')}`;

// =========================================================
// LANGUAGE SUPPORT — UI text only.
// Does not affect SQLite, orders, payments, reports, or data.
// =========================================================
type Language = 'en' | 'mr';

const LANGUAGE_KEY = 'washora_language';

const translations = {
    en: {
        dashboard: 'Dashboard',
        newOrder: 'New Order',
        deliver: 'Deliver Clothes',
        pending: 'Pending Orders',
        customers: 'Customers',
        reports: 'Reports',
        collections: "Today's Collection",
        settings: 'Settings',
        sqliteSaved: 'डेटा SQLite मध्ये जतन होतो',
        language: 'Language',
        english: 'English',
        marathi: 'मराठी',
        clothingRates: 'Clothing Rates',
        shopInformation: 'Shop Information',
        shopName: 'Shop Name',
        mobileNumber: 'Mobile Number',
        address: 'Address',
        saveChanges: 'Save Changes',
        changesSaved: 'Changes saved.',
        todayOrders: "Today's Orders",
        todayCollected: "Collected Today",
        clothesPending: 'Clothes Pending',
        moneyPending: 'Money Pending',
        quickActions: 'Quick Actions',
        totalOrders: 'Total Orders',
        totalAmount: 'Total Amount',
        paid: 'Paid',
        balance: 'Balance',
        cloth: 'Cloth',
        totalQuantity: 'Total Quantity',
        amount: 'Amount',
        cash: 'Cash',
        upi: 'UPI',
        card: 'Card',
        totalCollection: 'Total Collection',
        todayAccount: "Today's Account",
        paymentData: 'All collection transactions come from the SQLite payments table.',
        marathiLanguage: 'मराठी',
        englishLanguage: 'English',
        selectLanguage: 'Select Language',
        back: 'Back',
        save: 'Save',
        print: 'Print',
        customer: 'Customer',
        search: 'Search',
        noData: 'No data available',
    },
    mr: {
        dashboard: 'मुख्य पान',
        newOrder: 'नवीन ऑर्डर',
        deliver: 'कपडे द्या',
        pending: 'बाकी ऑर्डर्स',
        customers: 'ग्राहक',
        reports: 'रिपोर्ट',
        collections: 'आजचा हिशोब',
        settings: 'सेटिंग्ज',
        sqliteSaved: 'Data is saved in SQLite',
        language: 'भाषा',
        english: 'English',
        marathi: 'मराठी',
        clothingRates: 'कपड्यांचे दर',
        shopInformation: 'दुकानाची माहिती',
        shopName: 'दुकानाचे नाव',
        mobileNumber: 'मोबाईल नंबर',
        address: 'पत्ता',
        saveChanges: 'बदल जतन करा',
        changesSaved: 'बदल जतन झाले.',
        todayOrders: 'आजच्या ऑर्डर्स',
        todayCollected: 'आज जमा',
        clothesPending: 'कपडे बाकी',
        moneyPending: 'पैसे बाकी',
        quickActions: 'जलद कृती',
        totalOrders: 'एकूण ऑर्डर्स',
        totalAmount: 'एकूण रक्कम',
        paid: 'जमा',
        balance: 'बाकी',
        cloth: 'कपडा',
        totalQuantity: 'एकूण संख्या',
        amount: 'रक्कम',
        cash: 'रोख',
        upi: 'UPI',
        card: 'कार्ड',
        totalCollection: 'एकूण जमा',
        todayAccount: 'आजचा हिशोब',
        paymentData: 'सर्व जमा व्यवहार SQLite मधील payments टेबलमधून येतात.',
        marathiLanguage: 'मराठी',
        englishLanguage: 'English',
        selectLanguage: 'भाषा निवडा',
        back: 'मागे',
        save: 'जतन करा',
        print: 'प्रिंट',
        customer: 'ग्राहक',
        search: 'शोधा',
        noData: 'माहिती उपलब्ध नाही',
    }
} as const;

type TranslationKey = keyof typeof translations.en;

const extraTranslations: Record<string, { en: string; mr: string }> = {
    "ग्राहकाची माहिती": { en: "Customer Information", mr: "ग्राहकाची माहिती" },
    "मोबाईल नंबर": { en: "Mobile Number", mr: "मोबाईल नंबर" },
    "नाव": { en: "Name", mr: "नाव" },
    "एकूण": { en: "Total", mr: "एकूण" },
    "आत्ता घेतले": { en: "Paid Now", mr: "आत्ता घेतले" },
    "कपडे": { en: "Clothes", mr: "कपडे" },
    "दर": { en: "Rate", mr: "दर" },
    "संख्या": { en: "Quantity", mr: "संख्या" },
    "लॉन्ड्री पावती": { en: "Laundry Receipt", mr: "लॉन्ड्री पावती" },
    "धन्यवाद!": { en: "Thank you!", mr: "धन्यवाद!" },
    "ऑर्डर शोधा": { en: "Search Order", mr: "ऑर्डर शोधा" },
    "आज": { en: "Today", mr: "आज" },
    "उद्या": { en: "Tomorrow", mr: "उद्या" },
    "ऑर्डर": { en: "Order", mr: "ऑर्डर" },
    "मोबाईल": { en: "Mobile", mr: "मोबाईल" },
    "देण्याची तारीख": { en: "Delivery Date", mr: "देण्याची तारीख" },
    "स्थिती": { en: "Status", mr: "स्थिती" },
    "ऑर्डरची माहिती": { en: "Order Information", mr: "ऑर्डरची माहिती" },
    "पैसे घेणे": { en: "Collect Payment", mr: "पैसे घेणे" },
    "आधी घेतले": { en: "Already Paid", mr: "आधी घेतले" },
    "तारीख": { en: "Date", mr: "तारीख" },
    "मराठी": { en: "Marathi", mr: "मराठी" },
    "मुख्य पान": { en: "Dashboard", mr: "मुख्य पान" },
    "नवीन ऑर्डर": { en: "New Order", mr: "नवीन ऑर्डर" },
    "कपडे द्या": { en: "Deliver Clothes", mr: "कपडे द्या" },
    "बाकी ऑर्डर्स": { en: "Pending Orders", mr: "बाकी ऑर्डर्स" },
    "ग्राहक": { en: "Customers", mr: "ग्राहक" },
    "रिपोर्ट": { en: "Reports", mr: "रिपोर्ट" },
    "आजचा हिशोब": { en: "Today's Collection", mr: "आजचा हिशोब" },
    "सेटिंग्ज": { en: "Settings", mr: "सेटिंग्ज" },
    "भाषा": { en: "Language", mr: "भाषा" },
    "कपड्यांचे दर": { en: "Clothing Rates", mr: "कपड्यांचे दर" },
    "दुकानाची माहिती": { en: "Shop Information", mr: "दुकानाची माहिती" },
    "दुकानाचे नाव": { en: "Shop Name", mr: "दुकानाचे नाव" },
    "पत्ता": { en: "Address", mr: "पत्ता" },
    "बदल जतन करा": { en: "Save Changes", mr: "बदल जतन करा" },
    "बदल जतन झाले.": { en: "Changes saved.", mr: "बदल जतन झाले." },
    "आजच्या ऑर्डर्स": { en: "Today's Orders", mr: "आजच्या ऑर्डर्स" },
    "आज जमा": { en: "Collected Today", mr: "आज जमा" },
    "कपडे बाकी": { en: "Clothes Pending", mr: "कपडे बाकी" },
    "पैसे बाकी": { en: "Money Pending", mr: "पैसे बाकी" },
    "जलद कृती": { en: "Quick Actions", mr: "जलद कृती" },
    "एकूण ऑर्डर्स": { en: "Total Orders", mr: "एकूण ऑर्डर्स" },
    "एकूण रक्कम": { en: "Total Amount", mr: "एकूण रक्कम" },
    "जमा": { en: "Paid", mr: "जमा" },
    "बाकी": { en: "Balance", mr: "बाकी" },
    "कपडा": { en: "Cloth", mr: "कपडा" },
    "एकूण संख्या": { en: "Total Quantity", mr: "एकूण संख्या" },
    "रक्कम": { en: "Amount", mr: "रक्कम" },
    "रोख": { en: "Cash", mr: "रोख" },
    "कार्ड": { en: "Card", mr: "कार्ड" },
    "एकूण जमा": { en: "Total Collection", mr: "एकूण जमा" },
    "सर्व जमा व्यवहार SQLite मधील payments टेबलमधून येतात.": { en: "All collection transactions come from the SQLite payments table.", mr: "सर्व जमा व्यवहार SQLite मधील payments टेबलमधून येतात." },
    "भाषा निवडा": { en: "Select Language", mr: "भाषा निवडा" },
    "मागे": { en: "Back", mr: "मागे" },
    "जतन करा": { en: "Save", mr: "जतन करा" },
    "प्रिंट": { en: "Print", mr: "प्रिंट" },
    "शोधा": { en: "Search", mr: "शोधा" },
    "माहिती उपलब्ध नाही": { en: "No data available", mr: "माहिती उपलब्ध नाही" },
    "मेनू": { en: "Menu", mr: "मेनू" },
    "लॉन्ड्री सॉफ्टवेअर": { en: "Laundry Software", mr: "लॉन्ड्री सॉफ्टवेअर" },
    "मोबाईल, नाव आणि किमान एक कपडा भरा.": { en: "Enter mobile, name and at least one cloth.", mr: "मोबाईल, नाव आणि किमान एक कपडा भरा." },
    "ग्राहकाचे नाव": { en: "Customer Name", mr: "ग्राहकाचे नाव" },
    "मोबाईल / ऑर्डर नंबर / नाव": { en: "Mobile / Order Number / Name", mr: "मोबाईल / ऑर्डर नंबर / नाव" },
    "उघडा": { en: "Open", mr: "उघडा" },
    "नाव, मोबाईल किंवा ऑर्डर नंबर": { en: "Name, mobile or order number", mr: "नाव, मोबाईल किंवा ऑर्डर नंबर" },
    "तयार": { en: "Ready", mr: "तयार" },
    "दिलेली": { en: "Delivered", mr: "दिलेली" },
    "ग्राहकाचे नाव / मोबाईल": { en: "Customer Name / Mobile", mr: "ग्राहकाचे नाव / मोबाईल" },
    "ऑर्डर्स": { en: "Orders", mr: "ऑर्डर्स" },
    "एकूण खर्च": { en: "Total Cost", mr: "एकूण खर्च" },
    "माझी लॉन्ड्री": { en: "My Laundry", mr: "माझी लॉन्ड्री" },
    "पुणे, महाराष्ट्र": { en: "Pune, Maharashtra", mr: "पुणे, महाराष्ट्र" },
    "डेटाबेस सुरू होत आहे...": { en: "Starting database...", mr: "डेटाबेस सुरू होत आहे..." },
    "कपडे देण्याची तारीख": { en: "Clothes Delivery Date", mr: "कपडे देण्याची तारीख" },
    "पैशांची माहिती": { en: "Payment Information", mr: "पैशांची माहिती" },
    "पैसे कसे घेतले?": { en: "Payment Method?", mr: "पैसे कसे घेतले?" },
    "रद्द करा": { en: "Cancel", mr: "रद्द करा" },
    "सेव्ह करा आणि पावती काढा": { en: "Save & Print Receipt", mr: "सेव्ह करा आणि पावती काढा" },
    "ऑर्डर नं.": { en: "Order No.", mr: "ऑर्डर नं." },
    "पैसे": { en: "Payment", mr: "पैसे" },
    "एकूण :": { en: "Total:", mr: "एकूण :" },
    "जमा :": { en: "Paid:", mr: "जमा :" },
    "बाकी :": { en: "Balance:", mr: "बाकी :" },
    "पावती प्रिंट करा": { en: "Print Receipt", mr: "पावती प्रिंट करा" },
    "सर्व": { en: "All", mr: "सर्व" },
    "सर्व ({rows.length})": { en: "All ({rows.length})", mr: "सर्व ({rows.length})" },
    "उशीर झालेले": { en: "Delayed", mr: "उशीर झालेले" },
    "आता किती पैसे घेतले?": { en: "How much payment received now?", mr: "आता किती पैसे घेतले?" },
    "कपडे दिले": { en: "Clothes Delivered", mr: "कपडे दिले" },
    "मागील ऑर्डर्स": { en: "Previous Orders", mr: "मागील ऑर्डर्स" },
    "कपड्यांचा हिशोब": { en: "Clothing Report", mr: "कपड्यांचा हिशोब" },
    "पत्ता:": { en: "Address:", mr: "पत्ता:" },
    "ऑर्डर नं. :": { en: "Order No. :", mr: "ऑर्डर नं. :" },
    "ग्राहक :": { en: "Customer :", mr: "ग्राहक :" },
    "मोबाईल :": { en: "Mobile :", mr: "मोबाईल :" },
    "नाव :": { en: "Name :", mr: "नाव :" },
    "सर्व जमा व्यवहार SQLite": { en: "All collection transactions from SQLite", mr: "सर्व जमा व्यवहार SQLite" },
    "मधील <b>payments</b> टेबलमधून": { en: "from the payments table", mr: "मधील <b>payments</b> टेबलमधून" },
    "येतात.": { en: "are shown here.", mr: "येतात." },
    "पत्ता :": { en: "Address :", mr: "पत्ता :" },
};

let activeLanguage: Language = 'en';

function getInitialLanguage(): Language {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return saved === 'mr' ? 'mr' : 'en';
}

function t(key: string): string {
    const language = activeLanguage;
    if (key in extraTranslations) return extraTranslations[key][language];
    const table = translations[language] as Record<string, string>;
    return table[key] ?? key;
}


function translateClothingName(name: string, language: Language) {
    const names: Record<string, { en: string; mr: string }> = {
        'शर्ट': {
            en: 'Shirt',
            mr: 'शर्ट'
        },
        'पॅन्ट': {
            en: 'Pant',
            mr: 'पॅन्ट'
        },
        'टी-शर्ट': {
            en: 'T-Shirt',
            mr: 'टी-शर्ट'
        },
        'साडी': {
            en: 'Saree',
            mr: 'साडी'
        },
        'बेडशीट': {
            en: 'Bedsheet',
            mr: 'बेडशीट'
        },
        'ब्लँकेट': {
            en: 'Blanket',
            mr: 'ब्लँकेट'
        },
        'इतर': {
            en: 'Other',
            mr: 'इतर'
        }
    };

    return names[name]?.[language] ?? name;
}

export default function App() {
    const [screen, setScreen] = useState<Screen>('dashboard');
    const [selected, setSelected] = useState<Order | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<any>({});
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // NEW: mobile sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [language, setLanguage] = useState<Language>(getInitialLanguage);

    const changeLanguage = (nextLanguage: Language) => {
        localStorage.setItem(LANGUAGE_KEY, nextLanguage);
        setLanguage(nextLanguage);
    };

    // Keep the current UI language available to all existing screens without
    // changing their business logic or data flow.
    activeLanguage = language;

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
                {t('डेटाबेस सुरू होत आहे...')}
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
                        {t('लॉन्ड्री सॉफ्टवेअर')}
                    </div>

                    <nav>
                        {nav.map(([id, label, icon]) => (
                            <button
                                key={id}
                                className={screen === id ? 'active' : ''}
                                onClick={() => go(id)}
                            >
                                <IonIcon icon={icon} />
                                <span>{t(label as string)}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="sidebar-foot">
                        {t('sqliteSaved')}
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
                            aria-label={t("मेनू")}
                        >
                            ☰
                        </button>

                        <strong>
                            {t(
                                nav.find(n => n[0] === screen)?.[1] ||
                                'लॉन्ड्री सॉफ्टवेअर'
                            )}
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
                                language={language}
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
                                language={language}
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
                                language={language}
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
                            <Reports language={language}/>
                        )}

                        {screen === 'collections' && (
                            <Collections language={language}/>
                        )}

                        {screen === 'settings' && (
                            <Settings language={language} onLanguageChange={changeLanguage} />
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
                    title={t("आजच्या ऑर्डर्स")}
                    value={stats.todayOrders || 0}
                />

                <Stat
                    title={t("आज जमा")}
                    value={money(stats.todayCollection)}
                />

                <Stat
                    title={t("कपडे बाकी")}
                    value={stats.pendingDelivery || 0}
                />

                <Stat
                    title={t("पैसे बाकी")}
                    value={money(stats.balanceAmount)}
                />

            </div>

            <div className="quick-grid">

                <Quick
                    icon={addCircleOutline}
                    text={t("नवीन ऑर्डर")}
                    on={() => on('newOrder')}
                />

                <Quick
                    icon={carOutline}
                    text={t("कपडे द्या")}
                    on={() => on('deliverSearch')}
                />

                <Quick
                    icon={listOutline}
                    text={t("बाकी ऑर्डर्स")}
                    on={() => on('pending')}
                />

                <Quick
                    icon={cashOutline}
                    text={t("आजचा हिशोब")}
                    on={() => on('collections')}
                />

                <Quick
                    icon={peopleOutline}
                    text={t("ग्राहक")}
                    on={() => on('customers')}
                />

                <Quick
                    icon={barChartOutline}
                    text={t("रिपोर्ट")}
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
    language,
    onBack,
    onSave
}: {
    language: Language;
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
                t('मोबाईल, नाव आणि किमान एक कपडा भरा.')
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

                    <h2>{t('ग्राहकाची माहिती')}</h2>

                    <label>{t('मोबाईल नंबर')} *</label>

                    <input
                        value={mobile}
                        onChange={e =>
                            setMobile(e.target.value)
                        }
                        placeholder={t("मोबाईल नंबर")}
                    />

                    <label>{t('नाव')} *</label>

                    <input
                        value={name}
                        onChange={e =>
                            setName(e.target.value)
                        }
                        placeholder={t("ग्राहकाचे नाव")}
                    />

                    <label>{t('address')}</label>

                    <textarea
                        value={address}
                        onChange={e =>
                            setAddress(e.target.value)
                        }
                        placeholder={t("पत्ता")}
                    />

                    <label>
                        {t('कपडे देण्याची तारीख')} *
                    </label>

                    <input
                        value={date}
                        onChange={e =>
                            setDate(e.target.value)
                        }
                    />

                    <h2 className="section-gap">
                        {t('पैशांची माहिती')}
                    </h2>

                    <div className="money-box">

                        <div>
                            <span>{t('एकूण')}</span>
                            <b>{money(total)}</b>
                        </div>

                        <div>
                            <span>{t('आत्ता घेतले')}</span>

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
                            <span>{t('बाकी')}</span>
                            <b>{money(balance)}</b>
                        </div>

                    </div>

                    <label>
                        {t('पैसे कसे घेतले?')}
                    </label>

                    <select
                        value={mode}
                        onChange={e =>
                            setMode(e.target.value)
                        }
                    >
                        <option value="CASH">
                            {t('रोख')}
                        </option>
                        <option value="UPI">
                            UPI
                        </option>
                        <option value="CARD">
                            {t('कार्ड')}
                        </option>
                    </select>

                </section>


                <section className="card">

                    <h2>{t('कपडे')}</h2>

                    <div className="item-table">

                        <div className="thead">
                            <span>{t('कपडा')}</span>
                            <span>{t('दर')}</span>
                            <span>{t('संख्या')}</span>
                            <span>{t('रक्कम')}</span>
                        </div>

                        {items.map((i, n) => (
                            <div
                                className="trow"
                                key={i.id}
                            >
                                <span>{translateClothingName(i.name, language)}</span>

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
                    {t('रद्द करा')}
                </button>

                <button
                    className="primary"
                    onClick={save}
                >
                    <IonIcon
                        icon={printOutline}
                    />

                    {t('सेव्ह करा आणि पावती काढा')}
                </button>

            </div>

        </div>
    );
}


/* =========================================================
   RECEIPT
   ========================================================= */

function Receipt({
    language,
    order,
    onBack
}: {
    language: Language;
    order: Order;
    onBack: () => void;
}) {
    return (
        <div className="page">

            <div className="receipt card">

                <h1>{t('लॉन्ड्री पावती')}</h1>

                <hr />

                <div className="receipt-meta">

                    <div>
                        {t('ऑर्डर नं.')} :
                        <b>{order.id}</b>
                        <br />

                        {t('तारीख')}:
                        {order.orderDate}
                        <br />

                        {t('ग्राहक')}:
                        {order.customerName}
                        <br />

                        {t('मोबाईल')}:
                        {order.mobile}
                        <br />

                        {t('पत्ता:')}
                        {order.address || '-'}
                    </div>

                    <div>
                        {t('कपडे देण्याची तारीख')}:
                        {order.deliveryDate}
                        <br />

                        {t('पैसे')}:
                        {order.paymentMode === 'CASH'
                            ? t('रोख')
                            : order.paymentMode}
                    </div>

                </div>


                <table>

                    <thead>
                        <tr>
                            <th>{t('कपडा')}</th>
                            <th>{t('संख्या')}</th>
                            <th>{t('दर')}</th>
                            <th>{t('रक्कम')}</th>
                        </tr>
                    </thead>

                    <tbody>
                        {order.items.map(i => (
                            <tr key={i.name}>
                                <td>{translateClothingName(i.name, language)}</td>
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
                        {t('एकूण :')}
                        {money(order.total)}
                    </div>

                    <div>
                        {t('जमा :')}
                        {money(order.paid)}
                    </div>

                    <b>
                        {t('बाकी') + ' :'}
                        {money(order.balance)}
                    </b>

                </div>

                <h3>{t('धन्यवाद!')}</h3>

            </div>


            <div className="actions">

                <button
                    className="secondary"
                    onClick={onBack}
                >
                    {t('मागे')}
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

                    {t('पावती प्रिंट करा')}
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

                <h2>{t('ऑर्डर शोधा')}</h2>

                <div className="search-input">

                    <input
                        value={q}
                        onChange={e =>
                            setQ(e.target.value)
                        }
                        placeholder={t("मोबाईल / ऑर्डर नंबर / नाव")}
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
                action={t("उघडा")}
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
                    {t('सर्व ({rows.length})')}
                </button>

                <button>{t('आज')}</button>
                <button>{t('उद्या')}</button>
                <button>
                    {t('उशीर झालेले')}
                </button>

                <input
                    value={q}
                    onChange={e =>
                        setQ(e.target.value)
                    }
                    placeholder={t("नाव, मोबाईल किंवा ऑर्डर नंबर")}
                />

            </div>

            <OrderTable
                orders={rows}
                action={t("कपडे द्या")}
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
                        <th>{t('ऑर्डर')}</th>
                        <th>{t('ग्राहक')}</th>
                        <th>{t('मोबाईल')}</th>
                        <th>{t('देण्याची तारीख')}</th>
                        <th>{t('एकूण')}</th>
                        <th>{t('जमा')}</th>
                        <th>{t('बाकी')}</th>
                        <th>{t('स्थिती')}</th>
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
                                        ? t('तयार')
                                        : t('दिलेली')}
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
    language,
    order,
    onBack,
    onDeliver
}: {
    language: Language;
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

                    <h2>{t('ऑर्डरची माहिती')}</h2>

                    <p>
                        {t('ऑर्डर नं. :')} {order.id}
                    </p>

                    <p>
                        {t('ग्राहक :')}
                        <b>
                            {order.customerName}
                        </b>
                    </p>

                    <p>
                        {t('मोबाईल :')} {order.mobile}
                    </p>

                    <p>
                        {t('देण्याची तारीख')} :
                        {order.deliveryDate}
                    </p>

                    <table>

                        <thead>
                            <tr>
                                <th>{t('कपडा')}</th>
                                <th>{t('संख्या')}</th>
                                <th>{t('रक्कम')}</th>
                            </tr>
                        </thead>

                        <tbody>
                            {order.items.map(i => (
                                <tr key={i.name}>
                                    <td>{translateClothingName(i.name, language)}</td>
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

                    <h2>{t('पैसे घेणे')}</h2>

                    <div className="money-box">

                        <div>
                            <span>{t('एकूण')}</span>
                            <b>
                                {money(order.total)}
                            </b>
                        </div>

                        <div>
                            <span>{t('आधी घेतले')}</span>
                            <b>
                                {money(order.paid)}
                            </b>
                        </div>

                        <div>
                            <span>{t('बाकी')}</span>
                            <b className="danger">
                                {money(order.balance)}
                            </b>
                        </div>

                    </div>

                    <label>
                        {t('आता किती पैसे घेतले?')}
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
                        {t('पैसे कसे घेतले?')}
                    </label>

                    <select
                        value={m}
                        onChange={e =>
                            setM(e.target.value)
                        }
                    >
                        <option value="CASH">
                            {t('रोख')}
                        </option>

                        <option value="UPI">
                            UPI
                        </option>

                        <option value="CARD">
                            {t('कार्ड')}
                        </option>
                    </select>

                </section>

            </div>


            <div className="actions">

                <button
                    className="secondary"
                    onClick={onBack}
                >
                    {t('मागे')}
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

                    {t('कपडे दिले')}
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
                        placeholder={t("ग्राहकाचे नाव / मोबाईल")}
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
                            {c.orderCount} {t('ऑर्डर्स')}
                        </span>
                        <b>
                            {money(
                                c.balanceAmount
                            )}{' '}
                            {t('बाकी')}
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
                        {t('ग्राहकाची माहिती')}
                    </h2>

                    <p>
                        {t('नाव :')}
                        <b>
                            {order.customerName}
                        </b>
                    </p>

                    <p>
                        {t('मोबाईल :')}
                        {order.mobile}
                    </p>

                    <p>
                        {t('पत्ता :')}
                        {order.address || '-'}
                    </p>

                </section>


                <section className="card">

                    <h2>{t('एकूण')}</h2>

                    <div className="stats">

                        <Stat
                            title={t("ऑर्डर्स")}
                            value={history.length}
                        />

                        <Stat
                            title={t("एकूण खर्च")}
                            value={money(
                                history.reduce(
                                    (s, o) =>
                                        s + o.total,
                                    0
                                )
                            )}
                        />

                        <Stat
                            title={t("जमा")}
                            value={money(
                                history.reduce(
                                    (s, o) =>
                                        s + o.paid,
                                    0
                                )
                            )}
                        />

                        <Stat
                            title={t("बाकी")}
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
                    {t('मागील ऑर्डर्स')}
                </h2>

                <table>

                    <thead>
                        <tr>
                            <th>{t('ऑर्डर')}</th>
                            <th>{t('तारीख')}</th>
                            <th>{t('देण्याची तारीख')}</th>
                            <th>{t('रक्कम')}</th>
                            <th>{t('जमा')}</th>
                            <th>{t('बाकी')}</th>
                            <th>{t('स्थिती')}</th>
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
                                        ? t('तयार')
                                        : t('दिलेली')}
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
                {t('मागे')}
            </button>

        </div>
    );
}


/* =========================================================
   REPORTS
   ========================================================= */

function Reports({language}:{language:Language}) {
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
                    title={t("एकूण ऑर्डर्स")}
                    value={
                        stats.totalOrders || 0
                    }
                />

                <Stat
                    title={t("एकूण रक्कम")}
                    value={money(
                        stats.totalAmount
                    )}
                />

                <Stat
                    title={t("जमा")}
                    value={money(
                        stats.paidAmount
                    )}
                />

                <Stat
                    title={t("बाकी")}
                    value={money(
                        stats.balanceAmount
                    )}
                />

            </div>


            <div className="card table-wrap">

                <h2>
                    {t('कपड्यांचा हिशोब')}
                </h2>

                <table>

                    <thead>
                        <tr>
                            <th>{t('कपडा')}</th>
                            <th>{t('एकूण संख्या')}</th>
                            <th>{t('रक्कम')}</th>
                        </tr>
                    </thead>

                    <tbody>

                        {item.map(i => (
                            <tr key={i.name}>
                                <td>{translateClothingName(i.name, language)}</td>
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

function Collections({language}:{language:Language}) {
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
                    title={t("रोख")}
                    value={money(cash)}
                />

                <Stat
                    title="UPI"
                    value={money(upi)}
                />

                <Stat
                    title={t("कार्ड")}
                    value={money(card)}
                />

                <Stat
                    title={t('एकूण जमा')}
                    value={money(
                        cash + upi + card
                    )}
                />

            </div>


            <div className="card">

                <h2>
                    {t('आजचा हिशोब')}
                </h2>

                <p>
                    {t('सर्व जमा व्यवहार SQLite')}
                    {t('मधील <b>payments</b> टेबलमधून')}
                    {t('येतात.')}
                </p>

            </div>

        </div>
    );
}


/* =========================================================
   SETTINGS
   ========================================================= */

function Settings({ language, onLanguageChange }: { language: Language; onLanguageChange: (language: Language) => void }) {
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
                <h2>{t('language')}</h2>
                <label htmlFor="washora-language">{t('selectLanguage')}</label>
                <select
                    id="washora-language"
                    value={language}
                    onChange={(e) => onLanguageChange(e.target.value as Language)}
                >
                    <option value="en">{t('english')}</option>
                    <option value="mr">{t('marathi')}</option>
                </select>
            </div>

            <div className="card">

                <h2>
                    {t('कपड्यांचे दर')}
                </h2>

                {items.map(i => (
                    <div
                        className="rate-row"
                        key={i.id}
                    >

                        <span>{translateClothingName(i.name, language)}</span>

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
                    {t('दुकानाची माहिती')}
                </h2>

                <label>
                    {t('दुकानाचे नाव')}
                </label>

                <input
                    defaultValue={t("माझी लॉन्ड्री")}
                />

                <label>
                    {t('मोबाईल नंबर')}
                </label>

                <input
                    defaultValue="9876543210"
                />

                <label>
                    {t('पत्ता')}
                </label>

                <textarea
                    defaultValue={t("पुणे, महाराष्ट्र")}
                />

                <button
                    className="primary save-settings"
                    onClick={() =>
                        updateSettings({
                            businessName:
                                t('माझी लॉन्ड्री'),
                            mobile:
                                '9876543210',
                            address:
                                t('पुणे, महाराष्ट्र')
                        }).then(() =>
                            alert(
                                t('बदल जतन झाले.')
                            )
                        )
                    }
                >
                    {t('बदल जतन करा')}
                </button>

            </div>

        </div>
    );
}