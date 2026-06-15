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
    const pageTableMap = { inventory:'products', pos:'products', sales:'sales', quotes:'quotes', credits:'clients', clients:'clients', reports:'reports', users:'users', settings:'settings', brandscat:'brands' };
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
    if (page === 'brandscat') renderBrandsCategories();
    localStorage.setItem('cs_current_page', page);
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

// ============ INIT APP (carga datos desde backend API) ============
async function initSupabaseOnly() {
    const tables = ['users','products','clients','sales','credit_payments','brands','categories','quotes','sizes'];
    const map = { users, products, clients, sales, credit_payments: creditPayments, brands, categories, quotes, sizes };
    
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
    
    // Ensure new fields on brands (parse JSON strings from Supabase)
    brands.forEach(b => {
        if (typeof b.categoryIds === 'string') try { b.categoryIds = JSON.parse(b.categoryIds); } catch(e) { b.categoryIds = []; }
        if (!Array.isArray(b.categoryIds)) b.categoryIds = [];
        delete b.sizeIds;
        delete b.sizeSystem;
    });
    
    // Ensure new fields on products (V2: multi-size per product)
    products.forEach(p => {
        if (typeof p.sizeIds === 'string') try { p.sizeIds = JSON.parse(p.sizeIds); } catch(e) { p.sizeIds = []; }
        if (!Array.isArray(p.sizeIds)) p.sizeIds = [];
        if (typeof p.stocks === 'string') try { p.stocks = JSON.parse(p.stocks); } catch(e) { p.stocks = {}; }
        if (!p.stocks || typeof p.stocks !== 'object') p.stocks = {};
    });
    
    // Ensure new fields on categories (parse JSON strings from Supabase)
    categories.forEach(c => {
        if (typeof c.subcategories === 'string') try { c.subcategories = JSON.parse(c.subcategories); } catch(e) { c.subcategories = []; }
        if (!Array.isArray(c.subcategories)) c.subcategories = [];
        if (typeof c.sizeIds === 'string') try { c.sizeIds = JSON.parse(c.sizeIds); } catch(e) { c.sizeIds = []; }
        if (!Array.isArray(c.sizeIds)) c.sizeIds = [];
        if (!c.type) c.type = 'prenda';
        if (!c.department) c.department = 'unisex';
        if (!c.icon) c.icon = '🏷️';
        if (c.sortOrder === undefined) c.sortOrder = 0;
        if (c.active === undefined) c.active = true;
    });
    
    // Ensure new fields on sizes
    sizes.forEach(s => {
        if (!s.system) s.system = 'shoe';
    });
    
    // Fallback defaults if Supabase has no data
    if (brands.length === 0) {
        brands = [
            'Adidas','Asics','Balenciaga','Brooks','Converse','Crocs','Diadora',
            'Dr. Martens','Fila','Hoka','Jordan','New Balance','Nike','On','Puma',
            'Reebok','Saucony','Skechers','Timberland','Under Armour','Vans'
        ].map((n,i) => ({ id: i+1, name: n, categoryIds: [] }));
    }
    if (categories.length === 0) {
        categories = getDefaultCategories();
    }
    if (sizes.length === 0) {
        sizes = getDefaultSizes();
    }
}

function getDefaultCategories() {
    return [
        { id: 1, name: 'Zapatos', type: 'calzado', department: 'unisex', icon: '👟', subcategories: ['Sneakers','Running','Casuales','Botas','Sandalias','Formales'], sizeIds: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], sortOrder: 1, active: true },
        { id: 2, name: 'Playeras', type: 'prenda', department: 'unisex', icon: '👕', subcategories: ['Lisas','Estampadas','Polo'], sizeIds: [16,17,18,19,20,21,22], sortOrder: 2, active: true },
        { id: 3, name: 'Sudaderas', type: 'prenda', department: 'unisex', icon: '🧥', subcategories: ['Con capucha','Sin capucha'], sizeIds: [16,17,18,19,20,21,22], sortOrder: 3, active: true },
        { id: 4, name: 'Chaquetas', type: 'prenda', department: 'unisex', icon: '🧥', subcategories: ['Rompevientos','Mezclilla'], sizeIds: [16,17,18,19,20,21,22], sortOrder: 4, active: true },
        { id: 5, name: 'Jeans', type: 'prenda', department: 'unisex', icon: '👖', subcategories: ['Skinny','Straight','Relaxed'], sizeIds: [23,24,25,26,27,28,29,30], sortOrder: 5, active: true },
        { id: 6, name: 'Bermudas', type: 'prenda', department: 'unisex', icon: '🩳', subcategories: ['Deportivas','Casuales'], sizeIds: [16,17,18,19,20,21,22], sortOrder: 6, active: true },
        { id: 7, name: 'Pantalones', type: 'prenda', department: 'unisex', icon: '👖', subcategories: ['Formales','Deportivos'], sizeIds: [23,24,25,26,27,28,29,30,31,32,33,34,35,36,37], sortOrder: 7, active: true },
        { id: 8, name: 'Accesorios', type: 'accesorio', department: 'unisex', icon: '🎒', subcategories: ['Gorras','Calcetines','Bolsos','Cinturones'], sizeIds: [], sortOrder: 8, active: true }
    ];
}

