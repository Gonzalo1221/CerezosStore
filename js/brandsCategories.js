// ============ BRANDS, CATEGORIES & SIZES MANAGEMENT (Professional) ============

const DEPT_LABELS = { hombre: 'Hombre', mujer: 'Mujer', niño: 'Niño', unisex: 'Unisex' };
const DEPT_ICONS = { hombre: '👤', mujer: '👩', niño: '🧒', unisex: '🌐' };
const TYPE_LABELS = { prenda: 'Prenda', calzado: 'Calzado', accesorio: 'Accesorio' };

// ============ MAIN RENDER ============
function renderBrandsCategories() {
    renderBcStats();
    renderCategoriesByDepartment();
    renderBrandsPanel();
    renderSizesPanel();
}

// ============ DASHBOARD STATS ============
function renderBcStats() {
    const el = document.getElementById('bcStats');
    if (!el) return;
    const activeCats = categories.filter(c => c.active !== false).length;
    const totalProducts = products.length;
    el.innerHTML = `
        <div class="bc-stat-card"><div class="bc-stat-icon brand"><i class="bi bi-bookmark-fill"></i></div><div class="bc-stat-num">${brands.length}</div><div class="bc-stat-label">Marcas</div></div>
        <div class="bc-stat-card"><div class="bc-stat-icon category"><i class="bi bi-tag-fill"></i></div><div class="bc-stat-num">${activeCats}</div><div class="bc-stat-label">Categorías</div></div>
        <div class="bc-stat-card"><div class="bc-stat-icon size"><i class="bi bi-rulers"></i></div><div class="bc-stat-num">${sizes.length}</div><div class="bc-stat-label">Tallas</div></div>
        <div class="bc-stat-card"><div class="bc-stat-icon product"><i class="bi bi-box-seam"></i></div><div class="bc-stat-num">${totalProducts}</div><div class="bc-stat-label">Productos</div></div>
    `;
}

// ============ CATEGORIES BY DEPARTMENT ============
function renderCategoriesByDepartment() {
    const container = document.getElementById('bcCategoriesPanel');
    if (!container) return;
    const departments = ['hombre', 'mujer', 'niño', 'unisex'];
    let html = '';
    departments.forEach(dept => {
        const cats = categories.filter(c => c.department === dept && c.active !== false).sort((a,b) => (a.sortOrder||0) - (b.sortOrder||0));
        if (cats.length === 0 && dept === 'niño') return;
        html += `<div class="bc-dept-section">
            <div class="bc-dept-header">
                <span class="bc-dept-title">${DEPT_ICONS[dept]} ${DEPT_LABELS[dept]}</span>
                <span class="bc-dept-count">${cats.length}</span>
                <button class="btn btn-sm btn-primary" onclick="showAddCategoryModal('${dept}')" ${!can('create','categories') ? 'style="display:none"' : ''}><i class="bi bi-plus-lg"></i> Nueva</button>
            </div>
            <div class="bc-cat-grid">`;
        if (cats.length === 0) {
            html += `<div class="bc-empty-inline">Sin categorías en esta sección</div>`;
        }
        cats.forEach(c => {
            const productCount = products.filter(p => p.category === c.name).length;
            const brandCount = brands.filter(b => (b.categoryIds||[]).includes(c.id)).length;
            const subHtml = (c.subcategories||[]).map(s => `<span class="bc-sub-chip">${s}</span>`).join('');
            html += `<div class="bc-cat-card">
                <div class="bc-cat-card-top">
                    <span class="bc-cat-icon">${c.icon || '🏷️'}</span>
                    <div class="bc-cat-card-actions">
                        <button class="bc-action-btn edit" onclick="showEditCategoryModal(${c.id})" title="Editar" ${!can('edit','categories') ? 'style="display:none"' : ''}><i class="bi bi-pencil"></i></button>
                        <button class="bc-action-btn delete" onclick="deleteCategory(${c.id})" title="Eliminar" ${!can('delete','categories') ? 'style="display:none"' : ''}><i class="bi bi-trash3"></i></button>
                    </div>
                </div>
                <div class="bc-cat-card-name">${c.name}</div>
                <div class="bc-cat-card-meta">${TYPE_LABELS[c.type] || c.type} · ${productCount} prod · ${brandCount} marcas</div>
                <div class="bc-cat-subs">${subHtml || '<span class="bc-sub-empty">Sin subcategorías</span>'}</div>
            </div>`;
        });
        html += `</div></div>`;
    });
    container.innerHTML = html;
}

