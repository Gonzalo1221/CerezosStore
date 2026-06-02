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
