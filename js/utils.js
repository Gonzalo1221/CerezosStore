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