// ============ BRANDS PANEL ============
function renderBrandsPanel() {
    const body = document.getElementById('bcBrandsBody');
    if (!body) return;
    const countEl = document.getElementById('bcBrandsCount');
    if (countEl) countEl.textContent = brands.length;
    if (brands.length === 0) {
        body.innerHTML = `<div class="bc-empty-state"><i class="bi bi-bookmark"></i><h4>Sin marcas</h4><p>Agrega marcas para organizar tus productos</p></div>`;
        return;
    }
    body.innerHTML = brands.map(b => {
        const catNames = (b.categoryIds||[]).map(cid => {
            const cat = categories.find(c => c.id === cid);
            return cat ? `<span class="bc-rel-badge cat">${cat.icon||''} ${cat.name}</span>` : '';
        }).join('');
        const sizeCount = (b.sizeIds||[]).length;
        const productCount = products.filter(p => p.brand === b.name).length;
        const sizeSystemLabel = b.sizeSystem === 'clothing' ? 'Ropa' : 'Zapato';
        return `<div class="bc-brand-item">
            <div class="bc-brand-info">
                <div class="bc-brand-name">${b.name}</div>
                <div class="bc-brand-meta">${sizeSystemLabel} · ${productCount} productos</div>
                <div class="bc-brand-rels">${catNames}${sizeCount > 0 ? `<span class="bc-rel-badge size">${sizeCount} tallas</span>` : ''}</div>
            </div>
            <div class="bc-brand-actions">
                <button class="bc-action-btn edit" onclick="showBrandModal(${b.id})" title="Editar" ${!can('edit','brands') ? 'style="display:none"' : ''}><i class="bi bi-pencil"></i></button>
                <button class="bc-action-btn delete" onclick="deleteBrand(${b.id})" title="Eliminar" ${!can('delete','brands') ? 'style="display:none"' : ''}><i class="bi bi-trash3"></i></button>
            </div>
        </div>`;
    }).join('');
}

// ============ SIZES PANEL ============
function renderSizesPanel() {
    const body = document.getElementById('bcSizesBody');
    if (!body) return;
    const countEl = document.getElementById('bcSizesCount');
    if (countEl) countEl.textContent = sizes.length;

    const shoeSizes = sizes.filter(s => s.system === 'shoe').sort((a,b) => parseFloat(a.value) - parseFloat(b.value));
    const clothingSizes = sizes.filter(s => s.system === 'clothing');
    const otherSizes = sizes.filter(s => s.system !== 'shoe' && s.system !== 'clothing');

    let html = '';
    if (shoeSizes.length > 0) {
        html += `<div class="bc-size-group"><div class="bc-size-group-title">Zapato</div><div class="bc-size-chips">${shoeSizes.map(s => renderSizeChip(s, 'shoe')).join('')}</div></div>`;
    }
    if (clothingSizes.length > 0) {
        html += `<div class="bc-size-group"><div class="bc-size-group-title">Ropa</div><div class="bc-size-chips">${clothingSizes.sort((a,b) => {
            const na = parseFloat(a.value.replace(/\D/g,'')) || 0;
            const nb = parseFloat(b.value.replace(/\D/g,'')) || 0;
            return na - nb;
        }).map(s => renderSizeChip(s, 'clothing')).join('')}</div></div>`;
    }
    if (otherSizes.length > 0) {
        html += `<div class="bc-size-group"><div class="bc-size-group-title">Otros</div><div class="bc-size-chips">${otherSizes.map(s => renderSizeChip(s, s.system)).join('')}</div></div>`;
    }
    if (sizes.length === 0) {
        html = `<div class="bc-empty-state"><i class="bi bi-rulers"></i><h4>Sin tallas</h4><p>Agrega tallas para asignarlas a marcas</p></div>`;
    }
    body.innerHTML = html;
}

