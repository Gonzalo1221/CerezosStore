// ============ DATA STORE ============
let products = [];
let sales = [];
let users = [];
let clients = [];
let creditPayments = [];
let quotes = [];
let brands = [];
let categories = [];
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

// ============ API HELPERS (backend proxy) ============
function getApiToken() { return sessionStorage.getItem('cs_api_token'); }
function setApiToken(t) { sessionStorage.setItem('cs_api_token', t); }
function clearApiToken() { sessionStorage.removeItem('cs_api_token'); }

async function apiPost(path, body, timeoutMs = 15000) {
    const token = getApiToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
        });
        return res.json();
    } finally {
        clearTimeout(timer);
    }
}

async function apiQuery(table, opts = {}) {
    const result = await apiPost('/api/query', { table, ...opts });
    if (result.error) throw new Error(result.error);
    return result.data;
}

async function apiUpsert(table, data) {
    const result = await apiPost('/api/upsert', { table, data });
    if (result.error) throw new Error(result.error);
    return result.success;
}

async function apiDelete(table, id, opts = {}) {
    const body = opts.column ? { table, column: opts.column, values: opts.values } : { table, id };
    const result = await apiPost('/api/delete', body);
    if (result.error) throw new Error(result.error);
    return result.success;
}

// ============ SETTINGS ============
let ivaRate = 16;

let minStock = 5;
let autoTicket = 'yes';
let defaultInterest = 20;
let fixedCost = 0;
let businessName = 'Cerezos Store GLZ';
let businessPhone = '+52 555 123 4567';
let businessAddress = 'Av. Principal #123, Col. Centro';
let businessRfc = 'CST260101ABC';
let creditLimit = 10000;
let creditDays = 30;

function populateBrandCategoryDropdowns() {
    // Brand dropdown (product form)
    const brandSel = document.getElementById('prodBrand');
    if (brandSel) {
        const current = brandSel.value;
        brandSel.innerHTML = '<option value="">Seleccionar marca...</option>' +
            brands.map(b => `<option value="${b.name}">${b.name}</option>`).join('');
        brandSel.value = current || '';
    }
    // Category dropdown (product form)
    const catSel = document.getElementById('prodCategory');
    if (catSel) {
        const current = catSel.value;
        catSel.innerHTML = '<option value="">Seleccionar categoría...</option>' +
            categories.map(c => `<option value="${c.name}">${getCategoryIcon(c.name)} ${c.name}</option>`).join('');
        catSel.value = current || '';
    }
    // Category filter (inventory)
    const invFilter = document.getElementById('filterCategory');
    if (invFilter) {
        const current = invFilter.value;
        invFilter.innerHTML = '<option value="">Todas las categorías</option>' +
            categories.map(c => `<option value="${c.name}">${getCategoryIcon(c.name)} ${c.name}</option>`).join('');
        invFilter.value = current || '';
    }
    // Category filter (POS)
    const posFilter = document.getElementById('posCategoryFilter');
    if (posFilter) {
        const current = posFilter.value;
        posFilter.innerHTML = '<option value="">Todas</option>' +
            categories.map(c => `<option value="${c.name}">${getCategoryIcon(c.name)} ${c.name}</option>`).join('');
        posFilter.value = current || '';
    }
}

function loadSettings() {
    document.getElementById('settingsBusinessName').value = businessName;
    document.getElementById('settingsPhone').value = businessPhone;
    document.getElementById('settingsAddress').value = businessAddress;
    document.getElementById('settingsRfc').value = businessRfc;
    document.getElementById('settingsCreditLimit').value = creditLimit;
    document.getElementById('settingsCreditDays').value = creditDays;
    document.getElementById('settingsTax').value = ivaRate;

    document.getElementById('settingsMinStock').value = minStock;
    document.getElementById('settingsAutoTicket').value = autoTicket;
    document.getElementById('settingsDefaultInterest').value = defaultInterest;
    document.getElementById('settingsFixedCost').value = fixedCost;
}

function updateBusinessNameUI() {
    const els = document.querySelectorAll('#footerBusinessName, .receipt-business-name');
    els.forEach(el => { el.textContent = businessName; });
}

function reRenderCurrentPage() {
    const active = document.querySelector('.page-section.active');
    if (!active) return;
    const id = active.id;
    if (id === 'page-inventory') renderInventory();
    else if (id === 'page-pos') renderPosProducts();
    else if (id === 'page-sales') renderSalesHistory();
    else if (id === 'page-credits') renderCredits();
    else if (id === 'page-reports') renderReports();
    else if (id === 'page-users') renderUsers();
    else if (id === 'page-clients') renderClients();
    else if (id === 'page-dashboard') renderDashboard();
    else if (id === 'page-quotes') renderQuotes();
}

function saveSettings() {
    businessName = document.getElementById('settingsBusinessName').value || businessName;
    businessPhone = document.getElementById('settingsPhone').value || businessPhone;
    businessAddress = document.getElementById('settingsAddress').value || businessAddress;
    businessRfc = document.getElementById('settingsRfc').value || businessRfc;
    const v = id => document.getElementById(id).value;
    creditLimit = parseInt(v('settingsCreditLimit'));
    if (isNaN(creditLimit) || creditLimit < 0) creditLimit = 0;
    creditDays = parseInt(v('settingsCreditDays'));
    if (isNaN(creditDays) || creditDays < 0) creditDays = 30;
    ivaRate = parseInt(v('settingsTax'));
    if (isNaN(ivaRate) || ivaRate < 0) ivaRate = 0;

    minStock = parseInt(v('settingsMinStock'));
    if (isNaN(minStock) || minStock < 0) minStock = 0;
    autoTicket = v('settingsAutoTicket') || 'yes';
    defaultInterest = parseFloat(v('settingsDefaultInterest'));
    if (isNaN(defaultInterest) || defaultInterest < 0) defaultInterest = 0;
    fixedCost = parseFloat(v('settingsFixedCost'));
    if (isNaN(fixedCost) || fixedCost < 0) fixedCost = 0;
    const settingsData = {id: 1, ivaRate, minStock, autoTicket, defaultInterest, fixedCost, businessName, businessPhone, businessAddress, businessRfc, creditLimit, creditDays};
    apiUpsert('settings', settingsData).catch(e => console.warn('saveSettings:', e));
    updateBusinessNameUI();
    reRenderCurrentPage();
    showToast('Configuración guardada', 'success');
}



// ============ SAVE FUNCTIONS (via backend API) ============
async function saveProducts() {
    try {
        await apiUpsert('products', products);
    } catch (e) {
        console.warn('saveProducts:', e);
        showToast('Error al guardar productos: ' + e.message, 'error');
    }
}
async function saveSales() { try { await apiUpsert('sales', sales); } catch (e) { console.warn('saveSales:', e); } }
async function saveQuotes() { try { await apiUpsert('quotes', quotes); } catch (e) { console.warn('saveQuotes:', e); } }
function loadQuotes(data) { quotes = (data || []).map(q => ({ ...q, items: q.items || [] })); }
async function saveUsers() { try { await apiUpsert('users', users); } catch (e) { console.warn('saveUsers:', e); } }
async function saveClients() { try { await apiUpsert('clients', clients); } catch (e) { console.warn('saveClients:', e); } }
async function saveCreditPayments() { try { await apiUpsert('credit_payments', creditPayments); } catch (e) { console.warn('saveCreditPayments:', e); } }
// ============ SECURITY HELPERS (password hashing for user management) ============
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}
function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}
async function generateSalt(len = 16) {
    const salt = crypto.getRandomValues(new Uint8Array(len));
    return arrayBufferToBase64(salt.buffer);
}
async function hashPassword(password, saltBase64, iterations = 100000) {
    const enc = new TextEncoder();
    const saltBuf = base64ToArrayBuffer(saltBase64);
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new Uint8Array(saltBuf), iterations, hash: 'SHA-256' }, keyMaterial, 256);
    return arrayBufferToBase64(derivedBits);
}
function constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return result === 0;
}

// ============ PERMISSIONS (frontend) ============
const FE_PERMISSIONS = {
  'Super Admin': {
    users: ['read','create','edit','delete'],
    products: ['read','create','edit','delete'],
    sales: ['read','create','edit','delete','void'],
    clients: ['read','create','edit','delete'],
    quotes: ['read','create','edit','delete'],
    reports: ['read'],
    settings: ['read','edit'],
    credit_payments: ['read','create','edit','delete'],
    brands: ['read','create','edit','delete'],
    categories: ['read','create','edit','delete']
  },
  'Administrador': {
    users: ['read','create','edit'],
    products: ['read','create','edit','delete'],
    sales: ['read','create','edit','delete','void'],
    clients: ['read','create','edit','delete'],
    quotes: ['read','create','edit','delete'],
    reports: ['read'],
    settings: ['read'],
    credit_payments: ['read','create','edit','delete'],
    brands: ['read','create','edit','delete'],
    categories: ['read','create','edit','delete']
  },
  'Vendedor': {
    users: ['read'],
    products: ['read'],
    sales: ['read','create'],
    clients: ['read','create','edit'],
    quotes: ['read','create','edit','delete'],
    reports: ['read'],
    settings: [],
    credit_payments: ['read','create'],
    brands: ['read'],
    categories: ['read']
  }
};

function can(action, table) {
  if (!currentUser) return false;
  const perms = FE_PERMISSIONS[currentUser.role];
  if (!perms) return false;
  const actions = perms[table];
  if (!actions) return false;
  return actions.includes(action);
}

// ============ SESSION & AUTH (JWT via backend) ============
function updateSidebarUser(user) {
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserRole').textContent = user.role;
    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    document.getElementById('sidebarAvatar').textContent = initials;
    updateSidebarVisibility();
}

function updateSidebarVisibility() {
    const navItems = document.querySelectorAll('.nav-item');
    const pageTableMap = { inventory:'products', pos:'products', sales:'sales', quotes:'quotes', credits:'clients', clients:'clients', reports:'reports', users:'users', settings:'settings' };
    navItems.forEach(el => {
        const page = el.dataset.page;
        const table = pageTableMap[page];
        let visible = false;
        if (page === 'dashboard' || page === 'pos') visible = true;
        else if (table) visible = can('read', table);
        el.style.display = visible ? '' : 'none';
    });
    // Hide section titles if all items in section are hidden
    document.querySelectorAll('.nav-section').forEach(section => {
        const items = section.querySelectorAll('.nav-item');
        const visibleItems = Array.from(items).filter(i => i.style.display !== 'none');
        const title = section.querySelector('.nav-section-title');
        if (title) title.style.display = visibleItems.length > 0 ? '' : 'none';
    });
}

async function checkSessionOnLoad() {
    const token = getApiToken();
    if (!token) return false;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: controller.signal
        });
        clearTimeout(timeout);
        const data = await res.json();
        if (data.user) {
            currentUser = data.user;
            await initSupabaseOnly();
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('appLayout').classList.add('active');
            updateSidebarUser(data.user);
            initApp();
            showToast(`Bienvenido de nuevo, ${data.user.name}`, 'success');
            return true;
        }
    } catch (e) { /* token inválido */ }
    clearApiToken();
    return false;
}

// ============ LOGIN ============
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    document.getElementById('loginError').classList.remove('show');
    showLoader();
    // Allow browser to paint loader before network request
    await new Promise(r => setTimeout(r, 50));

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass }),
            signal: controller.signal
        });
        clearTimeout(timeout);
        const data = await res.json();

        if (data.token && data.user) {
            setApiToken(data.token);
            currentUser = data.user;
            await initSupabaseOnly();
            hideLoader();
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('appLayout').classList.add('active');
            updateSidebarUser(data.user);
            showToast(`Bienvenido, ${data.user.name}`, 'success');
            initApp();
        } else {
            hideLoader();
            document.getElementById('loginError').textContent = data.error || 'Credenciales incorrectas';
            document.getElementById('loginError').classList.add('show');
            setTimeout(() => document.getElementById('loginError').classList.remove('show'), 3000);
        }
    } catch (e) {
        hideLoader();
        document.getElementById('loginError').textContent = 'Error de conexión con el servidor';
        document.getElementById('loginError').classList.add('show');
        setTimeout(() => document.getElementById('loginError').classList.remove('show'), 4000);
    }
}

function handleLogout() {
    clearApiToken();
    currentUser = null;
    document.getElementById('appLayout').classList.remove('active');
    document.getElementById('loginPage').style.display = 'flex';
    cart = [];
    const sb = document.getElementById('sidebar'); if (sb) sb.classList.remove('open');
    const bd = document.getElementById('sidebarBackdrop'); if (bd) bd.classList.remove('show');
}

// ============ NAVIGATION ============
function navigateTo(page, el) {
    // Permission guard
    const pageTableMap = { inventory:'products', pos:'products', sales:'sales', quotes:'quotes', credits:'clients', clients:'clients', reports:'reports', users:'users', settings:'settings' };
    const table = pageTableMap[page];
    if (table && !can('read', table)) {
        showToast('No tienes permiso para acceder a esta sección', 'error');
        return;
    }
    
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if (el) el.classList.add('active');
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('open');
        const bd = document.getElementById('sidebarBackdrop'); if (bd) bd.classList.remove('show');
    }
    
    if (page === 'inventory') renderInventory();
    if (page === 'pos') renderPosProducts();
    if (page === 'sales') renderSalesHistory();
    if (page === 'credits') renderCredits();
    if (page === 'reports') renderReports();
    if (page === 'users') renderUsers();
    if (page === 'clients') renderClients();
    if (page === 'dashboard') renderDashboard();
    if (page === 'quotes') renderQuotes();
}

function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebarBackdrop');
    if (!sb) return;
    const isOpen = sb.classList.toggle('open');
    if (bd) {
        if (isOpen) bd.classList.add('show'); else bd.classList.remove('show');
    }
}

// ============ MODALS ============
function showModal(id) { 
    document.getElementById(id).classList.add('show'); 
    if (id === 'checkoutModal') updateCheckoutSummary();
}
function hideModal(id) { document.getElementById(id).classList.remove('show'); }

// ============ TOAST ============
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
    toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ============ INIT APP (carga datos desde backend API) ============
async function initSupabaseOnly() {
    const tables = ['users','products','clients','sales','credit_payments','brands','categories','quotes'];
    const map = { users, products, clients, sales, credit_payments: creditPayments, brands, categories, quotes };
    
    for (const table of tables) {
        try {
            const data = await apiQuery(table);
            if (data && data.length > 0) {
                const arr = map[table];
                arr.length = 0;
                data.forEach(d => arr.push(d));
            }
        } catch (e) { /* silent - will use empty arrays */ }
    }
    
    // Cargar settings desde API
    try {
        const sData = await apiQuery('settings', { columns: '*' });
        if (sData && sData.length > 0) {
            const s = sData[0];
            ivaRate = s.ivaRate !== undefined ? s.ivaRate : 16;
            minStock = s.minStock !== undefined ? s.minStock : 5;
            autoTicket = s.autoTicket || 'yes';
            defaultInterest = s.defaultInterest !== undefined ? s.defaultInterest : 20;
            fixedCost = s.fixedCost !== undefined ? s.fixedCost : 0;
            businessName = s.businessName || businessName;
            businessPhone = s.businessPhone || businessPhone;
            businessAddress = s.businessAddress || businessAddress;
            businessRfc = s.businessRfc || businessRfc;
            creditLimit = s.creditLimit !== undefined ? s.creditLimit : 10000;
            creditDays = s.creditDays !== undefined ? s.creditDays : 30;
        }
    } catch (e) { /* silent fail */ }
    
    // Fallback defaults if Supabase has no brands/categories
    if (brands.length === 0) {
        brands = [
            'Adidas','Asics','Balenciaga','Brooks','Converse','Crocs','Diadora',
            'Dr. Martens','Fila','Hoka','Jordan','New Balance','Nike','On','Puma',
            'Reebok','Saucony','Skechers','Timberland','Under Armour','Vans'
        ].map((n,i) => ({ id: i+1, name: n }));
    }
    if (categories.length === 0) {
        categories = [
            'Sneakers','Running','Casuales','Deportivas','Botas','Sandalias','Edición Limitada'
        ].map((n,i) => ({ id: i+1, name: n }));
    }
}

function initApp() {
    populateBrandCategoryDropdowns();
    loadSettings();
    updateBusinessNameUI();
    recalcClientCredits();
    renderDashboard();
    renderInventory();
    renderPosProducts();
    renderSalesHistory();
    renderCredits();
    updateQuotesCount();
    renderUsers();
    renderClients();
    renderReports();
    updateInventoryCount();
    updateClientsDropdown();
}

function updateInventoryCount() {
    document.getElementById('inventoryCount').textContent = products.length;
}

function recalcClientCredits() {
    clients.forEach(c => {
        const pendingSales = sales.filter(s => s.clientId === c.id && s.creditType === 'credito' && s.creditRemaining > 0);
        c.creditUsed = pendingSales.reduce((sum, s) => sum + s.creditRemaining, 0);
    });
    saveClients();
}

