// data.jsx — Mock data for Mango Habana TPV

const PRODUCTS = [
  { id: 1,  name: 'Blazer Oversize Lino',     sku: 'MH-BLZ-001', barcode: '8410001234567', price: 89.99,  category: 'Chaquetas',   stock: 12, color: '#C4A882' },
  { id: 2,  name: 'Camiseta Básica Algodón',  sku: 'MH-CAM-002', barcode: '8410001234568', price: 19.99,  category: 'Camisetas',   stock: 45, color: '#EBEBEB' },
  { id: 3,  name: 'Pantalón Recto Midi',      sku: 'MH-PAN-003', barcode: '8410001234569', price: 49.99,  category: 'Pantalones',  stock: 8,  color: '#3D3D3D' },
  { id: 4,  name: 'Vestido Floral Midi',      sku: 'MH-VES-004', barcode: '8410001234570', price: 79.99,  category: 'Vestidos',    stock: 3,  color: '#E8C5C5' },
  { id: 5,  name: 'Falda Wrap Satén',         sku: 'MH-FAL-005', barcode: '8410001234571', price: 45.99,  category: 'Faldas',      stock: 0,  color: '#B8A090' },
  { id: 6,  name: 'Jersey Punto Fino',        sku: 'MH-JER-006', barcode: '8410001234572', price: 39.99,  category: 'Jerseys',     stock: 15, color: '#8B7355' },
  { id: 7,  name: 'Shorts Denim',             sku: 'MH-SHO-007', barcode: '8410001234573', price: 34.99,  category: 'Pantalones',  stock: 20, color: '#5B7FA6' },
  { id: 8,  name: 'Blusa Estampada',          sku: 'MH-BLU-008', barcode: '8410001234574', price: 29.99,  category: 'Camisetas',   stock: 7,  color: '#D4A5A5' },
  { id: 9,  name: 'Abrigo Largo Paño',        sku: 'MH-ABR-009', barcode: '8410001234575', price: 149.99, category: 'Chaquetas',   stock: 5,  color: '#4A4A4A' },
  { id: 10, name: 'Bolso Piel Tote',          sku: 'MH-BOL-010', barcode: '8410001234576', price: 119.99, category: 'Accesorios',  stock: 2,  color: '#C09060' },
  { id: 11, name: 'Cinturón Cuero',           sku: 'MH-CIN-011', barcode: '8410001234577', price: 29.99,  category: 'Accesorios',  stock: 18, color: '#7A5C3A' },
  { id: 12, name: 'Pendientes Perla',         sku: 'MH-PEN-012', barcode: '8410001234578', price: 14.99,  category: 'Accesorios',  stock: 30, color: '#F0EDE8' },
  { id: 13, name: 'Chaqueta Punto Crudo',     sku: 'MH-CHA-013', barcode: '8410001234579', price: 59.99,  category: 'Chaquetas',   stock: 9,  color: '#F5F0E8' },
  { id: 14, name: 'Falda Midi Plisada',       sku: 'MH-FMP-014', barcode: '8410001234580', price: 52.99,  category: 'Faldas',      stock: 4,  color: '#C8B8A2' },
  { id: 15, name: 'Top Canalé Tirantes',      sku: 'MH-TOP-015', barcode: '8410001234581', price: 22.99,  category: 'Camisetas',   stock: 35, color: '#E8E0D5' },
];

const CATEGORIES = ['Todas', 'Chaquetas', 'Camisetas', 'Pantalones', 'Vestidos', 'Faldas', 'Jerseys', 'Accesorios'];

const STAFF = [
  { id: 1, name: 'Ana García',       initials: 'AG', role: 'Dependienta Senior', status: 'activo',   sales: 47, revenue: 4230.50, joined: '2022-03-01', email: 'ana.garcia@mangohabana.es',    phone: '612 345 678' },
  { id: 2, name: 'Laura Martínez',   initials: 'LM', role: 'Dependienta',        status: 'activo',   sales: 31, revenue: 2890.00, joined: '2023-06-15', email: 'laura.m@mangohabana.es',       phone: '623 456 789' },
  { id: 3, name: 'Carmen Ruiz',      initials: 'CR', role: 'Dependienta',        status: 'inactivo', sales: 0,  revenue: 0,       joined: '2021-09-10', email: 'carmen.ruiz@mangohabana.es',   phone: '634 567 890' },
  { id: 4, name: 'Sofía López',      initials: 'SL', role: 'Dependienta',        status: 'activo',   sales: 28, revenue: 2340.75, joined: '2023-11-20', email: 'sofia.lopez@mangohabana.es',   phone: '645 678 901' },
  { id: 5, name: 'María González',   initials: 'MG', role: 'Supervisora',        status: 'activo',   sales: 19, revenue: 1876.40, joined: '2020-01-08', email: 'maria.gonzalez@mangohabana.es', phone: '656 789 012' },
];

const PAYMENT_METHODS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', bizum: 'Bizum' };