function renderSizeChip(s, cssClass) {
    const linked = brands.filter(b => (b.sizeIds||[]).includes(s.id)).length;
    return `<div class="bc-size-chip ${cssClass}" title="${linked} marca(s)">${s.label}${linked > 0 ? `<span class="bc-size-linked">${linked}</span>` : ''}<button class="bc-size-remove" onclick="deleteSize(${s.id})" ${!can('delete','sizes') ? 'style="display:none"' : ''}>&times;</button></div>`;
}

// ============ CATEGORY MODALS ============
function showAddCategoryModal(department) {
    const html = `
        <div style="text-align:center;margin-bottom:20px;">
            <div class="bc-modal-icon category"><i class="bi bi-plus-circle"></i></div>
            <div class="bc-modal-title">Nueva Categoría</div>
            <div class="bc-modal-subtitle">En sección: ${DEPT_LABELS[department] || department}</div>
        </div>
        <div class="bc-modal-input-group">
            <label>Nombre</label>
            <input type="text" class="form-input" id="bcCatName" placeholder="Ej: Playeras, Zapatos..." maxlength="50">
        </div>
        <div class="bc-modal-input-group">
            <label>Tipo</label>
            <select class="form-select" id="bcCatType">
                <option value="prenda">👕 Prenda</option>
                <option value="calzado">👟 Calzado</option>
                <option value="accesorio">🎒 Accesorio</option>
            </select>
        </div>
        <div class="bc-modal-input-group">
            <label>Icono (emoji)</label>
            <input type="text" class="form-input" id="bcCatIcon" value="🏷️" maxlength="4" style="width:80px;text-align:center;">
        </div>
        <div class="bc-modal-input-group">
            <label>Subcategorías (una por línea)</label>
            <textarea class="form-input" id="bcCatSubs" placeholder="Lisas&#10;Estampadas&#10;Polo" rows="4" style="resize:vertical;"></textarea>
        </div>
        <div class="bc-modal-actions">
            <button class="btn btn-secondary" onclick="hideModal('brandCatModal')">Cancelar</button>
            <button class="btn btn-primary" onclick="saveCategory('${department}')"><i class="bi bi-plus-lg"></i> Crear</button>
        </div>
    `;
    document.getElementById('brandCatModalTitle').textContent = 'Nueva Categoría';
    document.getElementById('brandCatModalBody').innerHTML = html;
    showModal('brandCatModal');
    setTimeout(() => { const inp = document.getElementById('bcCatName'); if (inp) inp.focus(); }, 150);
}

function showEditCategoryModal(catId) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const subs = (cat.subcategories || []).join('\n');
    const html = `
        <div style="text-align:center;margin-bottom:20px;">
            <div class="bc-modal-icon category"><i class="bi bi-pencil"></i></div>
            <div class="bc-modal-title">Editar Categoría</div>
        </div>
        <div class="bc-modal-input-group">
            <label>Nombre</label>
            <input type="text" class="form-input" id="bcCatName" value="${cat.name}" maxlength="50">
        </div>
        <div class="bc-modal-input-group">
            <label>Tipo</label>
            <select class="form-select" id="bcCatType">
                <option value="prenda" ${cat.type==='prenda'?'selected':''}>👕 Prenda</option>
                <option value="calzado" ${cat.type==='calzado'?'selected':''}>👟 Calzado</option>
                <option value="accesorio" ${cat.type==='accesorio'?'selected':''}>🎒 Accesorio</option>
            </select>
        </div>
        <div class="bc-modal-input-group">
            <label>Departamento</label>
            <select class="form-select" id="bcCatDept">
                <option value="hombre" ${cat.department==='hombre'?'selected':''}>👨 Hombre</option>
                <option value="mujer" ${cat.department==='mujer'?'selected':''}>👩 Mujer</option>
                <option value="niño" ${cat.department==='niño'?'selected':''}>👧 Niño</option>
                <option value="unisex" ${cat.department==='unisex'?'selected':''}>🌍 Unisex</option>
            </select>
        </div>
        <div class="bc-modal-input-group">
            <label>Icono (emoji)</label>
            <input type="text" class="form-input" id="bcCatIcon" value="${cat.icon || '🏷️'}" maxlength="4" style="width:80px;text-align:center;">
        </div>
        <div class="bc-modal-input-group">
            <label>Subcategorías (una por línea)</label>
            <textarea class="form-input" id="bcCatSubs" rows="4" style="resize:vertical;">${subs}</textarea>
        </div>
        <div class="bc-modal-actions">
            <button class="btn btn-secondary" onclick="hideModal('brandCatModal')">Cancelar</button>
            <button class="btn btn-primary" onclick="updateCategory(${catId})"><i class="bi bi-check-lg"></i> Guardar</button>
        </div>
    `;
    document.getElementById('brandCatModalTitle').textContent = 'Editar Categoría';
    document.getElementById('brandCatModalBody').innerHTML = html;
    showModal('brandCatModal');
    setTimeout(() => { const inp = document.getElementById('bcCatName'); if (inp) { inp.focus(); inp.select(); } }, 150);
}