function getDefaultSizes() {
    return [
        // Zapato
        { id: 1, value: '36', label: '36', system: 'shoe' }, { id: 2, value: '36.5', label: '36.5', system: 'shoe' },
        { id: 3, value: '37', label: '37', system: 'shoe' }, { id: 4, value: '37.5', label: '37.5', system: 'shoe' },
        { id: 5, value: '38', label: '38', system: 'shoe' }, { id: 6, value: '38.5', label: '38.5', system: 'shoe' },
        { id: 7, value: '39', label: '39', system: 'shoe' }, { id: 8, value: '39.5', label: '39.5', system: 'shoe' },
        { id: 9, value: '40', label: '40', system: 'shoe' }, { id: 10, value: '40.5', label: '40.5', system: 'shoe' },
        { id: 11, value: '41', label: '41', system: 'shoe' }, { id: 12, value: '41.5', label: '41.5', system: 'shoe' },
        { id: 13, value: '42', label: '42', system: 'shoe' }, { id: 14, value: '42.5', label: '42.5', system: 'shoe' },
        { id: 15, value: '43', label: '43', system: 'shoe' },
        // Camisa / Playera (unisex)
        { id: 16, value: 'XS', label: 'XS', system: 'clothing' },
        { id: 17, value: 'S', label: 'S', system: 'clothing' },
        { id: 18, value: 'M', label: 'M', system: 'clothing' },
        { id: 19, value: 'L', label: 'L', system: 'clothing' },
        { id: 20, value: 'XL', label: 'XL', system: 'clothing' },
        { id: 21, value: 'XXL', label: 'XXL', system: 'clothing' },
        { id: 22, value: 'XXXL', label: 'XXXL', system: 'clothing' },
        // Pantalón hombre
        { id: 23, value: '28', label: '28"', system: 'clothing' },
        { id: 24, value: '30', label: '30"', system: 'clothing' },
        { id: 25, value: '32', label: '32"', system: 'clothing' },
        { id: 26, value: '34', label: '34"', system: 'clothing' },
        { id: 27, value: '36', label: '36"', system: 'clothing' },
        { id: 28, value: '38', label: '38"', system: 'clothing' },
        { id: 29, value: '40', label: '40"', system: 'clothing' },
        { id: 30, value: '42', label: '42"', system: 'clothing' },
        // Pantalón mujer
        { id: 31, value: 'W24', label: 'W24', system: 'clothing' },
        { id: 32, value: 'W26', label: 'W26', system: 'clothing' },
        { id: 33, value: 'W28', label: 'W28', system: 'clothing' },
        { id: 34, value: 'W30', label: 'W30', system: 'clothing' },
        { id: 35, value: 'W32', label: 'W32', system: 'clothing' },
        { id: 36, value: 'W34', label: 'W34', system: 'clothing' },
        { id: 37, value: 'W36', label: 'W36', system: 'clothing' }
    ];
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

    const savedPage = localStorage.getItem('cs_current_page') || 'dashboard';
    const navItem = document.querySelector(`.nav-item[data-page="${savedPage}"]`);
    if (navItem && navItem.style.display !== 'none') {
        navigateTo(savedPage, navItem);
    } else {
        navigateTo('dashboard', document.querySelector('.nav-item[data-page="dashboard"]'));
    }
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

// ============ MOBILE CARDS HELPERS ============
function buildMobileActionsBtn(id, actions, infoHtml, sheetTitle) {
    if (!actions || actions.length === 0) return '';
    const btnId = 'mad-' + id + '-' + Math.random().toString(36).slice(2, 6);
    const title = sheetTitle || 'Detalle';
    const infoSection = infoHtml ? `<div class="mad-info">${infoHtml}</div>` : '';
    return `<button class="mobile-actions-btn" onclick="openMobileActions('${btnId}')" aria-label="Acciones"><i class="bi bi-pencil"></i></button>
    <div class="mad-overlay" id="${btnId}-overlay" onclick="closeMobileActions('${btnId}')"></div>
    <div class="mobile-actions-dropdown" id="${btnId}">
        <div class="mad-header"><span>${title}</span><button class="mad-close" onclick="closeMobileActions('${btnId}')"><i class="bi bi-x-lg"></i></button></div>
        ${infoSection}
        <div class="mad-section-title">Acciones</div>
        <div class="mad-actions">
            ${actions.map(a => `<button class="mad-action-btn ${a.class || ''}" onclick="closeMobileActions('${btnId}');${a.onclick}"><i class="bi ${a.icon}"></i><span>${a.label}</span></button>`).join('')}
        </div>
    </div>`;
}

function openMobileActions(id) {
    const dropdown = document.getElementById(id);
    const overlay = document.getElementById(id + '-overlay');
    if (dropdown) dropdown.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeMobileActions(id) {
    const dropdown = document.getElementById(id);
    const overlay = document.getElementById(id + '-overlay');
    if (dropdown) dropdown.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
}