// ============ DASHBOARD ============
function renderDashboard() {
    document.getElementById('statProducts').textContent = products.length;
    const now = new Date();
    const monthPrefix = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const monthSales = sales.filter(s => s.date && s.date.startsWith(monthPrefix));
    const totalRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);
    document.getElementById('statSales').textContent = '$' + totalRevenue.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('statOrders').textContent = monthSales.length;
    
    const totalCreditsPending = sales.filter(s => s.creditType === 'credito' && s.creditRemaining > 0).reduce((sum, s) => sum + s.creditRemaining, 0);
    document.getElementById('statCredits').textContent = '$' + totalCreditsPending.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    
    const creditCount = sales.filter(s => s.creditType === 'credito' && s.creditRemaining > 0).length;
    const creditsBadge = document.getElementById('creditsBadge');
    if (creditCount > 0) {
        creditsBadge.style.display = 'inline';
        creditsBadge.textContent = creditCount;
    } else {
        creditsBadge.style.display = 'none';
    }

    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const weekDates = days.map((_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    });
    const values = weekDates.map(dateStr => {
        const daySales = sales.filter(s => {
            const sDate = s.date ? s.date.slice(0, 10) : '';
            return sDate === dateStr;
        });
        return daySales.reduce((sum, s) => sum + s.total, 0);
    });
    const maxVal = Math.max(...values);
    const chartEl = document.getElementById('weeklyChart');
    chartEl.innerHTML = days.map((d, i) => `
        <div class="bar-item">
            <div class="bar-value">$${(values[i]/1000).toFixed(1)}k</div>
            <div class="bar" style="height:${(values[i]/maxVal)*180}px"></div>
            <div class="bar-label">${d}</div>
        </div>
    `).join('');

    const topEl = document.getElementById('topSalesList');
    const salesByProduct = {};
    sales.forEach(s => {
        (s.items || []).forEach(item => {
            const key = item.name + '||' + item.price;
            if (!salesByProduct[key]) salesByProduct[key] = { name: item.name, price: item.price, qty: 0 };
            salesByProduct[key].qty += item.qty;
        });
    });
    let topList = Object.values(salesByProduct).sort((a, b) => b.qty - a.qty).slice(0, 5);
    if (topList.length === 0) {
        topList = products.filter(p => p.stock > 0).sort((a, b) => b.price - a.price).slice(0, 5);
    }
    topEl.innerHTML = topList.map((p, i) => {
        const brandCat = p.brand ? `${p.brand} · ${p.category}` : (p.qty ? `${p.qty} vendidos` : '');
        return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i < topList.length-1 ? 'border-bottom:1px solid var(--dark3);' : ''}">
            <span style="width:24px;height:24px;border-radius:50%;background:var(--dark3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--primary);">${i+1}</span>
            <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;">${p.name}</div>
                <div style="font-size:11px;color:var(--gray);">${brandCat}</div>
            </div>
            <span style="color:var(--primary);font-weight:700;font-size:14px;">$${p.price.toLocaleString()}</span>
        </div>`;
    }).join('');

    const recentBody = document.getElementById('recentSalesBody');
    const recent = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    recentBody.innerHTML = recent.map(s => `
        <tr>
            <td style="font-weight:600;color:var(--primary);">${s.ticket}</td>
            <td>${s.client}</td>
            <td>${s.items.reduce((sum, i) => sum + i.qty, 0)} artículos</td>
            <td style="font-weight:700;">$${s.total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
            <td>${s.payMethod}</td>
            <td style="color:var(--gray);">${s.date}</td>
            <td><span class="status-badge ${s.creditType === 'credito' ? (s.creditRemaining > 0 ? 'pending' : 'paid') : 'active'}"><i class="bi bi-circle-fill" style="font-size:6px;"></i> ${s.creditType === 'credito' ? (s.creditRemaining > 0 ? 'Crédito' : 'Pagado') : 'Contado'}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:30px;">No hay ventas registradas</td></tr>';
}

// ============ INVENTORY ============
function getCategoryIcon(cat) {
    const icons = { 'Sneakers': '👟', 'Running': '🏃', 'Casuales': '👞', 'Deportivas': '⚽', 'Botas': '🥾', 'Sandalias': '', 'Edición Limitada': '💎' };
    return icons[cat] || '';
}

function getStockStatus(p) {
    if (p.stock === 0) return 'out-stock';
    if (p.stock <= p.minStock) return 'low-stock';
    return 'in-stock';
}

function getStockLabel(p) {
    if (p.stock === 0) return 'Agotado';
    if (p.stock <= p.minStock) return 'Stock Bajo';
    return 'En Stock';
}

function renderInventory() {
    const search = (document.getElementById('searchInventory')?.value || '').toLowerCase();
    const catFilter = document.getElementById('filterCategory')?.value || '';
    const stockFilter = document.getElementById('filterStock')?.value || '';

    let filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search);
        const matchCat = !catFilter || p.category === catFilter;
        let matchStock = true;
        if (stockFilter === 'in') matchStock = p.stock > p.minStock;
        else if (stockFilter === 'low') matchStock = p.stock > 0 && p.stock <= p.minStock;
        else if (stockFilter === 'out') matchStock = p.stock === 0;
        return matchSearch && matchCat && matchStock;
    });

    // Group by product name+brand
    const groups = {};
    filtered.forEach(p => {
        const key = p.name + '||' + p.brand;
        if (!groups[key]) groups[key] = { name: p.name, brand: p.brand, category: p.category, sku: p.sku, cost: p.cost, price: p.price, sizes: [], totalStock: 0, ids: [] };
        groups[key].sizes.push({ size: p.size, stock: p.stock, minStock: p.minStock, id: p.id });
        groups[key].totalStock += p.stock;
        groups[key].ids.push(p.id);
    });

    const groupedList = Object.values(groups);
    const totalPages = Math.ceil(groupedList.length / ITEMS_PER_PAGE);
    const start = (currentPage.inventory - 1) * ITEMS_PER_PAGE;
    const pageItems = groupedList.slice(start, start + ITEMS_PER_PAGE);

    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = pageItems.map(g => {
        const sizesHtml = g.sizes.map(s => {
            const cls = s.stock <= s.minStock ? (s.stock === 0 ? 'size-chip danger' : 'size-chip warning') : 'size-chip';
            return `<span class="${cls}" title="Talla ${s.size}: ${s.stock} uds">${s.size}</span>`;
        }).join(' ');
        const totalCls = g.totalStock === 0 ? 'var(--danger)' : 'var(--dark)';
        return `
            <tr class="inv-group-row">
                <td>
                    <div class="product-cell">
                        <div class="product-thumb">${getCategoryIcon(g.category)}</div>
                        <div class="product-info">
                            <h4>${g.name}</h4>
                            <small>${g.brand} · ${getCategoryIcon(g.category)} ${g.category}</small>
                        </div>
                    </div>
                </td>
                <td style="font-family:monospace;color:var(--gray-light);font-size:11px;">${g.sku}</td>
                <td>
                    <div class="sizes-group">${sizesHtml}</div>
                </td>
                <td style="font-weight:700;color:${totalCls};">${g.totalStock}</td>
                <td style="font-size:11px;">
                    <div style="font-weight:600;">$${(g.price - g.cost).toLocaleString()}</div>
                    <div style="color:var(--gray-light);font-size:10px;">${g.cost > 0 ? Math.round((g.price - g.cost) / g.price * 100) + '%' : '-'}</div>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="action-btn view" onclick="viewProductGroup(${g.ids[0]})" title="Ver"><i class="bi bi-eye"></i></button>
                        ${can('edit','products') ? `<button class="action-btn edit" onclick="editProduct(${g.ids[0]})" title="Editar"><i class="bi bi-pencil"></i></button>` : ''}
                        ${can('delete','products') ? `<button class="action-btn delete" onclick='deleteProductGroup([${g.ids.join(',')}])' title="Eliminar grupo"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="6"><div class="empty-state"><i class="bi bi-box-seam"></i><h3>No hay productos</h3><p>Agrega tu primer producto al inventario</p></div></td></tr>';

    const pagEl = document.getElementById('inventoryPagination');
    if (totalPages > 1) {
        let pagHTML = `<div class="pagination-info">Mostrando ${start+1}-${Math.min(start+ITEMS_PER_PAGE, filtered.length)} de ${filtered.length}</div><div class="pagination-btns">`;
        pagHTML += `<button class="page-btn" onclick="changeInvPage(${currentPage.inventory - 1})" ${currentPage.inventory === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i++) {
            pagHTML += `<button class="page-btn ${i === currentPage.inventory ? 'active' : ''}" onclick="changeInvPage(${i})">${i}</button>`;
        }
        pagHTML += `<button class="page-btn" onclick="changeInvPage(${currentPage.inventory + 1})" ${currentPage.inventory === totalPages ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button></div>`;
        pagEl.innerHTML = pagHTML;
    } else {
        pagEl.innerHTML = filtered.length > 0 ? `<div class="pagination-info">Mostrando ${filtered.length} productos</div>` : '';
    }
    updateInventoryCount();
}

function changeInvPage(page) {
    if (page < 1) return;
    currentPage.inventory = page;
    renderInventory();
}

function getFilteredProducts() {
    const search = (document.getElementById('searchInventory')?.value || '').toLowerCase();
    const catFilter = document.getElementById('filterCategory')?.value || '';
    const stockFilter = document.getElementById('filterStock')?.value || '';
    return products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search);
        const matchCat = !catFilter || p.category === catFilter;
        let matchStock = true;
        if (stockFilter === 'in') matchStock = p.stock > p.minStock;
        else if (stockFilter === 'low') matchStock = p.stock > 0 && p.stock <= p.minStock;
        else if (stockFilter === 'out') matchStock = p.stock === 0;
        return matchSearch && matchCat && matchStock;
    });
}

function filterInventory() {
    currentPage.inventory = 1;
    renderInventory();
}

// ============ PRODUCT CRUD ============
function autoCalcPrice() {
    const cost = parseFloat(document.getElementById('prodCost').value) || 0;
    const base = cost + fixedCost;
    const price = base * (1 + defaultInterest / 100);
    const priceInput = document.getElementById('prodPrice');
    if (!priceInput.dataset.userEdited) {
        priceInput.value = price > 0 ? price.toFixed(2) : '';
    }
    const hint = document.getElementById('autoCalcHint');
    if (cost > 0) {
        hint.textContent = fixedCost > 0
            ? `↳ ($${cost.toLocaleString()} + $${fixedCost.toLocaleString()}) × ${(100 + defaultInterest) / 100}`
            : `↳ $${cost.toLocaleString()} × ${(100 + defaultInterest) / 100}`;
    } else {
        hint.textContent = '';
    }
}
document.getElementById('prodPrice')?.addEventListener('focus', function() { this.dataset.userEdited = 'true'; });
document.getElementById('prodPrice')?.addEventListener('input', function() { this.dataset.userEdited = 'true'; });

function getSizeRows() {
    const rows = document.querySelectorAll('#sizesContainer .size-row');
    const sizes = [];
    rows.forEach(row => {
        const size = row.querySelector('.size-select')?.value;
        const stock = parseInt(row.querySelector('.size-stock')?.value) || 0;
        if (size) sizes.push({ size, stock });
    });
    return sizes;
}

function addSizeRow(size, stock) {
    const container = document.getElementById('sizesContainer');
    const idx = container.children.length;
    const selOptions = ['36','36.5','37','37.5','38','38.5','39','39.5','40','40.5','41','41.5','42','42.5','43']
        .map(s => `<option ${s === size ? 'selected' : ''}>${s}</option>`).join('');
    const div = document.createElement('div');
    div.className = 'size-row';
    div.dataset.index = idx;
    div.innerHTML = `
        <select class="form-select size-select" style="flex:1;">${selOptions}</select>
        <input type="number" class="form-input size-stock" placeholder="Stock" min="0" style="width:80px;text-align:center;" value="${stock || ''}">
        <button type="button" class="btn btn-sm btn-danger size-remove" onclick="removeSizeRow(this)" style="padding:3px 8px;font-size:11px;"><i class="bi bi-x"></i></button>
    `;
    container.appendChild(div);
}

function removeSizeRow(btn) {
    const rows = document.querySelectorAll('#sizesContainer .size-row');
    if (rows.length <= 1) { showToast('Debe haber al menos una talla', 'error'); return; }
    btn.closest('.size-row').remove();
}

function getProductGroupId(p) {
    return [p.name, p.brand, p.category, p.gender, p.cost, p.price].join('||');
}

async function saveProduct() {
    const editId = document.getElementById('editProductId').value;
    const name = document.getElementById('prodName').value.trim();
    const brand = document.getElementById('prodBrand').value.trim();
    const category = document.getElementById('prodCategory').value;
    const gender = document.getElementById('prodGender').value;
    const skuBase = document.getElementById('prodSKU').value.trim();
    const cost = parseFloat(document.getElementById('prodCost').value) || 0;
    const price = parseFloat(document.getElementById('prodPrice').value) || 0;
    const minStock = parseInt(document.getElementById('prodMinStock').value) || 5;
    const desc = document.getElementById('prodDesc').value.trim();
    const sellWithoutStock = document.getElementById('prodSellWithoutStock').checked;
    const sizes = getSizeRows();

    if (!name) { showToast('Ingresa el nombre del producto', 'error'); return; }
    if (price <= 0) { showToast('Ingresa un precio de venta válido', 'error'); return; }

    // Remove old products in this group if editing
    if (editId) {
        const groupKey = editId;
        const oldProducts = products.filter(p => getProductGroupId(p) === groupKey);
        for (const p of oldProducts) {
            await apiDelete('products', p.id).catch(() => {});
        }
        products = products.filter(p => getProductGroupId(p) !== groupKey);
    }

    // Create one product per size
    sizes.forEach((s, i) => {
        const sku = skuBase || (name.slice(0,3).toUpperCase() + '-' + brand.slice(0,2).toUpperCase() + '-' + s.size);
        products.push({
            id: Date.now() + i,
            name, brand, category, gender,
            size: s.size,
            sku,
            cost, price,
            stock: s.stock,
            minStock,
            sellWithoutStock,
            desc
        });
    });

    await saveProducts();
    hideModal('productModal');
    clearProductForm();
    reRenderCurrentPage();
    showToast(editId ? 'Productos actualizados' : 'Productos agregados', 'success');
}

function editProduct(id) {
    const p = products.find(pr => pr.id === id);
    if (!p) return;
    const groupKey = getProductGroupId(p);
    const groupProducts = products.filter(pr => getProductGroupId(pr) === groupKey);
    
    document.getElementById('editProductId').value = groupKey;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodBrand').value = p.brand;
    document.getElementById('prodCategory').value = p.category;
    document.getElementById('prodGender').value = p.gender;
    document.getElementById('prodSKU').value = p.sku;
    document.getElementById('prodCost').value = p.cost;
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodMinStock').value = p.minStock;
    document.getElementById('prodDesc').value = p.desc || '';
    document.getElementById('prodSellWithoutStock').checked = p.sellWithoutStock || false;
    document.getElementById('productModalTitle').textContent = '✏️ Editar Producto';
    
    // Load all size rows
    const container = document.getElementById('sizesContainer');
    container.innerHTML = '';
    groupProducts.forEach((gp, i) => {
        const selOptions = ['36','36.5','37','37.5','38','38.5','39','39.5','40','40.5','41','41.5','42','42.5','43']
            .map(s => `<option ${s === gp.size ? 'selected' : ''}>${s}</option>`).join('');
        const div = document.createElement('div');
        div.className = 'size-row';
        div.dataset.index = i;
        div.innerHTML = `
            <select class="form-select size-select" style="flex:1;">${selOptions}</select>
            <input type="number" class="form-input size-stock" placeholder="Stock" min="0" style="width:80px;text-align:center;" value="${gp.stock}">
            <button type="button" class="btn btn-sm btn-danger size-remove" onclick="removeSizeRow(this)" style="padding:3px 8px;font-size:11px;"><i class="bi bi-x"></i></button>
        `;
        container.appendChild(div);
    });
    
    showModal('productModal');
}

function viewProductGroup(id) {
    const p = products.find(pr => pr.id === id);
    if (!p) return;
    // Find all variants with same name+brand
    const variants = products.filter(pr => pr.name === p.name && pr.brand === p.brand);
    const content = document.getElementById('viewProductContent');
    const sizesHtml = variants.map(v => {
        const cls = v.stock <= v.minStock ? (v.stock === 0 ? 'size-chip danger' : 'size-chip warning') : 'size-chip';
        return `<span class="${cls}" style="margin:2px;min-width:44px;padding:4px 10px;font-size:13px;">${v.size} (${v.stock})</span>`;
    }).join('');
    content.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
            <div style="width:64px;height:64px;border-radius:16px;background:var(--dark3);display:flex;align-items:center;justify-content:center;font-size:32px;">${getCategoryIcon(p.category)}</div>
            <div>
                <h2 style="font-size:20px;">${p.name}</h2>
                <p style="color:var(--gray);font-size:13px;">${p.brand} · ${p.category} · ${p.gender}</p>
            </div>
        </div>
        <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;margin-bottom:12px;">
            <div style="font-size:11px;color:var(--gray);margin-bottom:6px;">Tallas disponibles (Stock)</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">${sizesHtml}</div>
        </div>
        <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;margin-bottom:12px;">
            <div style="font-size:11px;color:var(--gray);margin-bottom:4px;">SKU</div>
            <div style="font-weight:600;font-family:monospace;">${p.sku}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Precio Compra</div>
                <div style="font-weight:600;">$${p.cost.toLocaleString()}</div>
            </div>
            <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Precio Venta</div>
                <div style="font-weight:600;color:var(--primary);">$${p.price.toLocaleString()}</div>
            </div>
        </div>
    `;
    showModal('viewProductModal');
}

function deleteProductGroup(ids) {
    ids.forEach(id => {
        products = products.filter(p => p.id !== id);
        apiDelete('products', id);
    });
    saveProducts();
    reRenderCurrentPage();
    showToast(ids.length + ' productos eliminados', 'success');
}

function viewProduct(id) {
    const p = products.find(pr => pr.id === id);
    if (!p) return;
    const content = document.getElementById('viewProductContent');
    content.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
            <div style="width:64px;height:64px;border-radius:16px;background:var(--dark3);display:flex;align-items:center;justify-content:center;font-size:32px;">${getCategoryIcon(p.category)}</div>
            <div>
                <h2 style="font-size:20px;">${p.name}</h2>
                <p style="color:var(--gray);font-size:13px;">${p.brand} · ${p.category} · ${p.gender}</p>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">SKU</div>
                <div style="font-family:monospace;font-weight:600;">${p.sku}</div>
            </div>
            <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Talla</div>
                <div style="font-weight:600;">${p.size}</div>
            </div>
            <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Precio Compra</div>
                <div style="font-weight:600;">$${p.cost.toLocaleString()}</div>
            </div>
            <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Precio Venta</div>
                <div style="font-weight:600;color:var(--primary);">$${p.price.toLocaleString()}</div>
            </div>
            <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Stock Actual</div>
                <div style="font-weight:700;${p.stock <= p.minStock ? 'color:' + (p.stock === 0 ? 'var(--danger)' : 'var(--warning)') : ''}">${p.stock} unidades</div>
            </div>
            <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Stock Mínimo</div>
                <div style="font-weight:600;">${p.minStock} unidades</div>
            </div>
        </div>
        ${p.desc ? `<div style="margin-top:16px;padding:12px 16px;background:var(--dark3);border-radius:10px;"><div style="font-size:11px;color:var(--gray);margin-bottom:4px;">Descripción</div><p style="font-size:13px;">${p.desc}</p></div>` : ''}
        <div style="margin-top:16px;padding:12px 16px;background:var(--dark3);border-radius:10px;">
            <div style="font-size:11px;color:var(--gray);margin-bottom:4px;">Margen de Ganancia</div>
            <div style="font-weight:700;color:var(--success);">${p.cost > 0 ? ((p.price - p.cost) / p.price * 100).toFixed(1) : 0}%</div>
        </div>
    `;
    showModal('viewProductModal');
}

function deleteProduct(id) {
    pendingDeleteId = id;
    pendingDeleteType = 'product';
    document.getElementById('confirmMessage').textContent = '¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.';
    showModal('confirmModal');
}

async function confirmSuperAdminAuth() {
    const email = document.getElementById('superAuthEmail').value.trim();
    const pass = document.getElementById('superAuthPass').value;
    if (!email || !pass) { showToast('Ingresa correo y contraseña del Super Admin', 'error'); return; }
    const superAdmin = users.find(u => u.email === email && u.role === 'Super Admin');
    if (!superAdmin) { showToast('No se encontró un Super Admin con ese correo', 'error'); return; }
    const enteredHash = await hashPassword(pass, superAdmin.passwordSalt, superAdmin.passwordIterations || 100000);
    if (!constantTimeCompare(enteredHash, superAdmin.passwordHash)) {
        showToast('Contraseña incorrecta', 'error');
        return;
    }
    hideModal('superAdminAuthModal');
    // Proceed with deletion
    users = users.filter(u => u.id !== pendingDeleteId);
    saveUsers();
    apiDelete('users', pendingDeleteId);
    renderUsers();
    pendingDeleteId = null;
    pendingDeleteType = null;
    showToast('Usuario eliminado (aprobado por Super Admin)', 'success');
}

function confirmAction() {
    if (pendingDeleteType === 'product') {
        products = products.filter(p => p.id !== pendingDeleteId);
        saveProducts();
        apiDelete('products', pendingDeleteId);
        renderInventory();
        renderDashboard();
        showToast('Producto eliminado', 'success');
    } else if (pendingDeleteType === 'user') {
        users = users.filter(u => u.id !== pendingDeleteId);
        saveUsers();
        apiDelete('users', pendingDeleteId);
        renderUsers();
        document.getElementById('confirmBtn').textContent = 'Eliminar';
        showToast('Usuario eliminado', 'success');
    } else if (pendingDeleteType === 'sale') {
        sales = sales.filter(s => s.id !== pendingDeleteId);
        creditPayments = creditPayments.filter(cp => cp.saleId !== pendingDeleteId);
        recalcClientCredits();
        saveSales();
        saveCreditPayments();
        apiDelete('sales', pendingDeleteId);
        // Delete credit payments by sale_id in Supabase
        apiDelete('credit_payments', null, { column: 'sale_id', values: [pendingDeleteId] }).catch(() => {});
        renderSalesHistory();
        renderDashboard();
        renderCredits();
        showToast('Venta eliminada', 'success');
    } else if (pendingDeleteType === 'client') {
        // Nullify clientId in their sales so lookups don't break
        sales.filter(s => s.clientId === pendingDeleteId).forEach(s => { s.clientId = null; });
        saveSales();
        clients = clients.filter(c => c.id !== pendingDeleteId);
        saveClients();
        apiDelete('clients', pendingDeleteId);
        updateClientsDropdown();
        reRenderCurrentPage();
        showToast('Cliente eliminado', 'success');
    } else if (pendingDeleteType === 'quote') {
        quotes = quotes.filter(q => q.id !== pendingDeleteId);
        saveQuotes();
        apiDelete('quotes', pendingDeleteId);
        updateQuotesCount();
        const totalPages = Math.ceil(quotes.length / ITEMS_PER_PAGE);
        if (currentPage.quotes > totalPages) currentPage.quotes = Math.max(1, totalPages);
        reRenderCurrentPage();
        showToast('Cotización eliminada', 'success');
    }
    hideModal('confirmModal');
    document.getElementById('confirmBtn').textContent = 'Eliminar';
    pendingDeleteId = null;
    pendingDeleteType = null;
}

function clearProductForm() {
    document.getElementById('editProductId').value = '';
    document.getElementById('prodName').value = '';
    document.getElementById('prodBrand').value = '';
    document.getElementById('prodCategory').value = categories.length > 0 ? categories[0].name : '';
    document.getElementById('prodGender').value = 'Unisex';
    document.getElementById('prodSKU').value = '';
    document.getElementById('prodCost').value = '';
    document.getElementById('prodPrice').value = '';
    document.getElementById('prodMinStock').value = '5';
    document.getElementById('prodDesc').value = '';
    document.getElementById('prodSellWithoutStock').checked = false;
    document.getElementById('productModalTitle').textContent = '👟 Nuevo Producto';
    // Reset sizes container to one empty row
    document.getElementById('sizesContainer').innerHTML = `
        <div class="size-row" data-index="0">
            <select class="form-select size-select" style="flex:1;">
                ${['36','36.5','37','37.5','38','38.5','39','39.5','40','40.5','41','41.5','42','42.5','43'].map(s => `<option ${s === '39' ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <input type="number" class="form-input size-stock" placeholder="Stock" min="0" style="width:80px;text-align:center;">
            <button type="button" class="btn btn-sm btn-danger size-remove" onclick="removeSizeRow(this)" style="padding:3px 8px;font-size:11px;"><i class="bi bi-x"></i></button>
        </div>
    `;
}

// ============ IMPORT CSV ============
let csvData = null;

function downloadTemplate() {
    const headers = 'Nombre,Marca,Categoría,Talla,Género,SKU,PrecioCompra,PrecioVenta,Stock,StockMinimo,Descripcion\nAir Max 90,Nike,Sneakers,39,Unisex,NK-AM90-001,1200,2499,15,5,Clásico diseño Air Max';
    const blob = new Blob(['\ufeff' + headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_productos_cerezos.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function handleCSVImport(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('csvFileName').textContent = file.name;
        document.getElementById('importBtn').disabled = false;
        const reader = new FileReader();
        reader.onload = function(e) { csvData = e.target.result; };
        reader.readAsText(file);
    }
}

function processCSVImport() {
    if (!csvData) return;
    const lines = csvData.split('\n').filter(l => l.trim());
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.length >= 9) {
            products.push({
                id: Date.now() + i,
                name: cols[0] || 'Sin nombre', brand: cols[1] || '', category: cols[2] || 'Sneakers',
                size: cols[3] || '26', color: cols[4] || '', gender: cols[5] || 'Unisex',
                sku: cols[6] || 'SKU-' + (Date.now() + i),
                cost: parseFloat(cols[7]) || 0, price: parseFloat(cols[8]) || 0,
                stock: parseInt(cols[9]) || 0, minStock: parseInt(cols[10]) || 5, desc: cols[11] || ''
            });
            imported++;
        }
    }
    saveProducts();
    renderInventory();
    renderDashboard();
    hideModal('importModal');
    showToast(`${imported} productos importados correctamente`, 'success');
    csvData = null;
    document.getElementById('csvFileName').textContent = 'Arrastra o haz clic para seleccionar';
    document.getElementById('importBtn').disabled = true;
    document.getElementById('csvFileInput').value = '';
}

// ============ POS ============
function renderPosProducts() {
    const search = (document.getElementById('posSearch')?.value || '').toLowerCase();
    const catFilter = document.getElementById('posCategoryFilter')?.value || '';
    
    let filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search);
        const matchCat = !catFilter || p.category === catFilter;
        return matchSearch && matchCat;
    });

    // Group by product model
    const groups = {};
    filtered.forEach(p => {
        const key = getProductGroupId(p);
        if (!groups[key]) groups[key] = { name: p.name, brand: p.brand, category: p.category, price: p.price, sizes: [], totalStock: 0 };
        groups[key].sizes.push(p);
        groups[key].totalStock += p.stock;
    });

    const grid = document.getElementById('posProductsGrid');
    grid.innerHTML = Object.values(groups).map(g => {
        const canSellWithoutStock = g.sizes.some(s => s.sellWithoutStock);
        const allOut = g.totalStock === 0 && !canSellWithoutStock;
        const availSizes = g.sizes.filter(s => s.stock > 0 || s.sellWithoutStock).map(s => s.size).join(', ');
        const hasAvail = g.totalStock > 0 || canSellWithoutStock;
        return `
        <div class="pos-product-card ${allOut ? 'pos-out-of-stock' : ''}" onclick="${allOut ? '' : (g.sizes.length === 1 && (g.sizes[0].stock > 0 || g.sizes[0].sellWithoutStock) ? `addToCart(${g.sizes[0].id})` : `showSizePicker('${g.name.replace(/'/g, "\\'")}', ${g.price}, '${g.category}')`)}" style="${allOut ? 'opacity:0.55;cursor:default;' : ''}">
            ${g.totalStock === 0 ? '<div class="pos-stock-badge">AGOTADO</div>' : ''}
            <div class="pos-thumb">${getCategoryIcon(g.category)}</div>
            <h4>${g.name}</h4>
            <div class="pos-price">$${g.price.toLocaleString()}</div>
            <div class="pos-sku">${g.brand} ${g.sizes.length > 0 ? '· Tallas: ' + g.sizes.map(s => s.size).join(', ') : ''}</div>
            ${hasAvail ? `<div class="pos-sku" style="color:var(--success);margin-top:2px;">${g.sizes.filter(s => s.stock > 0 || s.sellWithoutStock).length} tallas disponibles</div>` : ''}
        </div>`;
    }).join('') || '<div class="empty-state" style="grid-column:1/-1;"><i class="bi bi-search"></i><h3>No se encontraron productos</h3></div>';
    
    // Store filtered groups and raw products for size picker
    window._posGroups = groups;
    window._posFiltered = filtered;
}

function filterPosProducts() { renderPosProducts(); }

let _pickerGroupName = '';
let _pickerSizes = [];
let _pickerQty = 1;
let _pickerSelectedSize = null;

function showSizePicker(name, price, category) {
    const filtered = window._posFiltered || products;
    const groupProducts = filtered.filter(p => p.name === name && p.price === price);
    _pickerGroupName = name;
    _pickerSizes = groupProducts;
    _pickerSelectedSize = null;
    _pickerQty = 1;
    document.getElementById('sizePickerTitle').textContent = name;
    const grid = document.getElementById('sizePickerGrid');
    grid.innerHTML = groupProducts.map(p => {
        const out = p.stock === 0 && !p.sellWithoutStock;
        return `
            <div class="pos-product-card ${out ? 'pos-out-of-stock' : ''}" onclick="${out ? '' : `selectPickerSize(${p.id})`}" id="pickerSize-${p.id}" style="padding:12px 8px;cursor:${out ? 'default' : 'pointer'};${out ? 'opacity:0.55;' : ''}border:2px solid transparent;">
                ${out ? '<div class="pos-stock-badge">AGOTADO</div>' : ''}
                <div style="font-size:24px;font-weight:800;color:var(--primary);">${p.size}</div>
                <div style="font-size:10px;color:var(--gray);margin-top:4px;">${p.stock} uds</div>
            </div>`;
    }).join('');
    document.getElementById('sizePickerQty').style.display = 'none';
    showModal('sizePickerModal');
}

function selectPickerSize(id) {
    _pickerSelectedSize = id;
    _pickerQty = 1;
    document.querySelectorAll('#sizePickerGrid .pos-product-card').forEach(el => el.style.borderColor = 'transparent');
    document.getElementById('pickerSize-' + id).style.borderColor = 'var(--primary)';
    const p = _pickerSizes.find(s => s.id === id);
    document.getElementById('sizePickerSelected').textContent = 'Talla ' + p.size + ' · $' + p.price.toLocaleString();
    document.getElementById('sizePickerQtyVal').textContent = '1';
    document.getElementById('sizePickerQty').style.display = 'block';
}

function sizePickerQty(delta) {
    _pickerQty = Math.max(1, _pickerQty + delta);
    const p = _pickerSizes.find(s => s.id === _pickerSelectedSize);
    if (p && !p.sellWithoutStock) _pickerQty = Math.min(_pickerQty, p.stock);
    document.getElementById('sizePickerQtyVal').textContent = _pickerQty;
}

function sizePickerAdd() {
    if (!_pickerSelectedSize) return;
    const p = _pickerSizes.find(s => s.id === _pickerSelectedSize);
    if (!p) return;
    for (let i = 0; i < _pickerQty; i++) {
        const existing = cart.find(c => c.productId === p.id);
        if (existing) {
            if (!p.sellWithoutStock && existing.qty >= p.stock) break;
            existing.qty++;
        } else {
            cart.push({ productId: p.id, name: p.name, price: p.price, sku: p.sku, qty: 1, icon: getCategoryIcon(p.category), size: p.size });
        }
    }
    renderCart();
    renderPosProducts();
    hideModal('sizePickerModal');
    showToast(_pickerQty + 'x ' + p.name + ' (Talla ' + p.size + ') agregado', 'success');
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || (product.stock === 0 && !product.sellWithoutStock)) return;
    
    const existing = cart.find(c => c.productId === productId);
    if (existing) {
        if (!product.sellWithoutStock && existing.qty >= product.stock) { showToast('No hay suficiente stock', 'error'); return; }
        existing.qty++;
    } else {
        cart.push({ productId, name: product.name, price: product.price, sku: product.sku, qty: 1, icon: getCategoryIcon(product.category) });
    }
    renderCart();
    renderPosProducts();
}

function updateCartQty(productId, delta) {
    const item = cart.find(c => c.productId === productId);
    if (!item) return;
    const product = products.find(p => p.id === productId);
    item.qty += delta;
    if (item.qty <= 0) { cart = cart.filter(c => c.productId !== productId); }
    else if (product && !product.sellWithoutStock && item.qty > product.stock) { item.qty = product.stock; showToast('Stock máximo alcanzado', 'error'); }
    renderCart();
}

function removeFromCart(productId) {
    cart = cart.filter(c => c.productId !== productId);
    renderCart();
}

function clearCart() {
    if (cart.length === 0) {
        showToast('El carrito ya está vacío', 'info');
        return;
    }
    if (!confirm('¿Deseas vaciar todo el carrito?')) return;
    cart = [];
    renderCart();
    showToast('Carrito limpiado', 'success');
}

function updateCheckoutSummary() {
    document.getElementById('cartTaxLabel').textContent = ivaRate;
    document.getElementById('checkoutTaxLabel').textContent = ivaRate;
    const sub = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
    const subtotal = Math.round(sub);
    const tax = Math.round(subtotal * (ivaRate / 100));
    const total = subtotal + tax;
    const itemsCount = cart.reduce((sum, c) => sum + c.qty, 0);

    document.getElementById('checkoutItems').textContent = itemsCount;
    document.getElementById('checkoutSubtotal').textContent = '$' + subtotal.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('checkoutTax').textContent = '$' + tax.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    const creditRadio = document.querySelector('input[name="payMethod"]:checked');
    if (!creditRadio || creditRadio.value !== 'Crédito') {
        document.getElementById('checkoutTotal').textContent = '$' + total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    }
}

function renderCart() {
    resetManualTotal();
    const container = document.getElementById('cartItems');
    const countEl = document.getElementById('cartCount');
    const subtotalEl = document.getElementById('cartSubtotal');
    const taxEl = document.getElementById('cartTax');
    const totalEl = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');

    countEl.textContent = cart.reduce((sum, c) => sum + c.qty, 0);

    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><i class="bi bi-cart"></i><p>Agrega productos al carrito</p></div>';
        subtotalEl.textContent = '$0.00';
        taxEl.textContent = '$0.00';
        totalEl.textContent = '$0.00';
        checkoutBtn.disabled = true;
        updateCheckoutSummary();
        return;
    }

    container.innerHTML = cart.map(c => `
        <div class="cart-item">
            <div class="ci-icon">${c.icon}</div>
            <div class="ci-info">
                <h4>${c.name}</h4>
                <small>${c.sku}</small>
            </div>
            <div class="qty-control">
                <button class="qty-btn" onclick="updateCartQty(${c.productId}, -1)">−</button>
                <span class="qty-val">${c.qty}</span>
                <button class="qty-btn" onclick="updateCartQty(${c.productId}, 1)">+</button>
            </div>
            <span class="ci-price">$${(c.price * c.qty).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
            <button class="ci-remove" onclick="removeFromCart(${c.productId})"><i class="bi bi-x"></i></button>
        </div>
    `).join('');

    const subtotal = Math.round(cart.reduce((sum, c) => sum + c.price * c.qty, 0));
    const tax = Math.round(subtotal * (ivaRate / 100));
    const total = subtotal + tax;

    subtotalEl.textContent = '$' + subtotal.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    taxEl.textContent = '$' + tax.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    totalEl.textContent = '$' + total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    checkoutBtn.disabled = false;
    
    updateCheckoutSummary();
}

// ============ CHECKOUT ============
function updateClientsDropdown() {
    const select = document.getElementById('checkoutClient');
    select.innerHTML = '<option value="">👤 Consumidor Final</option>' + 
        clients.map(c => `<option value="${c.id}">👤 ${c.name}</option>`).join('');
}

function saveClient() {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const creditLimit = parseFloat(document.getElementById('clientCreditLimit').value) || 0;
    if (!name) { showToast('Ingresa el nombre del cliente', 'error'); return; }
    clients.push({ id: Date.now(), name, phone, email, creditLimit, creditUsed: 0, creditEnabled: true });
    saveClients();
    updateClientsDropdown();
    hideModal('clientModal');
    document.getElementById('clientName').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientCreditLimit').value = '0';
    reRenderCurrentPage();
    showToast('Cliente registrado', 'success');
}

function onClientChange() {
    const clientId = document.getElementById('checkoutClient').value;
    const creditInfo = document.getElementById('clientCreditInfo');
    const creditoRadioLabel = document.getElementById('creditoRadioLabel');
    
    if (clientId) {
        const client = clients.find(c => c.id === parseInt(clientId));
        if (client) {
            const creditEnabled = client.creditEnabled !== false;
            if (!creditEnabled) {
                creditInfo.style.display = 'none';
                creditoRadioLabel.style.display = 'none';
                const selected = document.querySelector('input[name="payMethod"]:checked');
                if (selected && selected.value === 'Crédito') {
                    document.querySelector('input[name="payMethod"][value="Efectivo"]').checked = true;
                    toggleCreditOptions();
                }
                return;
            }
            const isUnlimited = client.creditLimit === 0;
            const available = isUnlimited ? Infinity : client.creditLimit - client.creditUsed;
            document.getElementById('clientAvailableCredit').textContent = isUnlimited ? '♾️ Sin límite' : '$' + available.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
            document.getElementById('creditUsed').textContent = '$' + client.creditUsed.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
            document.getElementById('creditLimit').textContent = isUnlimited ? '♾️ Ilimitado' : '$' + client.creditLimit.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
            
            const pct = client.creditLimit > 0 ? (client.creditUsed / client.creditLimit * 100) : 0;
            const barFill = document.getElementById('creditBarFill');
            barFill.style.width = pct + '%';
            barFill.className = 'credit-bar-fill ' + (pct < 50 ? 'safe' : pct < 80 ? 'warning' : 'danger');
            
            creditInfo.style.display = 'block';
            creditoRadioLabel.style.display = available > 0 ? 'flex' : 'none';
            
            if (available <= 0) {
                const selected = document.querySelector('input[name="payMethod"]:checked');
                if (selected && selected.value === 'Crédito') {
                    document.querySelector('input[name="payMethod"][value="Efectivo"]').checked = true;
                    toggleCreditOptions();
                }
            }
            return;
        }
    }
    creditInfo.style.display = 'none';
    creditoRadioLabel.style.display = 'flex';
}

function toggleCreditOptions() {
    const isCredit = document.querySelector('input[name="payMethod"]:checked').value === 'Crédito';
    document.getElementById('creditOptions').style.display = isCredit ? 'block' : 'none';
    if (isCredit) updateCreditInfo();
}

function getCreditInterestRate(installments) {
    const rates = { 1: 0, 2: 0.35, 3: 0.45, 4: 0.55 };
    return rates[installments] || 0;
}

function updateCreditInfo() {
    const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
    const tax = Math.round(cartTotal * (ivaRate / 100));
    const totalWithTax = manualTotalOverride || cartTotal + tax;
    
    const downPayment = Math.round(parseFloat(document.getElementById('creditDownPayment').value) || 0);
    const baseFinanced = Math.max(0, totalWithTax - downPayment);
    const installments = parseInt(document.getElementById('creditInstallments').value) || 1;
    let interestRate, interestAmount, totalFinanced, installmentValue;
    if (manualTotalOverride) {
        // Manual total: no interest, just divide
        interestRate = 0;
        interestAmount = 0;
        totalFinanced = baseFinanced > 0 ? baseFinanced : totalWithTax;
        installmentValue = installments > 0 ? Math.round(totalFinanced / installments) : 0;
    } else {
        interestRate = getCreditInterestRate(installments);
        interestAmount = Math.round(baseFinanced * interestRate);
        totalFinanced = baseFinanced + interestAmount;
        installmentValue = installments > 0 ? Math.round(totalFinanced / installments) : 0;
    }
    
    const daysPerInstallment = { 1: 30, 2: 60, 3: 90, 4: 120 };
    const totalDays = daysPerInstallment[installments] || 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + totalDays);
    
    document.getElementById('creditRemaining').textContent = '$' + totalFinanced.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('creditInterestAmount').parentElement.style.display = manualTotalOverride ? 'none' : 'flex';
    document.getElementById('creditInterestAmount').textContent = '+' + interestAmount.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('creditInstallmentValue').textContent = '$' + installmentValue.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0}) + ' x ' + installments + (installments > 1 ? ' cuotas' : ' cuota');
    
    // Update main checkout total
    const label = manualTotalOverride ? '(ajustado)' : '(financiado)';
    document.getElementById('checkoutTotal').innerHTML = '$' + totalFinanced.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0}) + ' <span style="font-size:11px;color:var(--gray-light);font-weight:400;">' + label + '</span>';
}

let manualTotalOverride = null;

function resetManualTotal() {
    manualTotalOverride = null;
    const row = document.getElementById('editTotalRow');
    if (row) row.style.display = 'none';
    const creditRadio = document.querySelector('input[name="payMethod"]:checked');
    if (creditRadio && creditRadio.value === 'Crédito') updateCreditInfo();
}

function toggleEditTotal() {
    const row = document.getElementById('editTotalRow');
    const input = document.getElementById('manualTotalInput');
    if (row.style.display === 'none') {
        const current = document.getElementById('checkoutTotal').textContent.replace(/[^0-9]/g, '');
        input.value = current || '';
        row.style.display = 'block';
        input.focus();
        input.select();
    } else {
        row.style.display = 'none';
    }
}
function applyManualTotal() {
    const input = document.getElementById('manualTotalInput');
    const val = parseInt(input.value);
    if (val && val > 0) {
        manualTotalOverride = val;
        // Check if credit is active
        const isCredit = document.querySelector('input[name="payMethod"]:checked').value === 'Crédito';
        if (isCredit) {
            updateCreditInfo();
        } else {
            document.getElementById('checkoutTotal').innerHTML = '$' + val.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0}) + ' <span style="font-size:11px;color:var(--gray-light);font-weight:400;">(ajustado)</span>';
        }
        document.getElementById('editTotalRow').style.display = 'none';
    } else {
        showToast('Ingresa un valor válido', 'error');
    }
}
function resetTotal() {
    resetManualTotal();
    renderCart();
}

let editingSaleId = null;
let editingSaleBackup = null;

function editSale(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    if (sale.status === 'Anulada') { showToast('No se puede editar una venta anulada', 'error'); return; }
    
    editingSaleId = saleId;
    editingSaleBackup = JSON.parse(JSON.stringify(sale));
    
    // Restore stock for this sale so products are available again
    (sale.items || []).forEach(item => {
        const product = products.find(p => p.name === item.name && Math.abs(p.price - item.price) < 0.01);
        if (product) product.stock = (product.stock || 0) + item.qty;
    });
    
    // Rebuild cart from sale items
    cart = [];
    (sale.items || []).forEach(item => {
        const product = products.find(p => p.name === item.name && Math.abs(p.price - item.price) < 0.01);
        if (product) {
            cart.push({ productId: product.id, name: item.name, price: item.price, sku: product.sku, qty: item.qty, icon: getCategoryIcon(product.category) });
        }
    });
    
    renderCart();
    renderPosProducts();
    
    // Pre-fill checkout modal
    if (sale.clientId) document.getElementById('checkoutClient').value = sale.clientId;
    else document.getElementById('checkoutClient').value = '';
    onClientChange();
    
    document.querySelectorAll('input[name="payMethod"]').forEach(r => {
        r.checked = r.value === sale.payMethod;
    });
    document.getElementById('checkoutNotes').value = sale.notes || '';
    
    if (sale.creditType === 'credito') {
        toggleCreditOptions();
        document.getElementById('creditDownPayment').value = sale.downPayment || 0;
        document.getElementById('creditInstallments').value = sale.creditInstallments || 1;
        updateCreditInfo();
    }
    
    document.getElementById('confirmSaleBtn').innerHTML = '<i class="bi bi-check-lg"></i> Actualizar Venta';
    showModal('checkoutModal');
}

function cancelCheckoutEdit() {
    if (editingSaleId) {
        cancelEditSale();
    }
    hideModal('checkoutModal');
}

function cancelEditSale() {
    if (editingSaleId && editingSaleBackup) {
        // Re-deduct stock that was restored
        (editingSaleBackup.items || []).forEach(item => {
            const product = products.find(p => p.name === item.name && Math.abs(p.price - item.price) < 0.01);
            if (product) product.stock = Math.max(0, (product.stock || 0) - item.qty);
        });
        renderPosProducts();
        cart = [];
        renderCart();
        editingSaleId = null;
        editingSaleBackup = null;
        document.getElementById('confirmSaleBtn').innerHTML = '<i class="bi bi-check-lg"></i> Confirmar Venta';
    }
}

function completeSale() {
    if (cart.length === 0) return;
    const clientIdVal = document.getElementById('checkoutClient').value;
    const client = clientIdVal ? clients.find(c => c.id === parseInt(clientIdVal)) : null;
    const clientName = client ? client.name : 'Consumidor Final';
    const payMethod = document.querySelector('input[name="payMethod"]:checked').value;
    const notes = document.getElementById('checkoutNotes').value;
    
    const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
    const tax = Math.round(subtotal * (ivaRate / 100));
    let total = subtotal + tax;
    
    const isEditing = editingSaleId !== null;
    const ticketNum = isEditing ? editingSaleId : (sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 1 : 1);
    const ticket = isEditing ? ('TK-' + String(ticketNum).padStart(4, '0')) : 'TK-' + String(ticketNum).padStart(4, '0');
    
        // Credit sale handling
    let creditType = 'contado';
    let creditRemaining = 0;
    let creditDueDate = null;
    let downPayment = 0;
    let saleStatus = 'Completada';
    let creditInstallments = 1;
    let creditInterestRate = 0;
    let creditBaseFinanced = 0;
    let creditInterestAmount = 0;
    let creditInstallmentValue = 0;
    
    if (payMethod === 'Crédito' && client) {
        creditType = 'credito';
        downPayment = parseFloat(document.getElementById('creditDownPayment').value) || 0;
        creditInstallments = parseInt(document.getElementById('creditInstallments').value) || 1;
        const wasManuallySet = manualTotalOverride !== null;
        if (wasManuallySet) {
            total = manualTotalOverride;
            manualTotalOverride = null;
        }
        creditBaseFinanced = total - downPayment;
        if (wasManuallySet) {
            creditInterestRate = 0;
            creditInterestAmount = 0;
            creditRemaining = Math.round(creditBaseFinanced > 0 ? creditBaseFinanced : total);
            creditInstallmentValue = Math.round(creditRemaining / creditInstallments);
        } else {
            creditInterestRate = getCreditInterestRate(creditInstallments);
            creditInterestAmount = Math.round(creditBaseFinanced * creditInterestRate);
            creditRemaining = Math.round(creditBaseFinanced + creditInterestAmount);
            creditInstallmentValue = Math.round(creditRemaining / creditInstallments);
            total = total + creditInterestAmount;
        }
        
        const daysPerInstallment = { 1: 30, 2: 60, 3: 90, 4: 120 };
        const totalDays = daysPerInstallment[creditInstallments] || 30;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + totalDays);
        creditDueDate = dueDate.toISOString().slice(0, 10);
        saleStatus = 'Pendiente';
        
        // Adjust client credit (undo old if editing)
        if (isEditing && editingSaleBackup) {
            client.creditUsed = Math.max(0, (client.creditUsed || 0) - (editingSaleBackup.creditRemaining || 0));
        }
        if (client.creditLimit > 0) {
            const available = client.creditLimit - client.creditUsed;
            if (creditRemaining > available) {
                showToast(`Crédito insuficiente. Disponible: $${available.toLocaleString()}`, 'error');
                return;
            }
        }
        client.creditUsed += creditRemaining;
        saveClients();
    } else if (isEditing && editingSaleBackup && editingSaleBackup.creditType === 'credito') {
        // Was credit, now changed to contado - release credit
        const oldClient = clients.find(c => c.id === editingSaleBackup.clientId);
        if (oldClient) {
            oldClient.creditUsed = Math.max(0, (oldClient.creditUsed || 0) - (editingSaleBackup.creditRemaining || 0));
            saveClients();
        }
    }
    
    // Manual total override for non-credit
    if (manualTotalOverride !== null && payMethod !== 'Crédito') {
        total = manualTotalOverride;
        manualTotalOverride = null;
    }
    
    // If editing a credit sale that had payments, preserve them
    let existingPayments = [];
    if (isEditing) {
        existingPayments = creditPayments.filter(cp => cp.saleId === editingSaleId);
    }

    const sale = {
        id: ticketNum,
        ticket,
        date: isEditing ? (editingSaleBackup ? editingSaleBackup.date : new Date().toISOString().slice(0, 16).replace('T', ' ')) : new Date().toISOString().slice(0, 16).replace('T', ' '),
        client: clientName,
        clientId: client ? client.id : null,
        items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price })),
        subtotal, tax, total,
        payMethod,
        notes,
        status: saleStatus,
        creditType,
        creditRemaining,
        creditDueDate,
        downPayment,
        creditInstallments,
        creditInterestRate,
        creditBaseFinanced,
        creditInterestAmount,
        creditInstallmentValue
    };

    // Update stock (already restored before edit, now deduct new qty)
    cart.forEach(c => {
        const product = products.find(p => p.id === c.productId);
        if (product) product.stock = Math.max(0, product.stock - c.qty);
    });
    
    if (isEditing) {
        const idx = sales.findIndex(s => s.id === editingSaleId);
        if (idx !== -1) sales[idx] = sale;
    } else {
        sales.push(sale);
    }
    saveSales();
    saveProducts();

    // Show receipt
    showSaleReceipt(sale);
    hideModal('checkoutModal');
    showModal('saleCompleteModal');

    cart = [];
    editingSaleId = null;
    editingSaleBackup = null;
    manualTotalOverride = null;
    document.getElementById('confirmSaleBtn').innerHTML = '<i class="bi bi-check-lg"></i> Confirmar Venta';
    // Clear checkout form fields
    document.getElementById('checkoutClient').value = '';
    document.getElementById('checkoutNotes').value = '';
    document.getElementById('manualTotalInput').value = '';
    document.getElementById('editTotalRow').style.display = 'none';
    document.getElementById('creditDownPayment').value = '';
    document.getElementById('creditInstallments').value = '1';
    document.querySelector('input[name="payMethod"][value="Efectivo"]').checked = true;
    document.getElementById('clientCreditInfo').style.display = 'none';
    document.getElementById('creditOptions').style.display = 'none';
    document.getElementById('creditRemaining').textContent = '$0';
    document.getElementById('creditInterestAmount').textContent = '$0';
    document.getElementById('creditInstallmentValue').textContent = '$0';
    renderCart();
    renderPosProducts();
    renderInventory();
    renderDashboard();
}

function createQuote() {
    if (cart.length === 0) return;
    const clientIdVal = document.getElementById('checkoutClient').value;
    const client = clientIdVal ? clients.find(c => c.id === parseInt(clientIdVal)) : null;
    const clientName = client ? client.name : 'Consumidor Final';
    const notes = document.getElementById('checkoutNotes').value;
    
    const subtotal = Math.round(cart.reduce((sum, c) => sum + c.price * c.qty, 0));
    const tax = Math.round(subtotal * (ivaRate / 100));
    let total = subtotal + tax;
    if (manualTotalOverride !== null) { total = manualTotalOverride; manualTotalOverride = null; }
    
    const quoteNum = quotes.length > 0 ? Math.max(...quotes.map(q => q.id)) + 1 : 1;
    const quote = {
        id: quoteNum,
        folio: 'COT-' + String(quoteNum).padStart(4, '0'),
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        client: clientName,
        clientId: client ? client.id : null,
        items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price })),
        subtotal, tax, total, notes,
        status: 'Vigente'
    };
    
    quotes.push(quote);
    saveQuotes();
    updateQuotesCount();
    
    // Show quote receipt
    showQuoteReceipt(quote);
    hideModal('checkoutModal');
    showModal('saleCompleteModal');
    
    cart = [];
    renderCart();
    renderPosProducts();
}

function showQuoteReceipt(quote) {
    const receiptEl = document.getElementById('saleReceipt');
    lastShownSaleId = quote.id;
    const itemsHtml = (quote.items || []).map(i =>
        `<tr><td style="padding:2px 0;">${i.name}</td><td style="text-align:right;">${i.qty}x</td><td style="text-align:right;">$${(i.price * i.qty).toLocaleString('es-MX', {minimumFractionDigits:0,maximumFractionDigits:0})}</td></tr>`
    ).join('');
    receiptEl.innerHTML = `
        <div class="receipt" style="font-size:11px;">
            <div style="text-align:center;font-size:13px;font-weight:800;color:var(--info);margin-bottom:4px;">COTIZACION</div>
            <div style="text-align:center;font-weight:700;">${businessName}</div>
            <div style="text-align:center;font-size:10px;color:var(--gray);">${businessAddress}<br>Tel: ${businessPhone}${businessRfc ? ' · RFC: '+businessRfc : ''}</div>
            <div style="text-align:center;font-weight:600;margin:6px 0;">${quote.folio}</div>
            <div style="text-align:center;font-size:10px;color:var(--gray);">${quote.date} · ${quote.client}</div>
            <hr style="border-color:var(--dark3);margin:6px 0;">
            <table style="width:100%;font-size:10px;">${itemsHtml}</table>
            <hr style="border-color:var(--dark3);margin:6px 0;">
            <div style="display:flex;justify-content:space-between;font-size:10px;"><span>Subtotal:</span><span>$${quote.subtotal.toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0})}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:10px;"><span>IVA (${ivaRate}%):</span><span>$${quote.tax.toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0})}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-top:4px;"><span>TOTAL:</span><span>$${quote.total.toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0})}</span></div>
            ${quote.notes ? `<hr style="border-color:var(--dark3);margin:6px 0;"><div style="font-size:10px;color:var(--gray);">${quote.notes}</div>` : ''}
            <hr style="border-color:var(--dark3);margin:6px 0;">
            <div style="text-align:center;font-size:9px;color:var(--gray);margin-top:6px;">* Cotización sujeta a cambios de precio</div>
            <div style="text-align:center;font-size:9px;color:var(--gray);">Válida por 7 días</div>
        </div>
    `;
    document.getElementById('saleCompleteTotal').textContent = '$' + quote.total.toLocaleString('es-MX', {minimumFractionDigits:0,maximumFractionDigits:0});
    document.getElementById('saleCompleteTicket').textContent = quote.folio + ' · ' + quote.date;
    // Override sale complete buttons for quote context
    const footer = document.querySelector('#saleCompleteModal .modal-footer');
    footer.innerHTML = `
        <button class="btn btn-secondary" onclick="printQuote(${quote.id})"><i class="bi bi-printer"></i> Imprimir</button>
        ${can('edit','quotes') ? `<button class="btn btn-success" onclick="convertQuoteToSale(${quote.id})"><i class="bi bi-cart4"></i> Convertir en Venta</button>` : ''}
        <button class="btn btn-secondary" onclick="hideModal('saleCompleteModal')"><i class="bi bi-x-lg"></i> Cerrar</button>
    `;
}

function convertQuoteToSale(quoteId) {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    hideModal('saleCompleteModal');
    
    // Rebuild cart from quote items
    cart = [];
    (quote.items || []).forEach(item => {
        const product = products.find(p => p.name === item.name && Math.abs(p.price - item.price) < 0.01);
        if (product && (product.stock > 0 || product.sellWithoutStock)) {
            cart.push({ productId: product.id, name: item.name, price: item.price, sku: product.sku, qty: Math.min(item.qty, product.sellWithoutStock ? item.qty : product.stock), icon: getCategoryIcon(product.category) });
        }
    });
    renderCart();
    
    // Pre-fill checkout
    if (quote.clientId) document.getElementById('checkoutClient').value = quote.clientId;
    document.getElementById('checkoutNotes').value = quote.notes || '';
    showModal('checkoutModal');
    
    // Remove from quotes
    quotes = quotes.filter(q => q.id !== quoteId);
    saveQuotes();
    updateQuotesCount();
    renderQuotes();
    showToast('Cotización cargada en el carrito', 'info');
}

function renderQuotes() {
    const search = (document.getElementById('quotesSearch')?.value || '').toLowerCase();
    let filtered = quotes.filter(q =>
        q.folio.toLowerCase().includes(search) || q.client.toLowerCase().includes(search)
    );
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (!currentPage.quotes) currentPage.quotes = 1;
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const start = (currentPage.quotes - 1) * ITEMS_PER_PAGE;
    const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);
    
    const tbody = document.getElementById('quotesTableBody');
    tbody.innerHTML = pageItems.map(q => {
        const itemsSummary = q.items.map(i => `${i.qty}x ${i.name}`).join(', ');
        return `
            <tr>
                <td style="font-weight:600;color:var(--info);">${q.folio}</td>
                <td>${q.date}</td>
                <td>${q.client}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${itemsSummary}">${itemsSummary}</td>
                <td style="font-weight:700;">$${q.total.toLocaleString('es-MX', {minimumFractionDigits:0,maximumFractionDigits:0})}</td>
                <td><span class="status-badge ${q.status === 'Vigente' ? 'pending' : 'inactive'}">${q.status}</span></td>
                <td>
                    <div class="actions-cell">
                        <button class="action-btn view" onclick="viewQuote(${q.id})" title="Ver"><i class="bi bi-eye"></i></button>
                        ${can('edit','quotes') ? `<button class="action-btn edit" onclick="convertQuoteToSale(${q.id})" title="Convertir en Venta"><i class="bi bi-cart4"></i></button>` : ''}
                        <button class="action-btn print" onclick="printQuote(${q.id})" title="Imprimir"><i class="bi bi-printer"></i></button>
                        ${can('delete','quotes') ? `<button class="action-btn delete" onclick="deleteQuote(${q.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="7"><div class="empty-state"><i class="bi bi-file-text"></i><h3>No hay cotizaciones</h3><p>Crea cotizaciones desde el Punto de Venta</p></div></td></tr>';
    
    const pagEl = document.getElementById('quotesPagination');
    if (totalPages > 1) {
        let pagHTML = `<div class="pagination-info">Mostrando ${start+1}-${Math.min(start+ITEMS_PER_PAGE, filtered.length)} de ${filtered.length}</div><div class="pagination-btns">`;
        pagHTML += `<button class="page-btn" onclick="changeQuotesPage(${currentPage.quotes - 1})" ${currentPage.quotes === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i++) {
            pagHTML += `<button class="page-btn ${i === currentPage.quotes ? 'active' : ''}" onclick="changeQuotesPage(${i})">${i}</button>`;
        }
        pagHTML += `<button class="page-btn" onclick="changeQuotesPage(${currentPage.quotes + 1})" ${currentPage.quotes === totalPages ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button></div>`;
        pagEl.innerHTML = pagHTML;
    } else {
        pagEl.innerHTML = filtered.length > 0 ? `<div class="pagination-info">Mostrando ${filtered.length} cotizaciones</div>` : '';
    }
}