async function saveCategory(department) {
    const name = (document.getElementById('bcCatName')?.value || '').trim();
    if (!name) { showToast('Ingresa un nombre', 'error'); return; }
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) { showToast('Ya existe una categoría con ese nombre', 'error'); return; }
    const type = document.getElementById('bcCatType')?.value || 'prenda';
    const icon = document.getElementById('bcCatIcon')?.value || '🏷️';
    const subsRaw = (document.getElementById('bcCatSubs')?.value || '').trim();
    const subcategories = subsRaw ? subsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
    const newId = categories.length > 0 ? Math.max(...categories.map(c => c.id || 0)) + 1 : 1;
    const maxOrder = categories.reduce((max, c) => Math.max(max, c.sortOrder || 0), 0);
    categories.push({ id: newId, name, type, department, icon, subcategories, sortOrder: maxOrder + 1, active: true });
    await saveCategories();
    hideModal('brandCatModal');
    populateBrandCategoryDropdowns();
    renderBrandsCategories();
    showToast('Categoría creada', 'success');
}

async function updateCategory(catId) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const name = (document.getElementById('bcCatName')?.value || '').trim();
    if (!name) { showToast('Ingresa un nombre', 'error'); return; }
    if (categories.some(c => c.id !== catId && c.name.toLowerCase() === name.toLowerCase())) { showToast('Ya existe ese nombre', 'error'); return; }
    cat.name = name;
    cat.type = document.getElementById('bcCatType')?.value || cat.type;
    cat.department = document.getElementById('bcCatDept')?.value || cat.department;
    cat.icon = document.getElementById('bcCatIcon')?.value || cat.icon;
    const subsRaw = (document.getElementById('bcCatSubs')?.value || '').trim();
    cat.subcategories = subsRaw ? subsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
    await saveCategories();
    hideModal('brandCatModal');
    populateBrandCategoryDropdowns();
    renderBrandsCategories();
    showToast('Categoría actualizada', 'success');
}

async function deleteCategory(catId) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const productCount = products.filter(p => p.category === cat.name).length;
    const html = `
        <div style="text-align:center;">
            <div class="bc-modal-icon danger"><i class="bi bi-trash3"></i></div>
            <div class="bc-modal-title">Eliminar Categoría</div>
            <div class="bc-modal-subtitle">¿Eliminar "<strong>${cat.name}</strong>"?${productCount > 0 ? ` ${productCount} producto(s) usarán esta categoría.` : ''}</div>
        </div>
        <div class="bc-modal-actions" style="justify-content:center;">
            <button class="btn btn-secondary" onclick="hideModal('brandCatModal')">Cancelar</button>
            <button class="btn btn-danger" onclick="confirmDeleteCategory(${catId})"><i class="bi bi-trash3"></i> Eliminar</button>
        </div>
    `;
    document.getElementById('brandCatModalTitle').textContent = 'Eliminar Categoría';
    document.getElementById('brandCatModalBody').innerHTML = html;
    showModal('brandCatModal');
}

async function confirmDeleteCategory(catId) {
    try {
        await apiDelete('categories', catId);
    } catch (e) {
        console.warn('apiDelete categories failed, saving array:', e);
        categories = categories.filter(c => c.id !== catId);
        await saveCategories();
    }
    categories = categories.filter(c => c.id !== catId);
    hideModal('brandCatModal');
    populateBrandCategoryDropdowns();
    renderBrandsCategories();
    showToast('Categoría eliminada', 'success');
}

