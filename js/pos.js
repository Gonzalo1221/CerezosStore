// ============ POS ============
function renderPosProducts() {
    const search = (document.getElementById('posSearch')?.value || '').toLowerCase();
    const catFilter = document.getElementById('posCategoryFilter')?.value || '';
    
    let filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || (p.sku||'').toLowerCase().includes(search) || p.brand.toLowerCase().includes(search);
        const matchCat = !catFilter || p.category === catFilter;
        return matchSearch && matchCat;
    });

    const grid = document.getElementById('posProductsGrid');
    grid.innerHTML = filtered.map(p => {
        const total = getTotalStock(p);
        const canSell = total > 0 || p.sellWithoutStock;
        const sizeCount = (p.sizeIds || []).filter(sid => getStockForSize(p, sid) > 0 || p.sellWithoutStock).length;
        const sizeLabels = (p.sizeIds || []).map(sid => getSizeLabel(sid)).join(', ');
        const singleSize = p.sizeIds && p.sizeIds.length === 1;
        const clickAction = !canSell ? '' : (singleSize ? `addToCartBySize(${p.id}, ${p.sizeIds[0]})` : `showSizePicker(${p.id})`);
        return `
        <div class="pos-product-card ${!canSell ? 'pos-out-of-stock' : ''}" onclick="${clickAction}" style="${!canSell ? 'opacity:0.55;cursor:default;' : ''}">
            ${total === 0 ? '<div class="pos-stock-badge">AGOTADO</div>' : ''}
            <div class="pos-thumb">${getCategoryIcon(p.category)}</div>
            <h4>${p.name}</h4>
            <div class="pos-price">$${p.price.toLocaleString()}</div>
            <div class="pos-sku">${p.brand} ${sizeLabels ? '· Tallas: ' + sizeLabels : ''}</div>
            ${canSell ? `<div class="pos-sku" style="color:var(--success);margin-top:2px;">${sizeCount} tallas disponibles</div>` : ''}
        </div>`;
    }).join('') || '<div class="empty-state" style="grid-column:1/-1;"><i class="bi bi-search"></i><h3>No se encontraron productos</h3></div>';
    
    window._posFiltered = filtered;
}

function filterPosProducts() { renderPosProducts(); }

let _pickerProduct = null;
let _pickerSizes = [];
let _pickerQty = 1;
let _pickerSelectedSizeId = null;

function showSizePicker(productId) {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    _pickerProduct = p;
    _pickerSelectedSizeId = null;
    _pickerQty = 1;
    document.getElementById('sizePickerTitle').textContent = p.name;
    const grid = document.getElementById('sizePickerGrid');
    grid.innerHTML = (p.sizeIds || []).map(sid => {
        const stock = getStockForSize(p, sid);
        const label = getSizeLabel(sid);
        const out = stock === 0 && !p.sellWithoutStock;
        return `
            <div class="pos-product-card ${out ? 'pos-out-of-stock' : ''}" onclick="${out ? '' : `selectPickerSize(${sid})`}" id="pickerSize-${sid}" style="padding:12px 8px;cursor:${out ? 'default' : 'pointer'};${out ? 'opacity:0.55;' : ''}border:2px solid transparent;">
                ${out ? '<div class="pos-stock-badge">AGOTADO</div>' : ''}
                <div style="font-size:24px;font-weight:800;color:var(--primary);">${label}</div>
                <div style="font-size:10px;color:var(--gray);margin-top:4px;">${stock} uds</div>
            </div>`;
    }).join('');
    document.getElementById('sizePickerQty').style.display = 'none';
    showModal('sizePickerModal');
}

function selectPickerSize(sizeId) {
    _pickerSelectedSizeId = sizeId;
    _pickerQty = 1;
    document.querySelectorAll('#sizePickerGrid .pos-product-card').forEach(el => el.style.borderColor = 'transparent');
    const el = document.getElementById('pickerSize-' + sizeId);
    if (el) el.style.borderColor = 'var(--primary)';
    const label = getSizeLabel(sizeId);
    document.getElementById('sizePickerSelected').textContent = 'Talla ' + label + ' · $' + _pickerProduct.price.toLocaleString();
    document.getElementById('sizePickerQtyVal').textContent = '1';
    document.getElementById('sizePickerQty').style.display = 'block';
}