function changeQuotesPage(page) {
    if (!currentPage.quotes) currentPage.quotes = 1;
    const totalPages = Math.ceil(quotes.length / ITEMS_PER_PAGE);
    if (!totalPages) return;
    if (page < 1 || page > totalPages) return;
    currentPage.quotes = page;
    renderQuotes();
}

function viewQuote(id) {
    const q = quotes.find(qu => qu.id === id);
    if (!q) return;
    showQuoteReceipt(q);
    showModal('saleCompleteModal');
}

function printQuote(id) {
    const q = quotes.find(qu => qu.id === id);
    if (!q) return;
    showQuoteReceipt(q);
    setTimeout(() => window.print(), 200);
}

function deleteQuote(id) {
    pendingDeleteId = id;
    pendingDeleteType = 'quote';
    document.getElementById('confirmMessage').textContent = '¿Eliminar esta cotización? Esta acción no se puede deshacer.';
    document.getElementById('confirmBtn').textContent = 'Eliminar Cotización';
    showModal('confirmModal');
}

function updateQuotesCount() {
    const badge = document.getElementById('quotesCount');
    if (badge) {
        badge.textContent = quotes.length;
        badge.style.display = quotes.length > 0 ? 'inline' : 'none';
    }
}

function exportQuotes() {
    if (quotes.length === 0) { showToast('No hay cotizaciones para exportar', 'info'); return; }
    let csv = 'Folio,Fecha,Cliente,Total,Estado\n';
    quotes.forEach(q => {
        csv += `${q.folio},${q.date},"${q.client}",${q.total},${q.status}\n`;
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'cotizaciones_cerezos.csv';
    a.click(); URL.revokeObjectURL(url);
    showToast('Cotizaciones exportadas', 'success');
}

function showSaleReceipt(sale) {
    const receiptEl = document.getElementById('saleReceipt');
    lastShownSaleId = sale.id;
    const isCredit = sale.creditType === 'credito';
    
    receiptEl.innerHTML = buildReceiptBody(sale);

    document.getElementById('saleCompleteTotal').textContent = '$' + sale.total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('saleCompleteTicket').textContent = sale.ticket + ' · ' + sale.date;
    // Restore default sale footer buttons
    const footer = document.querySelector('#saleCompleteModal .modal-footer');
    footer.innerHTML = `
        <button class="btn btn-secondary" onclick="printCurrentSale()"><i class="bi bi-printer"></i> Imprimir</button>
        <button class="btn btn-primary btn-sm" onclick="downloadCurrentSalePdf()"><i class="bi bi-download"></i> Descargar PDF</button>
        <button class="btn btn-secondary" onclick="hideModal('saleCompleteModal')"><i class="bi bi-x-lg"></i> Cerrar</button>
    `;
}

function newSale() {
    hideModal('saleCompleteModal');
    document.getElementById('checkoutClient').value = '';
    document.getElementById('checkoutNotes').value = '';
    document.getElementById('manualTotalInput').value = '';
    document.getElementById('editTotalRow').style.display = 'none';
    document.getElementById('creditDownPayment').value = '';
    document.getElementById('creditInstallments').value = '1';
    document.querySelector('input[name="payMethod"][value="Efectivo"]').checked = true;
    document.getElementById('clientCreditInfo').style.display = 'none';
    document.getElementById('creditOptions').style.display = 'none';
    document.getElementById('creditRemaining').textContent = '$0';
    document.getElementById('creditInterestAmount').textContent = '$0';
    document.getElementById('creditInstallmentValue').textContent = '$0';
    renderPosProducts();
}

// ============ PRINT / SHARE HELPERS ============
function buildReceiptBody(sale) {
    const isCredit = sale.creditType === 'credito';
    const itemsHtml = (sale.items || []).map(i => `<tr><td style="font-size:11px;">${i.name}</td><td style="text-align:center;font-size:11px;">${i.qty}</td><td style="text-align:right;font-size:11px;">$${(i.price * i.qty).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td></tr>`).join('');
    const ivaPercent = sale.subtotal ? Math.round((sale.tax / sale.subtotal) * 100) : ivaRate;
    const subtotalConIva = sale.subtotal + sale.tax;
    const hasInterest = isCredit && sale.creditInterestAmount > 0;
    const baseFinanced = sale.creditBaseFinanced || (sale.subtotal + sale.tax - (sale.downPayment || 0));
    const interestRate = sale.creditInterestRate || 0;
    const manualTotal = sale.total !== (subtotalConIva + (hasInterest ? sale.creditInterestAmount : 0));
    let breakdownHtml = `
        <div style="border-top:1px dashed #ccc;padding-top:6px;margin-top:4px;">
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;"><span style="color:var(--gray);">Subtotal (productos):</span><span>$${sale.subtotal.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;"><span style="color:var(--gray);">+ IVA (${ivaPercent}%):</span><span>$${sale.tax.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px;padding-bottom:4px;border-bottom:1px dotted #ccc;"><span style="color:var(--gray);font-weight:600;">= Subtotal con IVA:</span><span style="font-weight:600;">$${subtotalConIva.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>`;

    if (isCredit && sale.downPayment > 0) {
        breakdownHtml += `
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;"><span style="color:var(--gray);">− Abono inicial:</span><span style="color:var(--danger);">−$${sale.downPayment.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px;padding-bottom:4px;border-bottom:1px dotted #ccc;"><span style="color:var(--gray);font-weight:600;">= Base a financiar:</span><span style="font-weight:600;">$${baseFinanced.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>`;
    }

    if (hasInterest) {
        breakdownHtml += `
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;"><span style="color:var(--gray);">+ Interés (${(interestRate * 100).toFixed(0)}% s/base):</span><span style="color:var(--warning);">+$${sale.creditInterestAmount.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>`;
    } else if (isCredit && sale.creditInstallments > 1 && !manualTotal) {
        breakdownHtml += `
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;"><span style="color:var(--gray);">+ Interés:</span><span style="color:var(--success);">$0 (Sin interés)</span></div>`;
    }

    if (manualTotal) {
        breakdownHtml += `
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;"><span style="color:var(--info);font-style:italic;">* Precio manual ajustado</span></div>`;
    }

    breakdownHtml += `
            <div class="receipt-total" style="display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:2px solid #333;font-size:13px;font-weight:700;"><span>TOTAL${isCredit ? ' A PAGAR' : ''}:</span><span>$${sale.total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>`;

    if (isCredit) {
        breakdownHtml += `
            <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:var(--danger);"><span>Restante por pagar:</span><span>$${sale.creditRemaining.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>`;
        if (sale.creditInstallments > 1) {
            breakdownHtml += `
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#856404;"><span>${sale.creditInstallments} cuotas de:</span><span>$${sale.creditInstallmentValue.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>`;
        }
        if (sale.creditDueDate) {
            breakdownHtml += `
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--gray);"><span>Vencimiento:</span><span>${sale.creditDueDate}</span></div>`;
        }
    }

    breakdownHtml += `</div>`;

    return `
        <div class="logo-print" style="text-align:center;margin-bottom:8px;">
            <img src="assets/logo.png" alt="Cerezos Sneaker" style="width:55px;height:55px;object-fit:contain;border-radius:50%;border:2px solid #b8860b;padding:3px;">
        </div>
        <h2 style="text-align:center;margin:0 0 2px 0;font-size:14px;letter-spacing:1px;">${businessName.toUpperCase()}</h2>
        <div class="receipt-sub" style="text-align:center;color:#666;font-size:10px;margin-bottom:6px;">${businessAddress}<br>Tel: ${businessPhone}${businessRfc ? '<br>RFC: ' + businessRfc : ''}</div>
        <div style="text-align:center;margin-bottom:6px;font-size:11px;"><strong>${sale.ticket}</strong> · ${sale.date}</div>
        <div style="text-align:center;margin-bottom:6px;font-size:10px;">Cliente: ${sale.client}</div>
        ${isCredit ? '<div style="text-align:center;margin-bottom:6px;font-size:10px;background:#fff3cd;color:#856404;padding:3px;border-radius:3px;"> VENTA A CRÉDITO</div>' : ''}
        ${isCredit && sale.creditInstallments > 1 ? `<div style="text-align:center;margin-bottom:4px;font-size:10px;color:#856404;">${sale.creditInstallments} cuotas de $${sale.creditInstallmentValue.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>` : ''}
        <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="border-bottom:1px solid #333;"><th style="padding:4px 0;text-align:left;font-size:10px;">Artículo</th><th style="padding:4px 0;text-align:center;font-size:10px;">Cant</th><th style="padding:4px 0;text-align:right;font-size:10px;">Precio</th></tr></thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        ${breakdownHtml}
        <div style="margin-top:6px;font-size:9px;color:#999;text-align:center;">Método: ${sale.payMethod}</div>
        <div style="margin-top:10px;text-align:center;font-size:11px;font-weight:600;">¡Gracias por tu compra!<br><span style="font-size:9px;font-weight:400;color:#999;" class="receipt-business-name">${businessName}</span></div>
    `;
}

function printHtml(html) {
    const w = window.open('', '_blank', 'noopener');
    if (!w) { showToast('Pop-up bloqueado. Permite popups para imprimir.', 'error'); return; }
    const style = `body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:16px;max-width:300px;margin:0 auto}table{width:100%;border-collapse:collapse}td,th{padding:4px 0;font-size:11px}h2{text-align:center;margin:0 0 2px 0;font-size:14px;letter-spacing:1px}.logo-print{text-align:center;margin-bottom:8px}.logo-print img{width:55px;height:55px;border-radius:50%;object-fit:contain;border:2px solid #b8860b;padding:3px}.receipt-sub{text-align:center;color:#666;margin-bottom:6px;font-size:10px}.receipt-total{font-weight:700;margin-top:6px;font-size:13px}td,th{color:#111}h2{color:#111}.receipt-total{color:#111}`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ticket</title></head><body><div class="receipt">${html}</div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch (e) {} }, 300);
}

function printSale(saleId) {
    const sale = sales.find(s => s.id === saleId) || quotes.find(q => q.id === saleId);
    if (!sale) { showToast('Venta/Cotización no encontrada', 'error'); return; }
    const body = buildReceiptBody(sale);
    const section = document.getElementById('printReceiptSection');
    section.innerHTML = `<div class="receipt" style="background:#fff;color:#0f172a;padding:16px;font-size:11px;max-width:300px;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;">${body}</div>`;
    section.style.display = 'block';
    setTimeout(() => {
        window.print();
        section.style.display = 'none';
        section.innerHTML = '';
    }, 200);
}

function printCurrentSale() {
    if (!lastShownSaleId) { showToast('No hay ticket seleccionado', 'error'); return; }
    printSale(lastShownSaleId);
}

function getSalePlainText(sale) {
    const isCredit = sale.creditType === 'credito';
    const ivaPct = sale.subtotal ? Math.round((sale.tax / sale.subtotal) * 100) : ivaRate;
    let text = `${businessName.toUpperCase()}\n${businessAddress}\nTel: ${businessPhone}${businessRfc ? ' · RFC: ' + businessRfc : ''}\n${sale.ticket} · ${sale.date}\nCliente: ${sale.client}\n`;
    if (isCredit) text += `*** VENTA A CREDITO ***\n`;
    if (isCredit && sale.creditInstallments > 1) text += `${sale.creditInstallments} cuotas de $${sale.creditInstallmentValue.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}\n`;
    text += `\nArticulos:\n`;
    (sale.items || []).forEach(i => { text += `${i.qty}x ${i.name} - $${(i.price * i.qty).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}\n`; });
    const subtotalConIva = sale.subtotal + sale.tax;
    text += `\nSubtotal (productos): $${sale.subtotal.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    text += `\n+ IVA (${ivaPct}%): $${sale.tax.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    text += `\n= Subtotal con IVA: $${subtotalConIva.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    if (isCredit && sale.downPayment > 0) {
        const baseFinanced = sale.creditBaseFinanced || (subtotalConIva - sale.downPayment);
        text += `\n- Abono inicial: $${sale.downPayment.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
        text += `\n= Base a financiar: $${baseFinanced.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    }
    if (isCredit && sale.creditInterestAmount > 0) {
        text += `\n+ Interes (${(sale.creditInterestRate * 100).toFixed(0)}%): $${sale.creditInterestAmount.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    }
    text += `\n\nTOTAL${isCredit ? ' A PAGAR' : ''}: $${sale.total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    if (isCredit && sale.creditRemaining > 0) text += `\nRestante: $${sale.creditRemaining.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    if (isCredit && sale.creditDueDate) text += `\nVence: ${sale.creditDueDate}`;
    text += `\nMetodo: ${sale.payMethod}`;
    return text;
}

async function shareSale(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) { showToast('Venta no encontrada', 'error'); return; }
    const text = getSalePlainText(sale);
    const title = `Ticket ${sale.ticket}`;
    if (navigator.share) {
        try { await navigator.share({ title, text }); showToast('Compartido', 'success'); }
        catch (e) { showToast('Compartir cancelado', 'info'); }
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        try { await navigator.clipboard.writeText(text); showToast('Texto del ticket copiado al portapapeles', 'success'); }
        catch (e) { showToast('No se pudo copiar al portapapeles', 'error'); }
    } else {
        printHtml(buildReceiptBody(sale));
        showToast('No hay API de compartir; se abrió la vista de impresión', 'info');
    }
}

function shareCurrentSale() { if (!lastShownSaleId) { showToast('No hay ticket seleccionado','error'); return; } shareSale(lastShownSaleId); }

async function downloadSalePdf(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) { showToast('Venta no encontrada', 'error'); return; }
    showToast('Generando PDF...', 'info');
    try {
        const { jsPDF } = window.jspdf;
        const PW = 80, M = 4;
        const items = sale.items || [];
        const ivaPct = sale.subtotal ? Math.round((sale.tax / sale.subtotal) * 100) : ivaRate;
        const isCredit = sale.creditType === 'credito';
        const hasInterest = isCredit && sale.creditInterestAmount > 0;
        const subtotalConIva = sale.subtotal + sale.tax;
        const baseFinanced = sale.creditBaseFinanced || (sale.subtotal + sale.tax - (sale.downPayment || 0));

        const estLines = 17 + items.length * 2 + (isCredit ? 4 : 0) + (sale.downPayment > 0 ? 2 : 0) + (hasInterest ? 2 : 0);
        const height = Math.max(estLines * 4 + 20, 100);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PW, height] });

        let y = 8;

        function center(text, size = 10, style = 'bold') { pdf.setFontSize(size); pdf.setFont('helvetica', style); pdf.text(text, PW / 2, y, { align: 'center' }); y += size * 0.45; }
        function lineOut() { pdf.setDrawColor(200); pdf.line(M, y, PW - M, y); y += 3; }
        function dotLine() { pdf.setDrawColor(180); pdf.setLineDashPattern([1, 2], 0); pdf.line(M, y, PW - M, y); pdf.setLineDashPattern([], 0); y += 3; }
        function row(label, value, size = 7, style = 'normal') { pdf.setFontSize(size); pdf.setFont('helvetica', style); pdf.text(label, M, y); pdf.text(value, PW - M, y, { align: 'right' }); y += 3.5; }

        center(businessName.toUpperCase(), 10, 'bold');
        pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
        pdf.text(businessAddress, PW / 2, y, { align: 'center' }); y += 3.5;
        pdf.text('Tel: ' + businessPhone, PW / 2, y, { align: 'center' }); y += 3.5;
        if (businessRfc) { pdf.text('RFC: ' + businessRfc, PW / 2, y, { align: 'center' }); y += 5; } else { y += 5; }

        center(sale.ticket, 7, 'bold');
        pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
        pdf.text(sale.date, PW / 2, y, { align: 'center' }); y += 3.5;
        pdf.text('Cliente: ' + sale.client, PW / 2, y, { align: 'center' }); y += 5;

        if (isCredit) { center('*** VENTA A CREDITO ***', 7, 'bold'); y += 1; }
        if (isCredit && sale.creditInstallments > 1) {
            pdf.setFontSize(6); pdf.setFont('helvetica', 'normal');
            pdf.text(sale.creditInstallments + ' cuotas de $' + sale.creditInstallmentValue.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), PW / 2, y, { align: 'center' }); y += 4;
        }

        lineOut();
        pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
        pdf.text('Articulo', M, y); pdf.text('Cant', PW - 24, y, { align: 'right' }); pdf.text('Precio', PW - M, y, { align: 'right' });
        y += 3;
        lineOut();
        y -= 3;

        pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
        items.forEach(i => {
            pdf.text(i.name, M, y);
            pdf.text(i.qty + 'x', PW - 24, y, { align: 'right' });
            pdf.text('$' + (i.price * i.qty).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), PW - M, y, { align: 'right' });
            y += 4;
        });
        y += 1;
        lineOut();

        // Breakdown
        row('Subtotal (productos):', '$' + sale.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), 7, 'normal');
        row('+ IVA (' + ivaPct + '%):', '$' + sale.tax.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), 7, 'normal');
        dotLine();
        row('= Subtotal con IVA:', '$' + subtotalConIva.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), 7, 'bold');

        if (isCredit && sale.downPayment > 0) {
            row('- Abono inicial:', '-$' + sale.downPayment.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), 7, 'normal');
            dotLine();
            row('= Base a financiar:', '$' + baseFinanced.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), 7, 'bold');
        }

        if (hasInterest) {
            row('+ Interes (' + (sale.creditInterestRate * 100).toFixed(0) + '%):', '+$' + sale.creditInterestAmount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), 7, 'normal');
        }

        pdf.setDrawColor(0); pdf.setLineWidth(0.5);
        pdf.line(M, y, PW - M, y); y += 3;
        pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
        pdf.text('TOTAL' + (isCredit ? ' A PAGAR' : '') + ':', M, y);
        pdf.text('$' + sale.total.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), PW - M, y, { align: 'right' }); y += 5;

        if (isCredit) {
            pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
            if (sale.creditRemaining > 0) {
                row('Restante:', '$' + sale.creditRemaining.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
            }
            if (sale.creditInstallments > 1) {
                row(sale.creditInstallments + ' cuotas de:', '$' + sale.creditInstallmentValue.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
            }
            if (sale.creditDueDate) {
                row('Vence:', sale.creditDueDate);
            }
        }

        y += 2;
        pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
        pdf.text('Metodo: ' + sale.payMethod, PW / 2, y, { align: 'center' }); y += 3.5;
        y += 3;
        center('Gracias por tu compra!', 8, 'bold');
        pdf.setFontSize(6); pdf.setFont('helvetica', 'normal');
        pdf.text(businessName, PW / 2, y, { align: 'center' });

        pdf.save(sale.ticket + '.pdf');
        showToast('PDF descargado', 'success');
    } catch (e) {
        console.error(e);
        showToast('Error generando PDF: ' + e.message, 'error');
    }
}

