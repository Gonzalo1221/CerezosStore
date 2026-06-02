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