function sizePickerQty(delta) {
    _pickerQty = Math.max(1, _pickerQty + delta);
    if (_pickerProduct && !_pickerProduct.sellWithoutStock) {
        _pickerQty = Math.min(_pickerQty, getStockForSize(_pickerProduct, _pickerSelectedSizeId));
    }
    document.getElementById('sizePickerQtyVal').textContent = _pickerQty;
}

function sizePickerAdd() {
    if (!_pickerSelectedSizeId || !_pickerProduct) return;
    const p = _pickerProduct;
    const stock = getStockForSize(p, _pickerSelectedSizeId);
    const label = getSizeLabel(_pickerSelectedSizeId);
    for (let i = 0; i < _pickerQty; i++) {
        const key = p.id + '-' + _pickerSelectedSizeId;
        const existing = cart.find(c => c.key === key);
        if (existing) {
            if (!p.sellWithoutStock && existing.qty >= stock) break;
            existing.qty++;
        } else {
            cart.push({ key, productId: p.id, sizeId: _pickerSelectedSizeId, name: p.name, price: p.price, sku: p.sku, qty: 1, icon: getCategoryIcon(p.category), size: label });
        }
    }
    renderCart();
    renderPosProducts();
    hideModal('sizePickerModal');
    showToast(_pickerQty + 'x ' + p.name + ' (Talla ' + label + ') agregado', 'success');
}

function addToCartBySize(productId, sizeId) {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    const stock = getStockForSize(p, sizeId);
    if (stock === 0 && !p.sellWithoutStock) return;
    const key = p.id + '-' + sizeId;
    const existing = cart.find(c => c.key === key);
    if (existing) {
        if (!p.sellWithoutStock && existing.qty >= stock) { showToast('No hay suficiente stock', 'error'); return; }
        existing.qty++;
    } else {
        const label = getSizeLabel(sizeId);
        cart.push({ key, productId: p.id, sizeId, name: p.name, price: p.price, sku: p.sku, qty: 1, icon: getCategoryIcon(p.category), size: label });
    }
    renderCart();
    renderPosProducts();
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || (getTotalStock(product) === 0 && !product.sellWithoutStock)) return;
    if (product.sizeIds && product.sizeIds.length > 1) { showSizePicker(productId); return; }
    if (product.sizeIds && product.sizeIds.length === 1) { addToCartBySize(productId, product.sizeIds[0]); return; }
}

function updateCartQty(key, delta) {
    const item = cart.find(c => c.key === key);
    if (!item) return;
    const p = products.find(pr => pr.id === item.productId);
    item.qty += delta;
    if (item.qty <= 0) { cart = cart.filter(c => c.key !== key); }
    else if (p && !p.sellWithoutStock && item.qty > getStockForSize(p, item.sizeId)) { item.qty = getStockForSize(p, item.sizeId); showToast('Stock máximo alcanzado', 'error'); }
    renderCart();
}