// ============ BRAND MODALS ============
function showBrandModal(brandId) {
    const isEdit = brandId !== null;
    const brand = isEdit ? brands.find(b => b.id === brandId) : null;
    const title = isEdit ? 'Editar Marca' : 'Nueva Marca';
    const name = brand ? brand.name : '';
    const selCats = brand ? (brand.categoryIds || []) : [];
    const selSizes = brand ? (brand.sizeIds || []) : [];
    const sizeSystem = brand ? (brand.sizeSystem || 'shoe') : 'shoe';

    const catCheckboxes = categories.filter(c => c.active !== false).map(c => {
        const checked = selCats.includes(c.id) ? 'checked' : '';
        return `<label class="bc-check-item">
            <input type="checkbox" value="${c.id}" ${checked} class="bc-cat-check">
            <span class="bc-check-box"></span>
            <span>${c.icon||'🏷️'} ${c.name}</span>
        </label>`;
    }).join('');

    const filteredSizes = sizes.filter(s => s.system === sizeSystem);
    const sizeCheckboxes = filteredSizes.map(s => {
        const checked = selSizes.includes(s.id) ? 'checked' : '';
        return `<label class="bc-check-item">
            <input type="checkbox" value="${s.id}" ${checked} class="bc-size-check">
            <span class="bc-check-box"></span>
            <span>${s.label}</span>
        </label>`;
    }).join('');

    const html = `
        <div style="text-align:center;margin-bottom:20px;">
            <div class="bc-modal-icon brand"><i class="bi bi-bookmark-plus"></i></div>
            <div class="bc-modal-title">${title}</div>
        </div>
        <div class="bc-modal-input-group" style="margin-bottom:20px;">
            <label>Nombre de la marca</label>
            <input type="text" class="form-input" id="brandCatNameInput" value="${name}" placeholder="Ej: Nike, Adidas..." maxlength="50">
        </div>
        <div class="bc-modal-input-group" style="margin-bottom:20px;">
            <label>Sistema de tallas</label>
            <select class="form-select" id="bcBrandSizeSystem" onchange="onBrandSizeSystemChange(${brandId || 'null'})">
                <option value="shoe" ${sizeSystem==='shoe'?'selected':''}>👟 Zapato (36-43)</option>
                <option value="clothing" ${sizeSystem==='clothing'?'selected':''}>👕 Ropa (XS-XXXL)</option>
            </select>
        </div>
        <div class="bc-modal-section">
            <div class="bc-modal-section-header">
                <i class="bi bi-tag-fill" style="color:#6366f1;"></i>
                <span>Categorías asociadas</span>
                <span class="bc-check-count" id="catCheckCount">${selCats.length}</span>
            </div>
            <div class="bc-check-list" id="catCheckList">
                ${catCheckboxes || '<div class="bc-empty" style="padding:12px;"><i class="bi bi-inbox"></i> No hay categorías creadas</div>'}
            </div>
        </div>
        <div class="bc-modal-section">
            <div class="bc-modal-section-header">
                <i class="bi bi-rulers" style="color:#10b981;"></i>
                <span>Tallas disponibles</span>
                <span class="bc-check-count" id="sizeCheckCount">${selSizes.length}</span>
            </div>
            <div class="bc-check-list" id="sizeCheckList">
                ${sizeCheckboxes || '<div class="bc-empty" style="padding:12px;"><i class="bi bi-inbox"></i> No hay tallas para este sistema</div>'}
            </div>
        </div>
        <div class="bc-modal-actions">
            <button class="btn btn-secondary" onclick="hideModal('brandCatModal')">Cancelar</button>
            <button class="btn btn-primary" onclick="saveBrandModal(${brandId || 'null'})"><i class="bi bi-check-lg"></i> ${isEdit ? 'Guardar' : 'Crear Marca'}</button>
        </div>
    `;
    document.getElementById('brandCatModalTitle').textContent = title;
    document.getElementById('brandCatModalBody').innerHTML = html;

    document.querySelectorAll('.bc-cat-check, .bc-size-check').forEach(cb => {
        cb.addEventListener('change', updateBrandCheckCounts);
    });

    showModal('brandCatModal');
    setTimeout(() => { const inp = document.getElementById('brandCatNameInput'); if (inp) inp.focus(); }, 150);
}

