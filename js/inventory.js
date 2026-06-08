// ============ INVENTORY ============
function getCategoryIcon(catName) {
    const cat = categories.find(c => c.name === catName);
    return cat ? (cat.icon || '🏷️') : '🏷️';
}

function getStockStatus(p) {
    const total = getTotalStock(p);
    if (total === 0) return 'out-stock';
    if (total <= (p.minStock || 5)) return 'low-stock';
    return 'in-stock';
}

function getStockLabel(p) {
    const total = getTotalStock(p);
    if (total === 0) return 'Agotado';
    if (total <= (p.minStock || 5)) return 'Stock Bajo';
    return 'En Stock';
}

function renderInventory() {
    const search = (document.getElementById('searchInventory')?.value || '').toLowerCase();
    const catFilter = document.getElementById('filterCategory')?.value || '';
    const stockFilter = document.getElementById('filterStock')?.value || '';

    let filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || (p.sku||'').toLowerCase().includes(search) || p.brand.toLowerCase().includes(search);
        const matchCat = !catFilter || p.category === catFilter;
        const total = getTotalStock(p);
        let matchStock = true;
        if (stockFilter === 'in') matchStock = total > (p.minStock || 5);
        else if (stockFilter === 'low') matchStock = total > 0 && total <= (p.minStock || 5);
        else if (stockFilter === 'out') matchStock = total === 0;
        return matchSearch && matchCat && matchStock;
    });

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const start = (currentPage.inventory - 1) * ITEMS_PER_PAGE;
    const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = pageItems.map(p => {
        const total = getTotalStock(p);
        const sizesHtml = (p.sizeIds || []).map(sid => {
            const stock = getStockForSize(p, sid);
            const label = getSizeLabel(sid);
            const cls = stock <= (p.minStock || 5) ? (stock === 0 ? 'size-chip danger' : 'size-chip warning') : 'size-chip';
            return `<span class="${cls}" title="Talla ${label}: ${stock} uds">${label}</span>`;
        }).join(' ');
        const totalCls = total === 0 ? 'var(--danger)' : 'var(--dark)';
        return `
            <tr>
                <td>
                    <div class="product-cell">
                        <div class="product-thumb">${getCategoryIcon(p.category)}</div>
                        <div class="product-info">
                            <h4>${p.name}</h4>
                            <small>${p.brand} · ${getCategoryIcon(p.category)} ${p.category}</small>
                        </div>
                    </div>
                </td>
                <td style="font-family:monospace;color:var(--gray-light);font-size:11px;">${p.sku || '-'}</td>
                <td>
                    <div class="sizes-group">${sizesHtml || '<span style="color:var(--gray);font-size:11px;">Sin tallas</span>'}</div>
                </td>
                <td style="font-weight:700;color:${totalCls};">${total}</td>
                <td style="font-size:11px;">
                    <div style="font-weight:600;">$${(p.price - (p.cost||0)).toLocaleString()}</div>
                    <div style="color:var(--gray-light);font-size:10px;">${p.cost > 0 ? Math.round((p.price - p.cost) / p.price * 100) + '%' : '-'}</div>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="action-btn view" onclick="viewProduct(${p.id})" title="Ver"><i class="bi bi-eye"></i></button>
                        ${can('edit','products') ? `<button class="action-btn edit" onclick="editProduct(${p.id})" title="Editar"><i class="bi bi-pencil"></i></button>` : ''}
                        ${can('delete','products') ? `<button class="action-btn delete" onclick="deleteProduct(${p.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="6"><div class="empty-state"><i class="bi bi-box-seam"></i><h3>No hay productos</h3><p>Agrega tu primer producto al inventario</p></div></td></tr>';

    const mobileEl = document.getElementById('inventoryMobileCards');
    if (mobileEl) {
        mobileEl.innerHTML = pageItems.map(p => {
            const total = getTotalStock(p);
            const totalCls = total === 0 ? 'var(--danger)' : 'var(--dark)';
            const sizesHtml = (p.sizeIds || []).map(sid => {
                const stock = getStockForSize(p, sid);
                const label = getSizeLabel(sid);
                const cls = stock <= (p.minStock || 5) ? (stock === 0 ? 'mc-stock-chip danger' : 'mc-stock-chip warning') : 'mc-stock-chip';
                return `<span class="${cls}">${label}: ${stock}</span>`;
            }).join('');
            const profit = p.price - (p.cost || 0);
            const profitPct = p.cost > 0 ? Math.round((profit / p.price) * 100) : 0;
            const actions = [];
            actions.push({ icon: 'bi-eye', class: 'view', label: 'Ver', onclick: `viewProduct(${p.id})` });
            if (can('edit','products')) actions.push({ icon: 'bi-pencil', class: 'edit', label: 'Editar', onclick: `editProduct(${p.id})` });
            if (can('delete','products')) actions.push({ icon: 'bi-trash3', class: 'delete danger', label: 'Eliminar', onclick: `deleteProduct(${p.id})` });
            return `
            <div class="mobile-card inventario">
                <div class="mobile-card-header">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div class="product-thumb" style="width:38px;height:38px;font-size:18px;">${getCategoryIcon(p.category)}</div>
                        <div>
                            <div class="mobile-card-id">${p.name}</div>
                            <div class="mobile-card-sub">${p.brand} · ${p.category}</div>
                        </div>
                    </div>
                    ${buildMobileActionsBtn('p-' + p.id, actions)}
                </div>
                <div class="mobile-card-body">
                    <div class="mobile-card-row">
                        <i class="bi bi-upc-scan"></i>
                        <span class="mc-value" style="font-family:monospace;font-size:11px;color:var(--gray);">${p.sku || '-'}</span>
                    </div>
                    <div class="mobile-card-row">
                        <i class="bi bi-rulers"></i>
                        <div class="mobile-card-chips">${sizesHtml || '<span style="color:var(--gray);font-size:11px;">Sin tallas</span>'}</div>
                    </div>
                </div>
                <div class="mobile-card-footer">
                    <div>
                        <div class="mobile-card-total" style="color:${totalCls};">${total} <small>stock total</small></div>
                        ${profit > 0 ? `<div class="mobile-card-profit">+$${profit.toLocaleString()} (${profitPct}%)</div>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('') || '<div class="empty-state" style="padding:30px;text-align:center;color:var(--gray);"><i class="bi bi-box-seam"></i><h3>No hay productos</h3></div>';
    }

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
        const matchSearch = p.name.toLowerCase().includes(search) || (p.sku||'').toLowerCase().includes(search) || p.brand.toLowerCase().includes(search);
        const matchCat = !catFilter || p.category === catFilter;
        const total = getTotalStock(p);
        let matchStock = true;
        if (stockFilter === 'in') matchStock = total > (p.minStock || 5);
        else if (stockFilter === 'low') matchStock = total > 0 && total <= (p.minStock || 5);
        else if (stockFilter === 'out') matchStock = total === 0;
        return matchSearch && matchCat && matchStock;
    });
}

function filterInventory() {
    currentPage.inventory = 1;
    renderInventory();
}

// ============ PRODUCT FORM: CATEGORY-FIRST FLOW ============
function getSubcategoriesForCategory(catName) {
    const cat = categories.find(c => c.name === catName);
    return cat ? (cat.subcategories || []) : [];
}

function getBrandsForCategory(catName) {
    if (!catName) return brands;
    const cat = categories.find(c => c.name === catName);
    if (!cat) return brands;
    return brands.filter(b => {
        if (!b.categoryIds || b.categoryIds.length === 0) return true;
        const catIdSet = new Set(b.categoryIds.map(id => Number(id)));
        return catIdSet.has(Number(cat.id));
    });
}

function getSizeSystemForCategory(catName) {
    const cat = categories.find(c => c.name === catName);
    if (!cat) return 'clothing';
    if (cat.type === 'calzado') return 'shoe';
    if (cat.type === 'prenda' || cat.type === 'accesorio') return 'clothing';
    const lower = catName.toLowerCase();
    if (/zapato|tenis|sneaker|zapatilla|bota|sandalia|calzado/.test(lower)) return 'shoe';
    return 'clothing';
}

function getSizesForSystem(system) {
    return sizes.filter(s => s.system === system);
}

function getSizesForBrandAndCategory(brandName, catName) {
    const cat = categories.find(c => c.name === catName);
    const catSizeIds = cat && cat.sizeIds && cat.sizeIds.length > 0 ? cat.sizeIds.map(id => Number(id)) : null;

    if (catSizeIds) {
        return sizes.filter(s => catSizeIds.includes(Number(s.id)));
    }
    const system = getSizeSystemForCategory(catName);
    return sizes.filter(s => s.system === system);
}

function buildSizeSelectOptions(selectedValue) {
    const catName = getCdValue('prodCategoryCd') || document.getElementById('prodCategory')?.value || '';
    const brandName = getCdValue('prodBrandCd') || document.getElementById('prodBrand')?.value || '';
    const availableSizes = getSizesForBrandAndCategory(brandName, catName);
    let html = '<option value="">Seleccionar talla...</option>';
    availableSizes.forEach(s => {
        const sel = s.value === selectedValue || s.label === selectedValue ? 'selected' : '';
        html += `<option value="${s.value}" ${sel}>${s.label}</option>`;
    });
    return html;
}

function buildSubcategoryOptions(selectedValue) {
    const catName = getCdValue('prodCategoryCd') || '';
    const subs = getSubcategoriesForCategory(catName);
    let html = '<option value="">Sin subcategoría</option>';
    subs.forEach(s => {
        const sel = s === selectedValue ? 'selected' : '';
        html += `<option value="${s}" ${sel}>${s}</option>`;
    });
    return html;
}

let _productFormUpdating = false;

function onCategoryChangeForProduct() {
    if (_productFormUpdating) return;
    _productFormUpdating = true;

    const catName = getCdValue('prodCategoryCd') || '';

    // Sync to native select
    const catNative = document.getElementById('prodCategory');
    if (catNative) catNative.value = catName;

    // 1) Filter brands by category
    const filteredBrands = getBrandsForCategory(catName);
    const brandWrap = document.getElementById('prodBrandCd');
    const currentBrand = getCdValue('prodBrandCd') || '';
    const validBrand = filteredBrands.some(b => b.name === currentBrand) ? currentBrand : '';

    if (brandWrap) {
        const brandOptions = filteredBrands.map(b => ({ value: b.name, label: b.name, icon: 'bookmark-fill' }));
        createCustomDropdown('prodBrandCd', brandOptions, {
            placeholder: 'Seleccionar marca...',
            icon: 'bookmark-fill',
            value: validBrand,
            onChange: function(val) {
                const brandNative = document.getElementById('prodBrand');
                if (brandNative) brandNative.value = val;
                refreshAllSizeSelects();
            }
        });
        const brandNative = document.getElementById('prodBrand');
        if (brandNative) brandNative.value = validBrand;
    }

    // 2) Update subcategory dropdown
    const subWrap = document.getElementById('prodSubcategoryCd');
    if (subWrap) {
        const currentSub = getCdValue('prodSubcategoryCd') || '';
        const subs = getSubcategoriesForCategory(catName);
        const subOptions = subs.map(s => ({ value: s, label: s, icon: 'tag' }));
        const validSub = subs.includes(currentSub) ? currentSub : '';
        createCustomDropdown('prodSubcategoryCd', subOptions, {
            placeholder: 'Sin subcategoría',
            icon: 'tag',
            value: validSub,
            onChange: function(val) {
                const subNative = document.getElementById('prodSubcategory');
                if (subNative) subNative.value = val;
            }
        });
        const subNative = document.getElementById('prodSubcategory');
        if (subNative) subNative.value = validSub;
    }

    // 3) Update department (inherit from category)
    const cat = categories.find(c => c.name === catName);
    if (cat && !document.getElementById('prodDeptManual')?.checked) {
        const deptNative = document.getElementById('prodDepartment');
        if (deptNative) deptNative.value = cat.department || 'unisex';
        setCdValue('prodDeptCd', cat.department || 'unisex');
    }

    // 4) Refresh sizes AFTER brand is set
    refreshAllSizeSelects();

    _productFormUpdating = false;
}

function refreshAllSizeSelects() {
    document.querySelectorAll('#sizesContainer .size-select').forEach(sel => {
        const current = sel.value;
        sel.innerHTML = buildSizeSelectOptions(current);
    });
}

// ============ SIZE ROW MANAGEMENT ============
function addSizeRow(size, stock) {
    const container = document.getElementById('sizesContainer');
    const idx = container.children.length;
    const div = document.createElement('div');
    div.className = 'size-row';
    div.dataset.index = idx;
    div.innerHTML = `
        <select class="form-select size-select" style="flex:1;">${buildSizeSelectOptions(size)}</select>
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
    const result = [];
    rows.forEach(row => {
        const size = row.querySelector('.size-select')?.value;
        const stock = parseInt(row.querySelector('.size-stock')?.value) || 0;
        if (size) result.push({ size, stock });
    });
    return result;
}

async function saveProduct() {
    const editId = document.getElementById('editProductId').value;
    const name = document.getElementById('prodName').value.trim();
    const brand = getCdValue('prodBrandCd') || '';
    const category = getCdValue('prodCategoryCd') || '';
    const subcategory = getCdValue('prodSubcategoryCd') || '';
    const department = getCdValue('prodDeptCd') || 'unisex';
    const gender = getCdValue('prodGenderCd') || 'Unisex';
    const skuBase = document.getElementById('prodSKU').value.trim();
    const cost = parseFloat(document.getElementById('prodCost').value) || 0;
    const price = parseFloat(document.getElementById('prodPrice').value) || 0;
    const minStock = parseInt(document.getElementById('prodMinStock').value) || 5;
    const desc = document.getElementById('prodDesc').value.trim();
    const sellWithoutStock = document.getElementById('prodSellWithoutStock').checked;
    const sizeRows = getSizeRows();

    if (!name) { showToast('Ingresa el nombre del producto', 'error'); return; }
    if (price <= 0) { showToast('Ingresa un precio válido', 'error'); return; }
    if (sizeRows.length === 0) { showToast('Agrega al menos una talla', 'error'); return; }

    const invalidSizes = sizeRows.filter(s => !sizes.some(sz => sz.value === s.size || sz.label === s.size));
    if (invalidSizes.length > 0) {
        showToast('Talla no válida: ' + invalidSizes.map(s => s.size).join(', ') + '. Crea la talla primero en Catálogos.', 'error');
        return;
    }

    const sizeIds = sizeRows.map(s => {
        const sz = sizes.find(z => z.value === s.size || z.label === s.size);
        return sz ? sz.id : null;
    }).filter(Boolean);

    const stocks = {};
    sizeRows.forEach(s => {
        const sz = sizes.find(z => z.value === s.size || z.label === s.size);
        if (sz) stocks[String(sz.id)] = parseInt(s.stock) || 0;
    });

    const sku = skuBase || (name.slice(0,3).toUpperCase() + '-' + brand.slice(0,2).toUpperCase());

    const productData = {
        name, brand, category, subcategory, department, gender,
        sku, cost, price, minStock, sellWithoutStock, desc,
        sizeIds, stocks
    };

    if (editId) {
        const existing = products.find(p => p.id === parseInt(editId));
        if (existing) {
            Object.assign(existing, productData);
            try {
                await apiUpsert('products', [existing]);
            } catch (e) {
                showToast('Error al guardar: ' + e.message, 'error');
                return;
            }
        }
    } else {
        productData.id = Date.now();
        try {
            await apiUpsert('products', [productData]);
        } catch (e) {
            showToast('Error al guardar: ' + e.message, 'error');
            return;
        }
        products.push(productData);
    }

    hideModal('productModal');
    clearProductForm();
    reRenderCurrentPage();
    showToast(editId ? 'Producto actualizado' : 'Producto agregado', 'success');
}

function editProduct(id) {
    const p = products.find(pr => pr.id === id);
    if (!p) return;

    _productFormUpdating = true;
    document.getElementById('editProductId').value = p.id;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodSKU').value = p.sku || '';
    document.getElementById('prodCost').value = p.cost || 0;
    document.getElementById('prodPrice').value = p.price || 0;
    document.getElementById('prodMinStock').value = p.minStock || 5;
    document.getElementById('prodDesc').value = p.desc || '';
    document.getElementById('prodSellWithoutStock').checked = p.sellWithoutStock || false;
    document.getElementById('productModalTitle').textContent = '✏️ Editar Producto';

    document.getElementById('prodCategory').value = p.category;
    if (document.getElementById('prodCategoryCd')) setCdValue('prodCategoryCd', p.category || '');
    onCategoryChangeForProduct();

    document.getElementById('prodBrand').value = p.brand;
    if (document.getElementById('prodBrandCd')) setCdValue('prodBrandCd', p.brand || '');

    document.getElementById('prodSubcategory').value = p.subcategory || '';
    if (document.getElementById('prodSubcategoryCd')) setCdValue('prodSubcategoryCd', p.subcategory || '');

    document.getElementById('prodDepartment').value = p.department || 'unisex';
    if (document.getElementById('prodDeptCd')) setCdValue('prodDeptCd', p.department || 'unisex');

    document.getElementById('prodGender').value = p.gender || 'Unisex';
    if (document.getElementById('prodGenderCd')) setCdValue('prodGenderCd', p.gender || 'Unisex');

    _productFormUpdating = false;

    const container = document.getElementById('sizesContainer');
    container.innerHTML = '';
    (p.sizeIds || []).forEach((sid, i) => {
        const sz = sizes.find(s => Number(s.id) === Number(sid));
        const stockVal = getStockForSize(p, sid);
        const div = document.createElement('div');
        div.className = 'size-row';
        div.dataset.index = i;
        div.innerHTML = `
            <select class="form-select size-select" style="flex:1;">${buildSizeSelectOptions(sz ? sz.value : '')}</select>
            <input type="number" class="form-input size-stock" placeholder="Stock" min="0" style="width:80px;text-align:center;" value="${stockVal}">
            <button type="button" class="btn btn-sm btn-danger size-remove" onclick="removeSizeRow(this)" style="padding:3px 8px;font-size:11px;"><i class="bi bi-x"></i></button>
        `;
        container.appendChild(div);
    });

    if (container.children.length === 0) addSizeRow('', '');

    showModal('productModal');
}

function viewProduct(id) {
    const p = products.find(pr => pr.id === id);
    if (!p) return;
    const total = getTotalStock(p);
    const content = document.getElementById('viewProductContent');
    const sizesHtml = (p.sizeIds || []).map(sid => {
        const stock = getStockForSize(p, sid);
        const label = getSizeLabel(sid);
        const cls = stock <= (p.minStock || 5) ? (stock === 0 ? 'size-chip danger' : 'size-chip warning') : 'size-chip';
        return `<span class="${cls}" style="margin:2px;min-width:44px;padding:4px 10px;font-size:13px;">${label} (${stock})</span>`;
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
            <div style="display:flex;flex-wrap:wrap;gap:4px;">${sizesHtml || '<span style="color:var(--gray);">Sin tallas</span>'}</div>
        </div>
        <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;margin-bottom:12px;">
            <div style="font-size:11px;color:var(--gray);margin-bottom:4px;">SKU</div>
            <div style="font-weight:600;font-family:monospace;">${p.sku || '-'}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Precio Compra</div>
                <div style="font-weight:600;">$${(p.cost||0).toLocaleString()}</div>
            </div>
            <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Precio Venta</div>
                <div style="font-weight:600;color:var(--primary);">$${p.price.toLocaleString()}</div>
            </div>
            <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Stock Total</div>
                <div style="font-weight:700;${total <= (p.minStock||5) ? 'color:' + (total === 0 ? 'var(--danger)' : 'var(--warning)') : ''}">${total} unidades</div>
            </div>
            <div style="background:var(--dark3);padding:12px 16px;border-radius:10px;">
                <div style="font-size:11px;color:var(--gray);">Stock Mínimo</div>
                <div style="font-weight:600;">${p.minStock || 5} unidades</div>
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
        apiDelete('products', pendingDeleteId);
        saveProducts().catch(e => showToast('Error al guardar: ' + e.message, 'error'));
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
    _productFormUpdating = true;
    document.getElementById('editProductId').value = '';
    document.getElementById('prodName').value = '';
    document.getElementById('prodSKU').value = '';
    document.getElementById('prodCost').value = '';
    document.getElementById('prodPrice').value = '';
    document.getElementById('prodMinStock').value = '5';
    document.getElementById('prodDesc').value = '';
    document.getElementById('prodSellWithoutStock').checked = false;
    document.getElementById('productModalTitle').textContent = '👟 Nuevo Producto';
    const firstCat = categories.length > 0 ? categories[0].name : '';

    // Reinitialize all dropdowns
    populateBrandCategoryDropdowns();

    // Set category and trigger filtering
    if (firstCat) {
        setCdValue('prodCategoryCd', firstCat);
    }
    onCategoryChangeForProduct();

    _productFormUpdating = false;

    // Reset sizes container
    document.getElementById('sizesContainer').innerHTML = `
        <div class="size-row" data-index="0">
            <select class="form-select size-select" style="flex:1;">${buildSizeSelectOptions('')}</select>
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
    const csvProducts = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.length >= 9) {
            csvProducts.push({
                name: cols[0] || 'Sin nombre', brand: cols[1] || '', category: cols[2] || 'Sneakers',
                sizeValue: cols[3] || '', gender: cols[5] || 'Unisex',
                sku: cols[6] || '', cost: parseFloat(cols[7]) || 0, price: parseFloat(cols[8]) || 0,
                stock: parseInt(cols[9]) || 0, minStock: parseInt(cols[10]) || 5, desc: cols[11] || ''
            });
        }
    }
    const grouped = {};
    csvProducts.forEach(row => {
        const key = row.name + '||' + row.brand + '||' + row.category;
        if (!grouped[key]) grouped[key] = { ...row, sizeIds: [], stocks: {} };
        const sz = sizes.find(s => s.value === row.sizeValue || s.label === row.sizeValue);
        if (sz) {
            grouped[key].sizeIds.push(sz.id);
            grouped[key].stocks[String(sz.id)] = row.stock;
        }
    });
    Object.values(grouped).forEach(g => {
        const sizeIds = [...new Set(g.sizeIds)];
        const stocks = {};
        sizeIds.forEach(sid => { stocks[String(sid)] = g.stocks[String(sid)] || 0; });
        products.push({
            id: Date.now() + Math.random(), name: g.name, brand: g.brand, category: g.category,
            subcategory: '', department: 'unisex', gender: g.gender, sku: g.sku,
            cost: g.cost, price: g.price, minStock: g.minStock, sellWithoutStock: false,
            desc: g.desc, sizeIds, stocks
        });
    });
    saveProducts().catch(e => console.warn('saveProducts:', e));
    renderInventory();
    renderDashboard();
    hideModal('importModal');
    showToast(`${Object.keys(grouped).length} productos importados correctamente`, 'success');
    csvData = null;
    document.getElementById('csvFileName').textContent = 'Arrastra o haz clic para seleccionar';
    document.getElementById('importBtn').disabled = true;
    document.getElementById('csvFileInput').value = '';
}