const SALES_HISTORY = [
  { id: 'TK-001248', date: '2026-06-05', time: '14:32', staff: 'Ana García',     items: [{ name: 'Blazer Oversize Lino', qty: 1, price: 89.99 }, { name: 'Camiseta Básica Algodón', qty: 2, price: 19.99 }], total: 129.97, payment: 'tarjeta' },
  { id: 'TK-001247', date: '2026-06-05', time: '13:15', staff: 'Laura Martínez', items: [{ name: 'Vestido Floral Midi', qty: 1, price: 79.99 }], total: 79.99, payment: 'efectivo' },
  { id: 'TK-001246', date: '2026-06-05', time: '12:40', staff: 'Ana García',     items: [{ name: 'Bolso Piel Tote', qty: 1, price: 119.99 }, { name: 'Pendientes Perla', qty: 1, price: 14.99 }], total: 134.98, payment: 'tarjeta' },
  { id: 'TK-001245', date: '2026-06-05', time: '11:22', staff: 'Sofía López',    items: [{ name: 'Pantalón Recto Midi', qty: 1, price: 49.99 }, { name: 'Jersey Punto Fino', qty: 1, price: 39.99 }], total: 89.98, payment: 'bizum' },
  { id: 'TK-001244', date: '2026-06-05', time: '10:55', staff: 'Ana García',     items: [{ name: 'Shorts Denim', qty: 2, price: 34.99 }], total: 69.98, payment: 'tarjeta' },
  { id: 'TK-001243', date: '2026-06-04', time: '18:10', staff: 'Laura Martínez', items: [{ name: 'Chaqueta Punto Crudo', qty: 1, price: 59.99 }], total: 59.99, payment: 'tarjeta' },
  { id: 'TK-001242', date: '2026-06-04', time: '17:05', staff: 'María González', items: [{ name: 'Top Canalé Tirantes', qty: 3, price: 22.99 }], total: 68.97, payment: 'efectivo' },
  { id: 'TK-001241', date: '2026-06-04', time: '16:30', staff: 'Ana García',     items: [{ name: 'Falda Midi Plisada', qty: 1, price: 52.99 }, { name: 'Blusa Estampada', qty: 1, price: 29.99 }], total: 82.98, payment: 'tarjeta' },
  { id: 'TK-001240', date: '2026-06-03', time: '15:45', staff: 'Sofía López',    items: [{ name: 'Abrigo Largo Paño', qty: 1, price: 149.99 }], total: 149.99, payment: 'tarjeta' },
  { id: 'TK-001239', date: '2026-06-03', time: '14:20', staff: 'Laura Martínez', items: [{ name: 'Cinturón Cuero', qty: 2, price: 29.99 }], total: 59.98, payment: 'bizum' },
];

// Calendar: June 2026 — daily sales data
const CALENDAR_DATA = {};
const calSales = [0,1320,890,1560,504,1247,1890,0,980,1340,760,2100,1450,0,0,1680,940,1230,1890,2340,0,0,1120,880,1560,1780,1340,0,0,1890,1120];
for (let d = 1; d <= 30; d++) {
  const tickets = Math.floor(calSales[d] / 90) || 0;
  CALENDAR_DATA[d] = { sales: calSales[d], tickets };
}

// Dashboard summary
const DASHBOARD = {
  salesToday: 504.90,
  salesMonth: 28340.00,
  itemsToday: 6,
  bestStaff: 'Ana García',
  topProducts: [
    { name: 'Blazer Oversize Lino', sold: 18, revenue: 1619.82 },
    { name: 'Camiseta Básica Algodón', sold: 34, revenue: 679.66 },
    { name: 'Vestido Floral Midi', sold: 15, revenue: 1199.85 },
    { name: 'Bolso Piel Tote', sold: 11, revenue: 1319.89 },
    { name: 'Pantalón Recto Midi', sold: 22, revenue: 1099.78 },
  ],
  lowStock: [
    { name: 'Falda Wrap Satén', stock: 0 },
    { name: 'Bolso Piel Tote', stock: 2 },
    { name: 'Vestido Floral Midi', stock: 3 },
  ],
};

// Reports data
const REPORTS_DATA = {
  daily: {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    values: [1320, 890, 1560, 980, 2340, 3120, 1247],
    total: 11457, tickets: 127, avg: 90.2,
  },
  weekly: {
    labels: ['S.22', 'S.23', 'S.24', 'S.25', 'S.26', 'S.27', 'S.28'],
    values: [7200, 8400, 6300, 9100, 11400, 9800, 8700],
    total: 60900, tickets: 676, avg: 90.1,
  },
  monthly: {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    values: [22000, 18500, 26000, 24300, 31200, 28340],
    total: 150340, tickets: 1670, avg: 90.0,
  },
  annual: {
    labels: ['2021', '2022', '2023', '2024', '2025', '2026'],
    values: [180000, 220000, 260000, 295000, 310000, 150340],
    total: 1415340, tickets: 15726, avg: 90.0,
  },
};

Object.assign(window, { PRODUCTS, CATEGORIES, STAFF, SALES_HISTORY, CALENDAR_DATA, DASHBOARD, REPORTS_DATA, PAYMENT_METHODS });