function onBrandSizeSystemChange(brandId) {
    const sizeSystem = document.getElementById('bcBrandSizeSystem')?.value || 'shoe';
    const filteredSizes = sizes.filter(s => s.system === sizeSystem);
    const list = document.getElementById('sizeCheckList');
    if (!list) return;
    list.innerHTML = filteredSizes.map(s => {
        return `<label class="bc-check-item">
            <input type="checkbox" value="${s.id}" class="bc-size-check">
            <span class="bc-check-box"></span>
            <span>${s.label}</span>
        </label>`;
    }).join('') || '<div class="bc-empty" style="padding:12px;"><i class="bi bi-inbox"></i> No hay tallas para este sistema</div>';
    list.querySelectorAll('.bc-size-check').forEach(cb => {
        cb.addEventListener('change', updateBrandCheckCounts);
    });
    updateBrandCheckCounts();
}

function updateBrandCheckCounts() {
    const catCount = document.querySelectorAll('.bc-cat-check:checked').length;
    const sizeCount = document.querySelectorAll('.bc-size-check:checked').length;
    const catEl = document.getElementById('catCheckCount');
    const sizeEl = document.getElementById('sizeCheckCount');
    if (catEl) catEl.textContent = catCount;
    if (sizeEl) sizeEl.textContent = sizeCount;
}

async function saveBrandModal(brandId) {
    const name = (document.getElementById('brandCatNameInput')?.value || '').trim();
    if (!name) { showToast('Ingresa un nombre', 'error'); return; }
    const categoryIds = Array.from(document.querySelectorAll('.bc-cat-check:checked')).map(cb => parseInt(cb.value));
    const sizeIds = Array.from(document.querySelectorAll('.bc-size-check:checked')).map(cb => parseInt(cb.value));
    const sizeSystem = document.getElementById('bcBrandSizeSystem')?.value || 'shoe';

    if (brandId) {
        const brand = brands.find(b => b.id === brandId);
        if (brand) {
            if (brands.some(b => b.id !== brandId && b.name.toLowerCase() === name.toLowerCase())) {
                showToast('Ya existe una marca con ese nombre', 'error'); return;
            }
            brand.name = name;
            brand.categoryIds = categoryIds;
            brand.sizeIds = sizeIds;
            brand.sizeSystem = sizeSystem;
        }
    } else {
        if (brands.some(b => b.name.toLowerCase() === name.toLowerCase())) {
            showToast('Ya existe una marca con ese nombre', 'error'); return;
        }
        const newId = brands.length > 0 ? Math.max(...brands.map(b => b.id || 0)) + 1 : 1;
        brands.push({ id: newId, name, categoryIds, sizeIds, sizeSystem });
    }
    await saveBrands();
    hideModal('brandCatModal');
    populateBrandCategoryDropdowns();
    renderBrandsCategories();
    showToast(brandId ? 'Marca actualizada' : 'Marca creada', 'success');
}

async function deleteBrand(brandId) {
    const brand = brands.find(b => b.id === brandId);
    if (!brand) return;
    const productCount = products.filter(p => p.brand === brand.name).length;
    const html = `
        <div style="text-align:center;">
            <div class="bc-modal-icon danger"><i class="bi bi-trash3"></i></div>
            <div class="bc-modal-title">Eliminar Marca</div>
            <div class="bc-modal-subtitle">¿Eliminar "<strong>${brand.name}</strong>"?${productCount > 0 ? ` ${productCount} producto(s) usarán esta marca.` : ''}</div>
        </div>
        <div class="bc-modal-actions" style="justify-content:center;">
            <button class="btn btn-secondary" onclick="hideModal('brandCatModal')">Cancelar</button>
            <button class="btn btn-danger" onclick="confirmDeleteBrand(${brandId})"><i class="bi bi-trash3"></i> Eliminar</button>
        </div>
    `;
    document.getElementById('brandCatModalTitle').textContent = 'Eliminar Marca';
    document.getElementById('brandCatModalBody').innerHTML = html;
    showModal('brandCatModal');
}

async function confirmDeleteBrand(brandId) {
    try {
        await apiDelete('brands', brandId);
    } catch (e) {
        console.warn('apiDelete brands failed, saving array:', e);
        brands = brands.filter(b => b.id !== brandId);
        await saveBrands();
    }
    brands = brands.filter(b => b.id !== brandId);
    hideModal('brandCatModal');
    populateBrandCategoryDropdowns();
    renderBrandsCategories();
    showToast('Marca eliminada', 'success');
}

