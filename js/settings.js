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
    // Category dropdown (product form) - custom dropdown
    const catWrap = document.getElementById('prodCategoryCd');
    if (catWrap) {
        const current = getCdValue('prodCategoryCd') || '';
        const catOptions = categories.filter(c => c.active !== false).map(c => ({ value: c.name, label: c.name, icon: 'tag-fill' }));
        createCustomDropdown('prodCategoryCd', catOptions, {
            placeholder: 'Seleccionar categoría...',
            icon: 'tag-fill',
            value: current,
            onChange: function(val) {
                const catNative = document.getElementById('prodCategory');
                if (catNative) catNative.value = val;
                onCategoryChangeForProduct();
            }
        });
    }
    // Brand dropdown (product form) - custom dropdown
    const brandWrap = document.getElementById('prodBrandCd');
    if (brandWrap) {
        const current = getCdValue('prodBrandCd') || '';
        const catName = getCdValue('prodCategoryCd') || '';
        const filteredBrands = getBrandsForCategory(catName);
        const brandOptions = filteredBrands.map(b => ({ value: b.name, label: b.name, icon: 'bookmark-fill' }));
        createCustomDropdown('prodBrandCd', brandOptions, {
            placeholder: 'Seleccionar marca...',
            icon: 'bookmark-fill',
            value: current,
            onChange: function(val) {
                const brandNative = document.getElementById('prodBrand');
                if (brandNative) brandNative.value = val;
                refreshAllSizeSelects();
            }
        });
    }
    // Subcategory dropdown (product form) - custom dropdown
    const subWrap = document.getElementById('prodSubcategoryCd');
    if (subWrap) {
        const current = getCdValue('prodSubcategoryCd') || '';
        const catName = getCdValue('prodCategoryCd') || '';
        const subs = getSubcategoriesForCategory(catName);
        const subOptions = subs.map(s => ({ value: s, label: s, icon: 'tag' }));
        createCustomDropdown('prodSubcategoryCd', subOptions, {
            placeholder: 'Sin subcategoría',
            icon: 'tag',
            value: current,
            onChange: function(val) {
                const subNative = document.getElementById('prodSubcategory');
                if (subNative) subNative.value = val;
            }
        });
    }
    // Department dropdown (product form) - custom dropdown
    const deptWrap = document.getElementById('prodDeptCd');
    if (deptWrap) {
        const current = document.getElementById('prodDepartment')?.value || 'unisex';
        const deptOptions = [
            { value: 'hombre', label: '👨 Hombre', icon: 'person' },
            { value: 'mujer', label: '👩 Mujer', icon: 'person' },
            { value: 'niño', label: '👧 Niño', icon: 'person' },
            { value: 'unisex', label: '🌍 Unisex', icon: 'globe' }
        ];
        createCustomDropdown('prodDeptCd', deptOptions, {
            placeholder: 'Departamento...',
            icon: 'globe',
            value: current,
            onChange: function(val) { document.getElementById('prodDepartment').value = val; }
        });
    }
    // Gender dropdown (product form) - custom dropdown
    const genderWrap = document.getElementById('prodGenderCd');
    if (genderWrap) {
        const current = document.getElementById('prodGender')?.value || 'Unisex';
        const genderOptions = [
            { value: 'Unisex', label: 'Unisex', icon: 'globe' },
            { value: 'Hombre', label: 'Hombre', icon: 'person' },
            { value: 'Mujer', label: 'Mujer', icon: 'person' },
            { value: 'Niño', label: 'Niño', icon: 'person' }
        ];
        createCustomDropdown('prodGenderCd', genderOptions, {
            placeholder: 'Género...',
            icon: 'globe',
            value: current,
            onChange: function(val) { document.getElementById('prodGender').value = val; }
        });
    }
    // Category filter (inventory)
    const invFilter = document.getElementById('filterCategory');
    if (invFilter) {
        const current = invFilter.value;
        invFilter.innerHTML = '<option value="">Todas las categorías</option>' +
            categories.filter(c => c.active !== false).map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        invFilter.value = current || '';
    }
    // Category filter (POS)
    const posFilter = document.getElementById('posCategoryFilter');
    if (posFilter) {
        const current = posFilter.value;
        posFilter.innerHTML = '<option value="">Todas</option>' +
            categories.filter(c => c.active !== false).map(c => `<option value="${c.name}">${c.name}</option>`).join('');
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
async function saveCategories() { try { await apiUpsert('categories', categories); } catch (e) { console.warn('saveCategories:', e); showToast('Error al guardar categorías: ' + e.message, 'error'); } }
async function saveBrands() { try { await apiUpsert('brands', brands); } catch (e) { console.warn('saveBrands:', e); showToast('Error al guardar marcas: ' + e.message, 'error'); } }
async function saveSizes() { try { await apiUpsert('sizes', sizes); } catch (e) { console.warn('saveSizes:', e); showToast('Error al guardar tallas: ' + e.message, 'error'); } }
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
