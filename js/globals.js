// ============ DATA STORE ============
let products = [];
let sales = [];
let users = [];
let clients = [];
let creditPayments = [];
let quotes = [];
let brands = [];      // { id, name, categoryIds: [], sizeIds: [], sizeSystem }
let categories = [];  // { id, name, type, department, subcategories: [], icon, sortOrder, active }
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