// ============ SIZE MODALS ============
function showAddSizeModal() {
    const html = `
        <div style="text-align:center;margin-bottom:20px;">
            <div class="bc-modal-icon" style="background:rgba(16,185,129,0.12);color:#10b981;"><i class="bi bi-rulers"></i></div>
            <div class="bc-modal-title">Nueva Talla</div>
        </div>
        <div class="bc-modal-input-group">
            <label>Valor de la talla</label>
            <input type="text" class="form-input" id="sizeNameInput" placeholder="Ej: 36, M, XL, 32..." maxlength="10">
        </div>
        <div class="bc-modal-input-group">
            <label>Grupo</label>
            <select class="form-select" id="sizeSystemInput">
                <option value="shoe">Zapato</option>
                <option value="clothing_shirt">Camisa / Playera</option>
                <option value="clothing_men_pants">Pantalón Hombre</option>
                <option value="clothing_women_pants">Pantalón Mujer</option>
            </select>
        </div>
        <div class="bc-modal-actions">
            <button class="btn btn-secondary" onclick="hideModal('brandCatModal')">Cancelar</button>
            <button class="btn btn-primary" onclick="addSize()"><i class="bi bi-plus-lg"></i> Agregar</button>
        </div>
    `;
    document.getElementById('brandCatModalTitle').textContent = 'Nueva Talla';
    document.getElementById('brandCatModalBody').innerHTML = html;
    showModal('brandCatModal');
    setTimeout(() => { const inp = document.getElementById('sizeNameInput'); if (inp) inp.focus(); }, 150);
}

async function addSize() {
    const value = (document.getElementById('sizeNameInput')?.value || '').trim();
    if (!value) { showToast('Ingresa un valor de talla', 'error'); return; }
    const group = document.getElementById('sizeSystemInput')?.value || 'shoe';
    const system = group === 'shoe' ? 'shoe' : 'clothing';
    if (sizes.some(s => s.value.toLowerCase() === value.toLowerCase() && s.system === system)) {
        showToast('Ya existe esa talla en este sistema', 'error'); return;
    }
    const newId = sizes.length > 0 ? Math.max(...sizes.map(s => s.id || 0)) + 1 : 1;
    sizes.push({ id: newId, value, label: value, system });
    await saveSizes();
    hideModal('brandCatModal');
    renderBrandsCategories();
    showToast('Talla agregada', 'success');
}

async function deleteSize(sizeId) {
    const size = sizes.find(s => s.id === sizeId);
    if (!size) return;
    const linkedBrands = brands.filter(b => (b.sizeIds || []).includes(sizeId));
    const html = `
        <div style="text-align:center;">
            <div class="bc-modal-icon danger"><i class="bi bi-trash3"></i></div>
            <div class="bc-modal-title">Eliminar Talla</div>
            <div class="bc-modal-subtitle">¿Eliminar talla "<strong>${size.label}</strong>"?${linkedBrands.length > 0 ? ` Se desasociará de ${linkedBrands.length} marca(s).` : ''}</div>
        </div>
        <div class="bc-modal-actions" style="justify-content:center;">
            <button class="btn btn-secondary" onclick="hideModal('brandCatModal')">Cancelar</button>
            <button class="btn btn-danger" onclick="confirmDeleteSize(${sizeId})"><i class="bi bi-trash3"></i> Eliminar</button>
        </div>
    `;
    document.getElementById('brandCatModalTitle').textContent = 'Eliminar Talla';
    document.getElementById('brandCatModalBody').innerHTML = html;
    showModal('brandCatModal');
}

async function confirmDeleteSize(sizeId) {
    sizes = sizes.filter(s => s.id !== sizeId);
    brands.forEach(b => { b.sizeIds = (b.sizeIds || []).filter(sid => sid !== sizeId); });
    try {
        await apiDelete('sizes', sizeId);
    } catch (e) {
        console.warn('apiDelete sizes failed, saving array:', e);
        await saveSizes();
    }
    try {
        await saveBrands();
    } catch (e) {
        console.warn('saveBrands after size delete failed:', e);
    }
    hideModal('brandCatModal');
    renderBrandsCategories();
    showToast('Talla eliminada', 'success');
}
