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

    const mobileEl = document.getElementById('clientsMobileCards');
    if (mobileEl) {
        mobileEl.innerHTML = filtered.map(c => {
            const isUnlimited = c.creditLimit === 0;
            const creditEnabled = c.creditEnabled !== false;
            const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2);
            const actions = [];
            if (can('edit','clients')) actions.push({ icon: 'bi-pencil', class: 'edit', label: 'Editar', onclick: `editClient(${c.id})` });
            if (can('delete','clients')) actions.push({ icon: 'bi-trash3', class: 'delete danger', label: 'Eliminar', onclick: `deleteClient(${c.id})` });
            return `
            <div class="mobile-card">
                <div class="mobile-card-header">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div class="mobile-card-avatar">${initials}</div>
                        <div>
                            <div class="mobile-card-id" style="color:var(--dark);">${c.name}</div>
                            <div class="mobile-card-sub">${c.phone || 'Sin teléfono'}</div>
                        </div>
                    </div>
                    ${actions.length ? buildMobileActionsBtn(c.id, actions) : ''}
                </div>
                <div class="mobile-card-body">
                    ${c.email ? `<div class="mobile-card-row"><i class="bi bi-envelope"></i><span class="mc-value">${c.email}</span></div>` : ''}
                    <div class="mobile-card-row">
                        <i class="bi bi-credit-card"></i>
                        <span class="mc-value" style="font-weight:600;">${isUnlimited ? '<span style="color:var(--success);">Ilimitado</span>' : '$' + c.creditLimit.toLocaleString()}</span>
                    </div>
                </div>
            </div>`;
        }).join('') || '<div class="empty-state" style="padding:30px;text-align:center;color:var(--gray);"><i class="bi bi-people"></i><h3>No hay clientes registrados</h3></div>';
    }
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