function downloadCurrentSalePdf() { if (!lastShownSaleId) { showToast('No hay ticket seleccionado','error'); return; } downloadSalePdf(lastShownSaleId); }

// ============ SALES HISTORY ============
function renderSalesHistory() {
    const search = (document.getElementById('searchSales')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('salesTypeFilter')?.value || '';
    const dateFrom = document.getElementById('salesDateFrom')?.value || '';
    const dateTo = document.getElementById('salesDateTo')?.value || '';
    
    let filtered = sales.filter(s => {
        const matchSearch = s.ticket.toLowerCase().includes(search) || s.client.toLowerCase().includes(search);
        let matchType = true;
        if (typeFilter === 'contado') matchType = s.creditType !== 'credito';
        else if (typeFilter === 'credito') matchType = s.creditType === 'credito';
        else if (typeFilter === 'pendiente') matchType = s.creditType === 'credito' && s.creditRemaining > 0;
        let matchDate = true;
        if (dateFrom) matchDate = matchDate && s.date >= dateFrom;
        if (dateTo) matchDate = matchDate && s.date <= dateTo + ' 23:59';
        return matchSearch && matchType && matchDate;
    });

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const start = (currentPage.sales - 1) * ITEMS_PER_PAGE;
    const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

    const tbody = document.getElementById('salesHistoryBody');
    tbody.innerHTML = pageItems.map(s => {
        const itemsSummary = s.items.map(i => `${i.qty}x ${i.name}`).join(', ');
        const isCredit = s.creditType === 'credito';
        const isAnnulled = s.status === 'Anulada';
        const creditStatusClass = isAnnulled ? 'inactive' : (!isCredit ? 'active' : (s.creditRemaining > 0 ? 'pending' : 'paid'));
        const creditStatusLabel = isAnnulled ? 'Anulada' : (!isCredit ? 'Contado' : (s.creditRemaining > 0 ? 'Pendiente' : 'Pagado'));
        return `
            <tr>
                <td style="font-weight:600;color:var(--primary);">${s.ticket}</td>
                <td>${s.date}</td>
                <td>${s.client}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${itemsSummary}">${itemsSummary}</td>
                <td>${s.payMethod}</td>
                <td>$${s.subtotal.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                <td style="color:var(--gray);">$${s.tax.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                <td style="font-weight:700;">$${s.total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                <td><span class="status-badge ${creditStatusClass}"><i class="bi bi-circle-fill" style="font-size:6px;"></i> ${creditStatusLabel}${isCredit && s.creditRemaining > 0 ? ' $' + s.creditRemaining.toLocaleString('es-MX', {minimumFractionDigits: 0}) : ''}</span></td>
                <td>
                    <div class="actions-cell">
                        ${isCredit && s.creditRemaining > 0 && can('create','credit_payments') ? `<button class="action-btn pay" onclick="showAbonoModal(${s.id})" title="Registrar Abono"><i class="bi bi-cash-stack"></i></button>` : ''}
                        <button class="action-btn view" onclick="viewSaleDetail(${s.id})" title="Ver"><i class="bi bi-receipt"></i></button>
                        ${can('edit','sales') ? `<button class="action-btn edit" onclick="editSale(${s.id})" title="Editar"><i class="bi bi-pencil"></i></button>` : ''}
                        <button class="action-btn print" onclick="printSale(${s.id})" title="Imprimir"><i class="bi bi-printer"></i></button>
                        <button class="action-btn download" onclick="downloadSalePdf(${s.id})" title="Descargar PDF"><i class="bi bi-download"></i></button>
                        ${can('delete','sales') ? `<button class="action-btn delete" onclick="deleteSale(${s.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="10"><div class="empty-state"><i class="bi bi-receipt"></i><h3>No hay ventas</h3><p>Las ventas aparecerán aquí</p></div></td></tr>';

    const pagEl = document.getElementById('salesPagination');
    if (totalPages > 1) {
        let pagHTML = `<div class="pagination-info">Mostrando ${start+1}-${Math.min(start+ITEMS_PER_PAGE, filtered.length)} de ${filtered.length}</div><div class="pagination-btns">`;
        pagHTML += `<button class="page-btn" onclick="changeSalesPage(${currentPage.sales - 1})" ${currentPage.sales === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i++) {
            pagHTML += `<button class="page-btn ${i === currentPage.sales ? 'active' : ''}" onclick="changeSalesPage(${i})">${i}</button>`;
        }
        pagHTML += `<button class="page-btn" onclick="changeSalesPage(${currentPage.sales + 1})" ${currentPage.sales === totalPages ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button></div>`;
        pagEl.innerHTML = pagHTML;
    } else {
        pagEl.innerHTML = filtered.length > 0 ? `<div class="pagination-info">Mostrando ${filtered.length} ventas</div>` : '';
    }
}

function changeSalesPage(page) {
    const totalPages = Math.ceil(sales.length / ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    currentPage.sales = page;
    renderSalesHistory();
}

function viewSaleDetail(id) {
    const s = sales.find(sl => sl.id === id);
    if (!s) return;
    showSaleReceipt(s);
    showModal('saleCompleteModal');
}

let pendingSaleActionId = null;

function deleteSale(id) {
    pendingSaleActionId = id;
    const sale = sales.find(s => s.id === id);
    if (!sale) return;
    document.getElementById('saleActionTicket').textContent = sale.ticket + ' · ' + sale.date;
    const clientName = sale.client || 'Consumidor Final';
    const totalStr = '$' + sale.total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('saleActionInfo').textContent = 'Cliente: ' + clientName + ' · Total: ' + totalStr;
    showModal('saleActionModal');
}

function annulSale() {
    const id = pendingSaleActionId;
    const sale = sales.find(s => s.id === id);
    if (!sale) { hideModal('saleActionModal'); return; }
    // Return items to stock
    (sale.items || []).forEach(item => {
        // Find product by name (and approximate price match)
        const product = products.find(p => p.name === item.name && Math.abs(p.price - item.price) < 0.01);
        if (product) {
            product.stock = (product.stock || 0) + item.qty;
        }
    });
    // Mark sale as annulled
    sale.status = 'Anulada';
    sale.creditRemaining = 0;
    // If credit sale, release credit
    if (sale.creditType === 'credito' && sale.clientId) {
        const client = clients.find(c => c.id === sale.clientId);
        if (client) {
            client.creditUsed = Math.max(0, (client.creditUsed || 0) - (sale.creditRemaining || 0));
        }
    }
    saveSales();
    saveProducts();
    saveClients();
    reRenderCurrentPage();
    hideModal('saleActionModal');
    pendingSaleActionId = null;
    showToast('Venta anulada · Stock restituido', 'warning');
}

function deleteSaleConfirmed() {
    const id = pendingSaleActionId;
    sales = sales.filter(s => s.id !== id);
    creditPayments = creditPayments.filter(cp => cp.saleId !== id);
    recalcClientCredits();
    saveSales();
    saveCreditPayments();
    apiDelete('sales', id);
    apiDelete('credit_payments', null, { column: 'sale_id', values: [id] }).catch(() => {});
    reRenderCurrentPage();
    hideModal('saleActionModal');
    pendingSaleActionId = null;
    showToast('Venta eliminada', 'success');
}

function filterSalesHistory() { renderSalesHistory(); }

// ============ CREDIT MANAGEMENT ============
function renderCredits() {
    const search = (document.getElementById('creditSearch')?.value || '').toLowerCase();
    const filteredClients = clients.filter(c => (c.creditUsed > 0 || c.creditEnabled !== false) && (c.name.toLowerCase().includes(search) || (c.phone || '').includes(search)));
    
    const totalCreditsPending = sales.filter(s => s.creditType === 'credito' && s.creditRemaining > 0).reduce((sum, s) => sum + s.creditRemaining, 0);
    const totalClientsWithCredit = clients.filter(c => c.creditUsed > 0).length;
    const hasUnlimited = clients.some(c => c.creditLimit === 0);
    const totalCreditLimit = clients.reduce((sum, c) => sum + c.creditLimit, 0);
    
    document.getElementById('creditSummary').innerHTML = `
        <div class="credit-summary-item">
            <div class="value" style="color:var(--warning);">$${totalCreditsPending.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
            <div class="label">Créditos Pendientes</div>
        </div>
        <div class="credit-summary-item">
            <div class="value" style="color:var(--info);">${totalClientsWithCredit}</div>
            <div class="label">Clientes con Crédito</div>
        </div>
        <div class="credit-summary-item">
            <div class="value" style="color:var(--success);">${hasUnlimited ? '♾️ Incluye sin límite' : '$' + totalCreditLimit.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
            <div class="label">Límite Total Asignado</div>
        </div>
    `;
    
    const tbody = document.getElementById('creditsTableBody');
    tbody.innerHTML = filteredClients.map(c => {
        const creditEnabled = c.creditEnabled !== false;
        const pendingSales = sales.filter(s => s.clientId === c.id && s.creditType === 'credito' && s.creditRemaining > 0);
        const isUnlimited = c.creditLimit === 0;
        const pct = isUnlimited ? 0 : (c.creditUsed / c.creditLimit * 100);
        const barClass = isUnlimited ? 'safe' : (pct < 50 ? 'safe' : pct < 80 ? 'warning' : 'danger');
        const available = isUnlimited ? Infinity : c.creditLimit - c.creditUsed;
        const statusClass = isUnlimited ? 'active' : (pct >= 100 ? 'overdue' : pct >= 80 ? 'pending' : 'active');
        const statusLabel = isUnlimited ? 'Sin límite' : (pct >= 100 ? 'Límite Alcanzado' : pct >= 80 ? 'Alto Uso' : 'Normal');
        
        return `
            <tr style="${!creditEnabled ? 'opacity:0.6;' : ''}">
                <td>
                    <div class="product-cell">
                        <div class="user-avatar" style="width:36px;height:36px;font-size:12px;">${c.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                        <div class="product-info">
                            <h4>${c.name} ${!creditEnabled ? '<span style="font-size:10px;color:var(--danger);font-weight:400;">(Crédito desactivado)</span>' : ''}</h4>
                            <small>${c.email || ''}</small>
                        </div>
                    </div>
                </td>
                <td>${c.phone || '-'}</td>
                <td style="font-weight:600;">${isUnlimited ? '<span style="color:var(--success);">♾️ Ilimitado</span>' : '$' + c.creditLimit.toLocaleString()}</td>
                <td style="font-weight:700;color:var(--warning);">$${c.creditUsed.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                <td style="font-weight:700;color:var(--success);">${isUnlimited ? '♾️ Sin límite' : '$' + available.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                <td>${pendingSales.length} ventas</td>
                <td style="min-width:120px;">
                    ${isUnlimited ? '<div style="font-size:11px;color:var(--success);">Sin límite</div>' : `<div style="font-size:12px;margin-bottom:4px;">${pct.toFixed(0)}%</div>
                    <div class="credit-bar">
                        <div class="credit-bar-fill ${barClass}" style="width:${Math.min(pct, 100)}%"></div>
                    </div>`}
                </td>
                <td><span class="status-badge ${statusClass}"><i class="bi bi-circle-fill" style="font-size:6px;"></i> ${statusLabel}</span></td>
                <td>
                    <div class="actions-cell">
                        ${can('edit','credit_payments') ? `<button class="action-btn edit" onclick="editClientCredit(${c.id})" title="Editar Límite"><i class="bi bi-pencil"></i></button>` : ''}
                        <button class="action-btn view" onclick="viewClientCredits(${c.id})" title="Ver Detalle"><i class="bi bi-eye"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="9"><div class="empty-state"><i class="bi bi-credit-card"></i><h3>No hay clientes registrados</h3><p>Agrega clientes para gestionar créditos</p></div></td></tr>';
    
    // Pending credits table
    const pendingBody = document.getElementById('pendingCreditsBody');
    const pendingSales = sales.filter(s => s.creditType === 'credito' && s.creditRemaining > 0).sort((a, b) => new Date(a.creditDueDate) - new Date(b.creditDueDate));
    
    pendingBody.innerHTML = pendingSales.map(s => {
        const isOverdue = s.creditDueDate && new Date(s.creditDueDate) < new Date();
        const statusClass = isOverdue ? 'overdue' : 'pending';
        const statusLabel = isOverdue ? 'Vencido' : 'Pendiente';
        
        return `
            <tr>
                <td style="font-weight:600;color:var(--primary);">${s.ticket}</td>
                <td>${s.date}</td>
                <td>${s.client}</td>
                <td style="font-weight:700;">$${s.total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                ${s.downPayment > 0 ? `<td style="color:var(--success);">$${s.downPayment.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>` : '<td>-</td>'}
                <td style="font-weight:700;color:var(--danger);">$${s.creditRemaining.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                <td style="${isOverdue ? 'color:var(--danger);font-weight:600;' : ''}">${s.creditDueDate || '-'}</td>
                <td><span class="status-badge ${statusClass}"><i class="bi bi-circle-fill" style="font-size:6px;"></i> ${statusLabel}</span></td>
                <td>
                    <div class="actions-cell">
                        ${can('create','credit_payments') ? `<button class="action-btn pay" onclick="showAbonoModal(${s.id})" title="Registrar Abono"><i class="bi bi-cash-stack"></i></button>` : ''}
                        <button class="action-btn view" onclick="viewSaleCreditDetail(${s.id})" title="Ver Detalle"><i class="bi bi-eye"></i></button>
                        <button class="action-btn print" onclick="printSale(${s.id})" title="Imprimir"><i class="bi bi-printer"></i></button>
                        <button class="action-btn download" onclick="downloadSalePdf(${s.id})" title="Descargar PDF"><i class="bi bi-download"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="9"><div class="empty-state"><i class="bi bi-check-circle"></i><h3>No hay créditos pendientes</h3><p>Todos los créditos están al día</p></div></td></tr>';
}

function showAbonoModal(saleId) {
    currentAbonoSaleId = saleId;
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    
    document.getElementById('abonoTicket').textContent = sale.ticket;
    document.getElementById('abonoRemaining').textContent = '$' + sale.creditRemaining.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('abonoAmount').value = '';
    // Show installment info in abono modal
    const abonoInfo = document.getElementById('abonoInstallmentInfo');
    if (sale.creditInstallments > 1) {
        if (!abonoInfo) {
            const infoDiv = document.createElement('div');
            infoDiv.id = 'abonoInstallmentInfo';
            infoDiv.style.cssText = 'background:var(--dark3);border-radius:10px;padding:10px;margin-bottom:12px;font-size:11px;';
            infoDiv.innerHTML = `<span style="color:var(--gray);">${sale.creditInstallments} cuotas · Cuota: $${(sale.creditInstallmentValue || 0).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})} · Interés: ${((sale.creditInterestRate || 0) * 100).toFixed(0)}%</span>`;
            document.getElementById('abonoAmount').closest('.form-group').before(infoDiv);
        }
    } else if (abonoInfo) { abonoInfo.remove(); }
    document.getElementById('abonoNotes').value = '';
    showModal('abonoModal');
}

function processAbono() {
    const sale = sales.find(s => s.id === currentAbonoSaleId);
    if (!sale) return;
    
    const amount = parseFloat(document.getElementById('abonoAmount').value);
    if (!amount || amount <= 0) { showToast('Ingresa un monto válido', 'error'); return; }
    if (amount > sale.creditRemaining) { showToast('El abono no puede ser mayor al restante', 'error'); return; }
    
    const payMethod = document.getElementById('abonoPayMethod').value;
    const notes = document.getElementById('abonoNotes').value;
    
    // Record payment
    creditPayments.push({
        id: Date.now(),
        saleId: sale.id,
        ticket: sale.ticket,
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        amount,
        payMethod,
        notes
    });
    saveCreditPayments();
    
    // Update sale
    sale.creditRemaining -= amount;
    if (sale.creditRemaining <= 0) {
        sale.creditRemaining = 0;
        sale.status = 'Completada';
    }
    saveSales();
    
    // Update client credit
    if (sale.clientId) {
        const client = clients.find(c => c.id === sale.clientId);
        if (client) {
            client.creditUsed = Math.max(0, client.creditUsed - amount);
            saveClients();
        }
    }
    
    hideModal('abonoModal');
    showToast(`Abono de $${amount.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})} registrado`, 'success');
    reRenderCurrentPage();
}

function editClientCredit(clientId) {
    currentEditClientId = clientId;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    document.getElementById('editCreditClientName').value = client.name;
    document.getElementById('editCreditLimit').value = client.creditLimit;
    showModal('editClientCreditModal');
}

function saveClientCredit() {
    const client = clients.find(c => c.id === currentEditClientId);
    if (!client) return;
    if (!can('edit', 'credit_payments')) { showToast('No tienes permiso para modificar límites de crédito', 'error'); return; }
    
    const newLimit = parseFloat(document.getElementById('editCreditLimit').value);
    if (isNaN(newLimit) || newLimit < 0) { showToast('Ingresa un límite válido (0 = sin límite)', 'error'); return; }
    
    client.creditLimit = newLimit;
    saveClients();
    hideModal('editClientCreditModal');
    showToast('Límite de crédito actualizado', 'success');
    reRenderCurrentPage();
}

function viewClientCredits(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    const clientSales = sales.filter(s => s.clientId === clientId && s.creditType === 'credito');
    const pendingSales = clientSales.filter(s => s.creditRemaining > 0);
    const paidSales = clientSales.filter(s => s.creditRemaining === 0);
    const clientPayments = creditPayments.filter(p => p.saleId && clientSales.some(s => s.id === p.saleId));
    
    const content = document.getElementById('viewSaleCreditContent');
    const creditEnabled = client.creditEnabled !== false;
    content.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
            <div class="user-avatar" style="width:48px;height:48px;font-size:16px;">${client.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
            <div>
                <h2 style="font-size:18px;">${client.name}</h2>
                <p style="color:var(--gray);font-size:12px;">${client.phone || ''} · ${client.email || ''} ${!creditEnabled ? '<span style="color:var(--danger);font-weight:600;">· Crédito desactivado</span>' : ''}</p>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
            <div style="background:var(--dark3);padding:12px;border-radius:10px;text-align:center;">
                <div style="font-size:11px;color:var(--gray);">Límite</div>
                <div style="font-weight:700;font-size:16px;">${client.creditLimit === 0 ? '<span style="color:var(--success);">♾️ Ilimitado</span>' : '$' + client.creditLimit.toLocaleString()}</div>
            </div>
            <div style="background:var(--dark3);padding:12px;border-radius:10px;text-align:center;">
                <div style="font-size:11px;color:var(--gray);">Deuda</div>
                <div style="font-weight:700;font-size:16px;color:var(--warning);">$${client.creditUsed.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
            </div>
            <div style="background:var(--dark3);padding:12px;border-radius:10px;text-align:center;">
                <div style="font-size:11px;color:var(--gray);">Disponible</div>
                <div style="font-weight:700;font-size:16px;color:var(--success);">${client.creditLimit === 0 ? '♾️ Sin límite' : '$' + (client.creditLimit - client.creditUsed).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
            </div>
        </div>
        ${clientPayments.length > 0 ? `
            <h4 style="margin-bottom:10px;font-size:14px;">💰 Historial de Abonos</h4>
            <table class="data-table">
                <thead><tr><th>Fecha</th><th>Ticket</th><th>Monto</th><th>Método</th></tr></thead>
                <tbody>
                    ${clientPayments.map(p => `
                        <tr>
                            <td>${p.date}</td>
                            <td style="color:var(--primary);">${p.ticket}</td>
                            <td style="font-weight:700;color:var(--success);">$${p.amount.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                            <td>${p.payMethod}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p style="color:var(--gray);font-size:12px;">Sin abonos registrados</p>'}
    `;
    showModal('viewSaleCreditModal');
}

function viewSaleCreditDetail(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    lastShownSaleId = saleId;
    
    const clientPayments = creditPayments.filter(p => p.saleId === saleId);
    
    const content = document.getElementById('viewSaleCreditContent');
    content.innerHTML = `
        <div style="text-align:center;margin-bottom:16px;">
            <h2 style="font-size:18px;">${sale.ticket}</h2>
            <p style="color:var(--gray);font-size:12px;">${sale.date} · ${sale.client}</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
            <div style="background:var(--dark3);padding:12px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Total Venta</div>
                <div style="font-weight:700;">$${sale.total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
            </div>
            <div style="background:var(--dark3);padding:12px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Abono Inicial</div>
                <div style="font-weight:700;color:var(--success);">$${(sale.downPayment || 0).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
            </div>
            <div style="background:var(--dark3);padding:12px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Restante</div>
                <div style="font-weight:700;color:${sale.creditRemaining > 0 ? 'var(--danger)' : 'var(--success)'};">$${sale.creditRemaining.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
            </div>
            <div style="background:var(--dark3);padding:12px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Vencimiento</div>
                <div style="font-weight:700;">${sale.creditDueDate || '-'}</div>
            </div>
        </div>
        ${sale.creditInstallments > 1 ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
            <div style="background:var(--dark3);padding:12px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Cuotas</div>
                <div style="font-weight:700;">${sale.creditInstallments} cuotas</div>
            </div>
            <div style="background:var(--dark3);padding:12px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Valor cuota</div>
                <div style="font-weight:700;color:var(--info);">$${(sale.creditInstallmentValue || 0).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
            </div>
            <div style="background:var(--dark3);padding:12px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Interés aplicado</div>
                <div style="font-weight:700;color:var(--danger);">+$${(sale.creditInterestAmount || 0).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
            </div>
            <div style="background:var(--dark3);padding:12px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Tasa interés</div>
                <div style="font-weight:700;color:var(--warning);">${((sale.creditInterestRate || 0) * 100).toFixed(0)}%</div>
            </div>
        </div>` : ''}
        ${clientPayments.length > 0 ? `
            <h4 style="margin-bottom:10px;font-size:14px;">💰 Abonos Realizados</h4>
            <table class="data-table">
                <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Notas</th></tr></thead>
                <tbody>
                    ${clientPayments.map(p => `
                        <tr>
                            <td>${p.date}</td>
                            <td style="font-weight:700;color:var(--success);">$${p.amount.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                            <td>${p.payMethod}</td>
                            <td style="color:var(--gray);">${p.notes || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p style="color:var(--gray);font-size:12px;">Sin abonos registrados</p>'}
    `;
    showModal('viewSaleCreditModal');
}

function exportCredits() {
    let csv = 'Ticket,Fecha,Cliente,Total,Abono Inicial,Cuotas,Interés,Valor Cuota,Restante,Vencimiento,Estado\n';
    sales.filter(s => s.creditType === 'credito').forEach(s => {
        csv += `${s.ticket},${s.date},${s.client},${s.total},${s.downPayment || 0},${s.creditInstallments || 1},${(s.creditInterestRate || 0) * 100}%,${(s.creditInstallmentValue || 0).toFixed(2)},${s.creditRemaining},${s.creditDueDate || ''},${s.creditRemaining > 0 ? 'Pendiente' : 'Pagado'}\n`;
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'creditos_cerezos.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Créditos exportados', 'success');
}

// ============ CLIENTS ============
function renderClients() {
    const search = (document.getElementById('clientSearch')?.value || '').toLowerCase();
    const filtered = clients.filter(c => c.name.toLowerCase().includes(search) || (c.phone || '').includes(search) || (c.email || '').includes(search));
    const showCredit = can('edit','settings');
    document.getElementById('creditActiveHeader').style.display = showCredit ? '' : 'none';
    const tbody = document.getElementById('clientsTableBody');
    tbody.innerHTML = filtered.map(c => {
        const isUnlimited = c.creditLimit === 0;
        const creditEnabled = c.creditEnabled !== false;
        return `
            <tr>
                <td>
                    <div class="product-cell">
                        <div class="user-avatar" style="width:36px;height:36px;font-size:12px;">${c.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                        <div class="product-info">
                            <h4>${c.name}</h4>
                        </div>
                    </div>
                </td>
                <td>${c.phone || '-'}</td>
                <td>${c.email || '-'}</td>
                <td style="font-weight:600;">${isUnlimited ? '<span style="color:var(--success);">♾️ Ilimitado</span>' : '$' + c.creditLimit.toLocaleString()}</td>
                ${can('edit','settings') ? `
                <td>
                    <label class="switch">
                        <input type="checkbox" ${creditEnabled ? 'checked' : ''} onchange="toggleClientCredit(${c.id}, this.checked)">
                        <span class="switch-slider"></span>
                    </label>
                </td>` : ''}
                <td>
                    <div class="actions-cell">
                        ${can('edit','clients') ? `<button class="action-btn edit" onclick="editClient(${c.id})" title="Editar"><i class="bi bi-pencil"></i></button>` : ''}
                        ${can('delete','clients') ? `<button class="action-btn delete" onclick="deleteClient(${c.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="' + (showCredit ? 6 : 5) + '"><div class="empty-state"><i class="bi bi-people"></i><h3>No hay clientes registrados</h3><p>Agrega tu primer cliente para empezar</p></div></td></tr>';
}

function editClient(id) {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    document.getElementById('editClientCreditGroup').style.display = can('edit','settings') ? '' : 'none';
    document.getElementById('editClientName').value = client.name;
    document.getElementById('editClientPhone').value = client.phone || '';
    document.getElementById('editClientEmail').value = client.email || '';
    document.getElementById('editClientCreditLimit').value = client.creditLimit;
    const toggle = document.getElementById('editClientCreditToggle');
    toggle.checked = client.creditEnabled !== false;
    document.getElementById('editClientCreditStatus').textContent = toggle.checked ? 'Activado' : 'Desactivado';
    toggle.onchange = function() {
        document.getElementById('editClientCreditStatus').textContent = this.checked ? 'Activado' : 'Desactivado';
    };
    document.getElementById('editClientModal').dataset.clientId = id;
    showModal('editClientModal');
}

function saveClientEdit() {
    const id = parseInt(document.getElementById('editClientModal').dataset.clientId);
    const client = clients.find(c => c.id === id);
    if (!client) { showToast('Cliente no encontrado', 'error'); return; }
    const name = document.getElementById('editClientName').value.trim();
    const phone = document.getElementById('editClientPhone').value.trim();
    const email = document.getElementById('editClientEmail').value.trim();
    const creditLimit = parseFloat(document.getElementById('editClientCreditLimit').value) || 0;
    const creditEnabled = document.getElementById('editClientCreditToggle').checked;

    if (!name) { showToast('El nombre es obligatorio', 'error'); return; }

    client.name = name;
    client.phone = phone;
    client.email = email;
    client.creditLimit = creditLimit;
    if (can('edit', 'settings')) client.creditEnabled = creditEnabled;
    saveClients();
    updateClientsDropdown();
    hideModal('editClientModal');
    reRenderCurrentPage();
    showToast('Cliente actualizado', 'success');
}

function deleteClient(id) {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    const salesCount = sales.filter(s => s.clientId === id).length;
    const pendingCreditSales = sales.filter(s => s.clientId === id && s.creditType === 'credito' && s.creditRemaining > 0);
    let msg = `¿Estás seguro de que deseas eliminar a "${client.name}"?`;
    if (salesCount > 0) {
        msg = `⚠️ "${client.name}" tiene ${salesCount} venta(s) registradas. Se desvincularán los datos del cliente de esas ventas. ¿Eliminar de todas formas?`;
    }
    if (pendingCreditSales.length > 0) {
        msg = `⚠️ "${client.name}" tiene ${pendingCreditSales.length} venta(s) a crédito pendiente(s). Se desvincularán los datos del cliente de esas ventas. ¿Eliminar de todas formas?`;
    }
    pendingDeleteId = id;
    pendingDeleteType = 'client';
    document.getElementById('confirmMessage').textContent = msg;
    document.getElementById('confirmBtn').textContent = 'Eliminar Cliente';
    showModal('confirmModal');
}

function toggleClientCredit(id, enabled) {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    if (!can('edit', 'settings')) { showToast('No tienes permiso para modificar créditos', 'error'); return; }
    client.creditEnabled = enabled;
    saveClients();
    showToast(enabled ? 'Crédito activado para ' + client.name : 'Crédito desactivado para ' + client.name, 'success');
}

// ============ REPORTS ============
function findSaleProduct(name, price) {
    return products.find(p => p.name === name && Math.abs(p.price - price) < 0.01) || products.find(p => p.name === name);
}

function renderReports() {
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    document.getElementById('reportRevenue').textContent = '$' + totalRevenue.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('reportTotalSales').textContent = sales.length;
    document.getElementById('reportAvgTicket').textContent = sales.length > 0 ? '$' + (totalRevenue / sales.length).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0}) : '$0';
    
    // Real profit calculation: match by name+price for accuracy
    let totalCost = 0;
    let totalProfit = 0;
    const catData = {};
    const prodData = {};
    
    sales.forEach(s => {
        s.items.forEach(si => {
            const product = findSaleProduct(si.name, si.price);
            const cost = product ? product.cost * si.qty : 0;
            const itemRevenue = si.price * si.qty;
            const itemProfit = itemRevenue - cost;
            totalCost += cost;
            totalProfit += itemProfit;
            
            // Category breakdown
            const cat = product ? product.category : 'Sin categoría';
            if (!catData[cat]) catData[cat] = { qty: 0, revenue: 0, cost: 0, profit: 0 };
            catData[cat].qty += si.qty;
            catData[cat].revenue += itemRevenue;
            catData[cat].cost += cost;
            catData[cat].profit += itemProfit;
            
            // Product breakdown
            if (!prodData[si.name]) prodData[si.name] = { qty: 0, revenue: 0, cost: 0, profit: 0 };
            prodData[si.name].qty += si.qty;
            prodData[si.name].revenue += itemRevenue;
            prodData[si.name].cost += cost;
            prodData[si.name].profit += itemProfit;
        });
    });
    
    const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
    document.getElementById('reportMargin').textContent = margin + '%';
    document.getElementById('reportProfit').textContent = '$' + totalProfit.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('reportCost').textContent = '$' + totalCost.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});

    // Category report with profit
    const catReport = document.getElementById('categoryReport');
    const totalCatQty = Object.values(catData).reduce((sum, c) => sum + c.qty, 0);
    catReport.innerHTML = Object.entries(catData).sort((a, b) => b[1].revenue - a[1].revenue).map(([cat, data]) => {
        const pct = totalCatQty > 0 ? (data.qty / totalCatQty * 100).toFixed(0) : 0;
        const catMargin = data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(0) : 0;
        return `
            <div style="margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;">
                    <span>${getCategoryIcon(cat)} ${cat}</span>
                    <span style="color:var(--gray);">${data.qty} uds · $${data.revenue.toLocaleString()}</span>
                </div>
                <div style="height:8px;background:var(--dark3);border-radius:4px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--primary),var(--primary-dark));border-radius:4px;transition:width 0.5s;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px;color:var(--gray);">
                    <span>Costo: $${data.cost.toLocaleString()}</span>
                    <span style="color:var(--success);">Ganancia: $${data.profit.toLocaleString()} (${catMargin}%)</span>
                </div>
            </div>
        `;
    }).join('') || '<p style="color:var(--gray);text-align:center;padding:20px;">Sin datos</p>';

    // Top products with profit
    const topProdEl = document.getElementById('topProductsReport');
    const sorted = Object.entries(prodData).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
    topProdEl.innerHTML = sorted.map(([name, data], i) => {
        const prodMargin = data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(0) : 0;
        return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i < sorted.length-1 ? 'border-bottom:1px solid var(--dark3);' : ''}">
            <span style="width:24px;height:24px;border-radius:50%;background:var(--dark3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--primary);">${i+1}</span>
            <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;">${name}</div>
                <div style="font-size:11px;color:var(--gray);">${data.qty} uds · Costo: $${data.cost.toLocaleString()}</div>
            </div>
            <div style="text-align:right;">
                <div style="color:var(--primary);font-weight:700;">$${data.revenue.toLocaleString()}</div>
                <div style="font-size:11px;color:var(--success);">+$${data.profit.toLocaleString()} (${prodMargin}%)</div>
            </div>
        </div>`;
    }).join('') || '<p style="color:var(--gray);text-align:center;padding:20px;">Sin datos</p>';
}

function exportReport() {
    let csv = 'Ticket,Fecha,Cliente,Artículos,Subtotal,IVA,Total,Método Pago,Tipo Crédito,Restante\n';
    sales.forEach(s => {
        const items = s.items.map(i => `${i.qty}x ${i.name}`).join(' | ');
        csv += `${s.ticket},${s.date},${s.client},"${items}",${s.subtotal},${s.tax},${s.total},${s.payMethod},${s.creditType},${s.creditRemaining || 0}\n`;
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte_ventas_cerezos.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Reporte exportado', 'success');
}

function exportAllData() {
    const data = { products, sales, users, clients, creditPayments };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cerezos_sneaker_backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Datos exportados', 'success');
}

// ============ USERS ============
function canEditUser(target) {
    if (!currentUser) return false;
    if (currentUser.role === 'Super Admin') return true;
    if (currentUser.role === 'Administrador' && target.role !== 'Super Admin') return true;
    return false;
}

function canDeleteUser(target) {
    if (!currentUser) return false;
    if (currentUser.id === target.id) return false; // cannot delete self
    if (currentUser.role === 'Super Admin') return true; // Super Admin can delete anyone except self
    if (currentUser.role === 'Administrador') {
        if (target.role === 'Super Admin') return false; // cannot delete Super Admin
        if (target.role === 'Administrador') return 'requires_super_admin'; // needs approval
        return true; // can delete Vendedor
    }
    return false;
}

function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(u => {
        const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        const roleIcons = { 'Vendedor': '🛒', 'Administrador': '👑', 'Super Admin': '🔰' };
        const canEdit = canEditUser(u);
        const delPerm = canDeleteUser(u);
        const showDelete = delPerm === true || delPerm === 'requires_super_admin';
        return `
            <tr>
                <td>
                    <div class="product-cell">
                        <div class="user-avatar" style="width:36px;height:36px;font-size:12px;">${initials}</div>
                        <div class="product-info">
                            <h4>${u.name}</h4>
                        </div>
                    </div>
                </td>
                <td>${u.email}</td>
                <td>${roleIcons[u.role] || ''} ${u.role}</td>
                <td><span class="status-badge ${u.status === 'active' ? 'active' : 'inactive'}"><i class="bi bi-circle-fill" style="font-size:6px;"></i> ${u.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                <td style="color:var(--gray);">${u.lastAccess || 'N/A'}</td>
                <td>
                    <div class="actions-cell">
                        ${canEdit ? `<button class="action-btn edit" onclick="editUser(${u.id})" title="Editar"><i class="bi bi-pencil"></i></button>` : ''}
                        ${showDelete ? `<button class="action-btn delete" onclick="deleteUser(${u.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function saveUser() {
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const pass = document.getElementById('userPass').value.trim();
    const role = document.querySelector('input[name="userRole"]:checked').value;

    if (!name || !email || !pass) { showToast('Completa todos los campos', 'error'); return; }
    if (role === 'Super Admin' && (!currentUser || currentUser.role !== 'Super Admin')) {
        showToast('Solo un Super Admin puede crear usuarios con este rol', 'error');
        return;
    }

    const salt = await generateSalt(16);
    const iterations = 100000;
    const hash = await hashPassword(pass, salt, iterations);
    users.push({ id: Date.now(), name, email, passwordHash: hash, passwordSalt: salt, passwordIterations: iterations, role, status: 'active', lastAccess: '' });
    saveUsers();
    renderUsers();
    hideModal('userModal');
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userPass').value = '';
    showToast('Usuario creado', 'success');
}

function editUser(id) {
    if (!canEditUser(users.find(u => u.id === id))) {
        showToast('No tienes permiso para editar este usuario', 'error');
        return;
    }
    const user = users.find(u => u.id === id);
    if (!user) return;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserPass').value = '';
    const radio = document.querySelector(`input[name="editUserRole"][value="${user.role}"]`);
    if (radio) radio.checked = true;
    document.getElementById('editUserModal').dataset.userId = id;
    showModal('editUserModal');
}

async function saveUserEdit() {
    const id = parseInt(document.getElementById('editUserModal').dataset.userId);
    const user = users.find(u => u.id === id);
    if (!user) { showToast('Usuario no encontrado', 'error'); return; }
    const name = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const pass = document.getElementById('editUserPass').value.trim();
    const role = document.querySelector('input[name="editUserRole"]:checked').value;

    if (!name || !email) { showToast('Nombre y correo son obligatorios', 'error'); return; }

    // Permission check: only Super Admin can set Super Admin role
    if (role === 'Super Admin' && currentUser.role !== 'Super Admin') {
        showToast('Solo un Super Admin puede asignar el rol de Super Admin', 'error');
        return;
    }
    // Cannot change own role or another Super Admin's role if not Super Admin
    if (currentUser.role !== 'Super Admin' && (user.role === 'Super Admin' || role === 'Super Admin')) {
        showToast('No tienes permiso para modificar roles de Super Admin', 'error');
        return;
    }

    user.name = name;
    user.email = email;
    user.role = role;
    if (pass) {
        const salt = await generateSalt(16);
        const iterations = 100000;
        user.passwordHash = await hashPassword(pass, salt, iterations);
        user.passwordSalt = salt;
        user.passwordIterations = iterations;
        delete user.password;
    }
    if (currentUser.id === user.id) {
        currentUser = user;
        updateSidebarUser(user);
    }
    saveUsers();
    renderUsers();
    hideModal('editUserModal');
    showToast('Usuario actualizado', 'success');
}

function deleteUser(id) {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const perm = canDeleteUser(target);
    if (perm === false) {
        if (currentUser && currentUser.id === id) {
            showToast('No puedes eliminarte a ti mismo', 'error');
        } else {
            showToast('No tienes permiso para eliminar este usuario', 'error');
        }
        return;
    }
    if (perm === 'requires_super_admin') {
        pendingDeleteId = id;
        pendingDeleteType = 'user';
        document.getElementById('superAuthEmail').value = '';
        document.getElementById('superAuthPass').value = '';
        showModal('superAdminAuthModal');
        return;
    }
    pendingDeleteId = id;
    pendingDeleteType = 'user';
    document.getElementById('confirmMessage').textContent = '¿Estás seguro de que deseas eliminar este usuario?';
    document.getElementById('confirmBtn').textContent = 'Eliminar';
    showModal('confirmModal');
}

function showLoader() {
    const el = document.getElementById('loaderOverlay');
    if (el) { el.classList.remove('hidden'); }
}
function hideLoader() {
    const el = document.getElementById('loaderOverlay');
    if (el) { el.classList.add('hidden'); }
}

// ============ INIT ============
(async function() {
    // Safety timeout: force-hide loader after 30s even if API hangs
    const safetyTimer = setTimeout(() => {
        hideLoader();
        document.getElementById('appLayout')?.classList.remove('active');
        const lp = document.getElementById('loginPage');
        if (lp) lp.style.display = 'flex';
        const errEl = document.getElementById('loginError');
        if (errEl) { errEl.textContent = 'Tiempo de espera agotado. Verifica tu conexión e inicia sesión.'; errEl.classList.add('show'); }
    }, 30000);

    const sessionOk = await checkSessionOnLoad();
    clearTimeout(safetyTimer);
    if (!sessionOk) {
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('appLayout').classList.remove('active');
    }
    hideLoader();
})();