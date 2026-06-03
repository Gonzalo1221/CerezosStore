// ============ DATA STORE ============
let products = [];
let sales = [];
let users = [];
let clients = [];
let creditPayments = [];
let quotes = [];
let brands = [];      // { id, name, categoryIds: [] }
let categories = [];  // { id, name, type, department, subcategories: [], icon, sortOrder, active, sizeIds: [] }
let sizes = [];       // { id, value, label, system: 'shoe'|'clothing' }
let cart = [];
let currentPage = { inventory: 1, sales: 1, quotes: 1 };
let lastShownSaleId = null;
const ITEMS_PER_PAGE = 10;
let pendingDeleteId = null;
let pendingDeleteType = null;
let currentAbonoSaleId = null;
let currentEditClientId = null;
let currentUser = null;

// ============ PRODUCT HELPERS (V2: multi-size) ============
function getTotalStock(p) {
    if (!p.stocks || typeof p.stocks !== 'object') return 0;
    return Object.values(p.stocks).reduce((a, b) => a + (parseInt(b) || 0), 0);
}
function getStockForSize(p, sizeId) {
    if (!p.stocks || typeof p.stocks !== 'object') return 0;
    return parseInt(p.stocks[String(sizeId)]) || 0;
}
function setStockForSize(p, sizeId, qty) {
    if (!p.stocks || typeof p.stocks !== 'object') p.stocks = {};
    p.stocks[String(sizeId)] = Math.max(0, parseInt(qty) || 0);
}
function getSizeLabel(sizeId) {
    const s = sizes.find(sz => Number(sz.id) === Number(sizeId));
    return s ? s.label : String(sizeId);
}
function getSizeValue(sizeId) {
    const s = sizes.find(sz => Number(sz.id) === Number(sizeId));
    return s ? s.value : String(sizeId);
}

// ============ KEY MAPPING (camelCase ↔ snake_case) ============
function snakeToCamel(str) {
    if (str === 'description') return 'desc';
    return str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
}
function camelToSnake(str) {
    if (str === 'desc') return 'description';
    return str.replace(/[A-Z]/g, l => '_' + l.toLowerCase());
}
function mapKeys(obj, converter) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => mapKeys(item, converter));
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[converter(key)] = value;
    }
    return result;
}