function removeFromCart(key) {
    cart = cart.filter(c => c.key !== key);
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
                <small>${c.sku}${c.size ? ' · ' + c.size : ''}</small>
            </div>
            <div class="qty-control">
                <button class="qty-btn" onclick="updateCartQty('${c.key}', -1)">−</button>
                <span class="qty-val">${c.qty}</span>
                <button class="qty-btn" onclick="updateCartQty('${c.key}', 1)">+</button>
            </div>
            <span class="ci-price">$${(c.price * c.qty).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
            <button class="ci-remove" onclick="removeFromCart('${c.key}')"><i class="bi bi-x"></i></button>
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
        const product = products.find(p => p.id === item.productId);
        if (product && item.sizeId) {
            setStockForSize(product, item.sizeId, getStockForSize(product, item.sizeId) + item.qty);
        }
    });
    
    // Rebuild cart from sale items
    cart = [];
    (sale.items || []).forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            const label = item.size || getSizeLabel(item.sizeId);
            cart.push({ key: item.productId + '-' + item.sizeId, productId: item.productId, sizeId: item.sizeId, name: item.name, price: item.price, sku: item.sku || product.sku, qty: item.qty, icon: getCategoryIcon(product.category), size: label });
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
    
    // Restore manual total if the sale had one
    if (sale.manualTotal) {
        manualTotalOverride = sale.manualTotal;
    }
    
    if (sale.creditType === 'credito') {
        toggleCreditOptions();
        document.getElementById('creditDownPayment').value = sale.downPayment || 0;
        document.getElementById('creditInstallments').value = sale.creditInstallments || 1;
        updateCreditInfo();
    }
    
    document.getElementById('confirmSaleBtn').innerHTML = '<i class="bi bi-check-lg"></i> Actualizar Venta';
    document.querySelector('#checkoutModal .modal-header h3').innerHTML = '✏️ Editar Venta #' + sale.id;
    document.getElementById('checkoutClient').disabled = true;
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
            const product = products.find(p => p.id === item.productId);
            if (product && item.sizeId) {
                setStockForSize(product, item.sizeId, Math.max(0, getStockForSize(product, item.sizeId) - item.qty));
            }
        });
        renderPosProducts();
        cart = [];
        renderCart();
        editingSaleId = null;
        editingSaleBackup = null;
        document.querySelector('#checkoutModal .modal-header h3').innerHTML = '✅ Confirmar Venta';
        document.getElementById('confirmSaleBtn').innerHTML = '<i class="bi bi-check-lg"></i> Confirmar Venta';
        document.getElementById('checkoutClient').value = '';
        document.getElementById('checkoutClient').disabled = false;
        document.getElementById('checkoutNotes').value = '';
        document.getElementById('manualTotalInput').value = '';
        document.getElementById('editTotalRow').style.display = 'none';
        document.getElementById('creditDownPayment').value = '';
        document.getElementById('creditInstallments').value = '1';
        document.querySelector('input[name="payMethod"][value="Efectivo"]').checked = true;
        document.getElementById('creditOptions').style.display = 'none';
        document.getElementById('clientCreditInfo').style.display = 'none';
        document.getElementById('creditRemaining').textContent = '$0';
        document.getElementById('creditInterestAmount').textContent = '$0';
        document.getElementById('creditInstallmentValue').textContent = '$0';
        manualTotalOverride = null;
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
    let manualTotal = null;
    
    if (payMethod === 'Crédito' && client) {
        creditType = 'credito';
        downPayment = parseFloat(document.getElementById('creditDownPayment').value) || 0;
        creditInstallments = parseInt(document.getElementById('creditInstallments').value) || 1;
        const wasManuallySet = manualTotalOverride !== null;
        if (wasManuallySet) {
            manualTotal = manualTotalOverride;
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
        items: cart.map(c => ({ productId: c.productId, sizeId: c.sizeId || null, name: c.name, size: c.size || '', sku: c.sku || '', qty: c.qty, price: c.price })),
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
        creditInstallmentValue,
        manualTotal
    };

    // Update stock
    cart.forEach(c => {
        const product = products.find(p => p.id === c.productId);
        if (product && c.sizeId) {
            setStockForSize(product, c.sizeId, getStockForSize(product, c.sizeId) - c.qty);
        }
    });
    
    if (isEditing) {
        const idx = sales.findIndex(s => s.id === editingSaleId);
        if (idx !== -1) sales[idx] = sale;
    } else {
        sales.push(sale);
    }
    saveSales();
    saveProducts().catch(e => console.warn('saveProducts:', e));

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
    document.querySelector('#checkoutModal .modal-header h3').innerHTML = '✅ Confirmar Venta';
    document.getElementById('checkoutClient').value = '';
    document.getElementById('checkoutClient').disabled = false;
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
        items: cart.map(c => ({ productId: c.productId, sizeId: c.sizeId || null, name: c.name, size: c.size || '', sku: c.sku || '', qty: c.qty, price: c.price })),
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
    const itemsHtml = (quote.items || []).map(i => {
        const sizeLabel = i.size ? ' <span style="color:var(--gray);font-size:9px;">' + i.size + '</span>' : '';
        return `<tr><td style="padding:2px 0;">${i.name}${sizeLabel}</td><td style="text-align:right;">${i.qty}x</td><td style="text-align:right;">$${(i.price * i.qty).toLocaleString('es-MX', {minimumFractionDigits:0,maximumFractionDigits:0})}</td></tr>`;
    }).join('');
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
        const product = products.find(p => p.id === item.productId);
        if (product && (getTotalStock(product) > 0 || product.sellWithoutStock)) {
            const stock = item.sizeId ? getStockForSize(product, item.sizeId) : getTotalStock(product);
            const qty = Math.min(item.qty, product.sellWithoutStock ? item.qty : stock);
            const label = item.size || (item.sizeId ? getSizeLabel(item.sizeId) : '');
            cart.push({ key: item.productId + '-' + (item.sizeId || 0), productId: item.productId, sizeId: item.sizeId || null, name: item.name, price: item.price, sku: item.sku || product.sku, qty, icon: getCategoryIcon(product.category), size: label });
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
        const itemsSummary = q.items.map(i => `${i.qty}x ${i.name}${i.size ? ' [' + i.size + ']' : ''}`).join(', ');
        const totalFmt = (v) => '$' + v.toLocaleString('es-MX', {minimumFractionDigits:0,maximumFractionDigits:0});
        const statusBadge = `<span class="status-badge ${q.status === 'Vigente' ? 'pending' : 'inactive'}">${q.status}</span>`;
        const actionsBtns = `<div class="actions-cell"><button class="action-btn view" onclick="viewQuote(${q.id})" title="Ver"><i class="bi bi-eye"></i></button>${can('edit','quotes') ? `<button class="action-btn edit" onclick="convertQuoteToSale(${q.id})" title="Convertir en Venta"><i class="bi bi-cart4"></i></button>` : ''}<button class="action-btn print" onclick="printQuote(${q.id})" title="Imprimir"><i class="bi bi-printer"></i></button>${can('delete','quotes') ? `<button class="action-btn delete" onclick="deleteQuote(${q.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}</div>`;
        return `
            <tr class="tr-desktop">
                <td><span style="font-weight:600;color:var(--info);">${q.folio}</span></td>
                <td>${q.date}</td>
                <td>${q.client}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${itemsSummary}">${itemsSummary}</td>
                <td style="font-weight:700;">${totalFmt(q.total)}</td>
                <td>${statusBadge}</td>
                <td>${actionsBtns}</td>
            </tr>
            <tr class="tr-compact">
                <td><div class="td-stack"><span style="font-weight:600;color:var(--info);">${q.folio}</span><span class="td-secondary">${q.date}</span></div></td>
                <td>${q.client}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${itemsSummary}">${itemsSummary}</td>
                <td style="font-weight:700;">${totalFmt(q.total)}</td>
                <td>${statusBadge}</td>
                <td>${actionsBtns}</td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="7"><div class="empty-state"><i class="bi bi-file-text"></i><h3>No hay cotizaciones</h3><p>Crea cotizaciones desde el Punto de Venta</p></div></td></tr>';

    const mobileEl = document.getElementById('quotesMobileCards');
    if (mobileEl) {
        mobileEl.innerHTML = pageItems.map(q => {
            const itemsSummary = q.items.map(i => `${i.qty}x ${i.name}${i.size ? ' [' + i.size + ']' : ''}`).join(', ');
            const actions = [];
            actions.push({ icon: 'bi-eye', class: 'view', label: 'Ver', onclick: `viewQuote(${q.id})` });
            if (can('edit','quotes')) actions.push({ icon: 'bi-cart4', class: 'convert', label: 'Convertir en Venta', onclick: `convertQuoteToSale(${q.id})` });
            actions.push({ icon: 'bi-printer', class: 'print', label: 'Imprimir', onclick: `printQuote(${q.id})` });
            if (can('delete','quotes')) actions.push({ icon: 'bi-trash3', class: 'delete danger', label: 'Eliminar', onclick: `deleteQuote(${q.id})` });
            return `
            <div class="mobile-card">
                <div class="mobile-card-header">
                    <div>
                        <div class="mobile-card-id" style="color:var(--info);">${q.folio}</div>
                        <div class="mobile-card-sub">${q.date}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span class="status-badge ${q.status === 'Vigente' ? 'pending' : 'inactive'}">${q.status}</span>
                        ${buildMobileActionsBtn('q-' + q.id, actions)}
                    </div>
                </div>
                <div class="mobile-card-body">
                    <div class="mobile-card-row">
                        <i class="bi bi-person"></i>
                        <span class="mc-value">${q.client}</span>
                    </div>
                    <div class="mobile-card-row">
                        <i class="bi bi-bag"></i>
                        <span class="mc-value truncate">${itemsSummary}</span>
                    </div>
                </div>
                <div class="mobile-card-footer">
                    <div class="mobile-card-total">$${q.total.toLocaleString('es-MX', {minimumFractionDigits:0,maximumFractionDigits:0})}</div>
                </div>
            </div>`;
        }).join('') || '<div class="empty-state" style="padding:30px;text-align:center;color:var(--gray);"><i class="bi bi-file-text"></i><h3>No hay cotizaciones</h3></div>';
    }
    
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
