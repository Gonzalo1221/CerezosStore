// ============ PRINT / SHARE HELPERS ============
function buildReceiptBody(sale) {
    const isCredit = sale.creditType === 'credito';
    const itemsHtml = (sale.items || []).map(i => {
        const sizeLabel = i.size ? ' <span style="color:#999;font-size:9px;">' + i.size + '</span>' : '';
        return `<tr><td style="font-size:11px;">${i.name}${sizeLabel}</td><td style="text-align:center;font-size:11px;">${i.qty}</td><td style="text-align:right;font-size:11px;">$${(i.price * i.qty).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td></tr>`;
    }).join('');
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
        <div style="text-align:center;margin-bottom:6px;font-size:11px;"><strong>${sale.ticket}</strong> · ${formatDate(sale.date)}</div>
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
    let text = `${businessName.toUpperCase()}\n${businessAddress}\nTel: ${businessPhone}${businessRfc ? ' · RFC: ' + businessRfc : ''}\n${sale.ticket} · ${formatDate(sale.date)}\nCliente: ${sale.client}\n`;
    if (isCredit) text += `*** VENTA A CREDITO ***\n`;
    if (isCredit && sale.creditInstallments > 1) text += `${sale.creditInstallments} cuotas de $${sale.creditInstallmentValue.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}\n`;
    text += `\nArticulos:\n`;
    (sale.items || []).forEach(i => { text += `${i.qty}x ${i.name}${i.size ? ' [' + i.size + ']' : ''} - $${(i.price * i.qty).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}\n`; });
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
        pdf.text(formatDate(sale.date), PW / 2, y, { align: 'center' }); y += 3.5;
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
            const label = i.size ? i.name + ' (' + i.size + ')' : i.name;
            pdf.text(label, M, y);
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
        const itemsSummary = s.items.map(i => `${i.qty}x ${i.name}${i.size ? ' [' + i.size + ']' : ''}`).join(', ');
        const isCredit = s.creditType === 'credito';
        const isAnnulled = s.status === 'Anulada';
        const creditStatusClass = isAnnulled ? 'inactive' : (!isCredit ? 'active' : (s.creditRemaining > 0 ? 'pending' : 'paid'));
        const creditStatusLabel = isAnnulled ? 'Anulada' : (!isCredit ? 'Contado' : (s.creditRemaining > 0 ? 'Pendiente' : 'Pagado'));
        const creditBadge = `<span class="status-badge ${creditStatusClass}"><i class="bi bi-circle-fill" style="font-size:6px;"></i> ${creditStatusLabel}${isCredit && s.creditRemaining > 0 ? ' $' + s.creditRemaining.toLocaleString('es-MX', {minimumFractionDigits: 0}) : ''}</span>`;
        const totalFmt = (v) => '$' + v.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
        const actionsBtns = `
            <div class="actions-cell">
                ${isCredit && s.creditRemaining > 0 && can('create','credit_payments') ? `<button class="action-btn pay" onclick="showAbonoModal(${s.id})" title="Registrar Abono"><i class="bi bi-cash-stack"></i></button>` : ''}
                <button class="action-btn view" onclick="viewSaleDetail(${s.id})" title="Ver"><i class="bi bi-receipt"></i></button>
                ${can('edit','sales') ? `<button class="action-btn edit" onclick="editSale(${s.id})" title="Editar"><i class="bi bi-pencil"></i></button>` : ''}
                <button class="action-btn print" onclick="printSale(${s.id})" title="Imprimir"><i class="bi bi-printer"></i></button>
                <button class="action-btn download" onclick="downloadSalePdf(${s.id})" title="Descargar PDF"><i class="bi bi-download"></i></button>
                ${can('delete','sales') ? `<button class="action-btn delete" onclick="deleteSale(${s.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
            </div>
        `;
        return `
            <tr class="tr-desktop">
                <td><span style="font-weight:600;color:var(--primary);">${s.ticket}</span></td>
                <td>${formatDate(s.date)}</td>
                <td>${s.client}</td>
                <td>${s.payMethod}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${itemsSummary}">${itemsSummary}</td>
                <td style="font-weight:700;">${totalFmt(s.subtotal)}</td>
                <td>${totalFmt(s.tax)}</td>
                <td style="font-weight:700;">${totalFmt(s.total)}</td>
                <td>${creditBadge}</td>
                <td>${actionsBtns}</td>
            </tr>
            <tr class="tr-compact">
                <td><div class="td-stack"><span style="font-weight:600;color:var(--primary);">${s.ticket}</span><span class="td-secondary">${formatDate(s.date)}</span></div></td>
                <td><div class="td-stack"><span>${s.client}</span><span class="td-secondary">${s.payMethod}</span></div></td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${itemsSummary}">${itemsSummary}</td>
                <td><div class="td-stack"><span style="font-weight:700;">${totalFmt(s.total)}</span><span class="td-secondary">${totalFmt(s.subtotal)} + ${totalFmt(s.tax)} IVA</span></div></td>
                <td>${creditBadge}</td>
                <td>${actionsBtns}</td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="10"><div class="empty-state"><i class="bi bi-receipt"></i><h3>No hay ventas</h3><p>Las ventas aparecerán aquí</p></div></td></tr>';

    const mobileEl = document.getElementById('salesMobileCards');
    if (mobileEl) {
        mobileEl.innerHTML = pageItems.map(s => {
            const itemsSummary = s.items.map(i => `${i.qty}x ${i.name}${i.size ? ' [' + i.size + ']' : ''}`).join(', ');
            const isCredit = s.creditType === 'credito';
            const isAnnulled = s.status === 'Anulada';
            const creditStatusClass = isAnnulled ? 'inactive' : (!isCredit ? 'active' : (s.creditRemaining > 0 ? 'pending' : 'paid'));
            const creditStatusLabel = isAnnulled ? 'Anulada' : (!isCredit ? 'Contado' : (s.creditRemaining > 0 ? 'Pendiente' : 'Pagado'));
            const actions = [];
            if (isCredit && s.creditRemaining > 0 && can('create','credit_payments')) actions.push({ icon: 'bi-cash-stack', class: 'pay', label: 'Registrar Abono', onclick: `showAbonoModal(${s.id})` });
            actions.push({ icon: 'bi-receipt', class: 'view', label: 'Ver Detalle', onclick: `viewSaleDetail(${s.id})` });
            if (can('edit','sales')) actions.push({ icon: 'bi-pencil', class: 'edit', label: 'Editar', onclick: `editSale(${s.id})` });
            actions.push({ icon: 'bi-printer', class: 'print', label: 'Imprimir', onclick: `printSale(${s.id})` });
            actions.push({ icon: 'bi-download', class: 'download', label: 'Descargar PDF', onclick: `downloadSalePdf(${s.id})` });
            if (can('delete','sales')) actions.push({ icon: 'bi-trash3', class: 'delete danger', label: 'Eliminar', onclick: `deleteSale(${s.id})` });
            const infoHtml = `
                <div class="mad-info-row"><span class="mad-info-label">Ticket</span><span class="mad-info-value">${s.ticket}</span></div>
                <div class="mad-info-row"><span class="mad-info-label">Fecha</span><span class="mad-info-value">${formatDate(s.date)}</span></div>
                <div class="mad-info-row"><span class="mad-info-label">Cliente</span><span class="mad-info-value">${s.client}</span></div>
                <div class="mad-info-row"><span class="mad-info-label">Método</span><span class="mad-info-value">${s.payMethod}</span></div>
                <div class="mad-info-row"><span class="mad-info-label">Subtotal</span><span class="mad-info-value">$${s.subtotal.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>
                <div class="mad-info-row"><span class="mad-info-label">IVA</span><span class="mad-info-value">$${s.tax.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>
                <div class="mad-info-row"><span class="mad-info-label">Total</span><span class="mad-info-value" style="font-size:15px;">$${s.total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></div>
            `;
            return `
            <div class="mobile-card">
                <div class="mobile-card-header">
                    <div>
                        <div class="mobile-card-id">${s.ticket}</div>
                        <div class="mobile-card-sub">${formatDate(s.date)}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span class="status-badge ${creditStatusClass}"><i class="bi bi-circle-fill" style="font-size:6px;"></i> ${creditStatusLabel}${isCredit && s.creditRemaining > 0 ? ' $' + s.creditRemaining.toLocaleString('es-MX', {minimumFractionDigits: 0}) : ''}</span>
                        ${buildMobileActionsBtn('s-' + s.id, actions, infoHtml, 'Detalle de Venta')}
                    </div>
                </div>
                <div class="mobile-card-body">
                    <div class="mobile-card-row">
                        <i class="bi bi-person"></i>
                        <span class="mc-value">${s.client}</span>
                    </div>
                    <div class="mobile-card-row">
                        <i class="bi bi-bag"></i>
                        <span class="mc-value truncate">${itemsSummary}</span>
                    </div>
                    <div class="mobile-card-row">
                        <i class="bi bi-wallet2"></i>
                        <span class="mc-value">${s.payMethod}</span>
                    </div>
                </div>
                <div class="mobile-card-footer">
                    <div class="mobile-card-total">$${s.total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
                </div>
            </div>`;
        }).join('') || '<div class="empty-state" style="padding:30px;text-align:center;color:var(--gray);"><i class="bi bi-receipt"></i><h3>No hay ventas</h3></div>';
    }

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
    document.getElementById('saleActionTicket').textContent = sale.ticket + ' · ' + formatDate(sale.date);
    const clientName = sale.client || 'Consumidor Final';
    const totalStr = '$' + sale.total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('saleActionInfo').textContent = 'Cliente: ' + clientName + ' · Total: ' + totalStr;
    showModal('saleActionModal');
}

async function annulSale() {
    const id = pendingSaleActionId;
    const sale = sales.find(s => s.id === id);
    if (!sale) { hideModal('saleActionModal'); return; }
    // Return items to stock
    (sale.items || []).forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product && item.sizeId) {
            setStockForSize(product, item.sizeId, getStockForSize(product, item.sizeId) + item.qty);
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
    try {
        await saveSales();
        await saveProducts();
        await saveClients();
    } catch (e) {
        showToast('Error al anular venta: ' + e.message, 'error');
        return;
    }
    reRenderCurrentPage();
    hideModal('saleActionModal');
    pendingSaleActionId = null;
    showToast('Venta anulada · Stock restituido', 'warning');
}

async function deleteSaleConfirmed() {
    const id = pendingSaleActionId;
    sales = sales.filter(s => s.id !== id);
    creditPayments = creditPayments.filter(cp => cp.saleId !== id);
    recalcClientCredits();
    try {
        await saveSales();
        await saveCreditPayments();
        await apiDelete('sales', id);
        await apiDelete('credit_payments', null, { column: 'sale_id', values: [id] }).catch(() => {});
    } catch (e) {
        showToast('Error al eliminar venta: ' + e.message, 'error');
        return;
    }
    reRenderCurrentPage();
    hideModal('saleActionModal');
    pendingSaleActionId = null;
    showToast('Venta eliminada', 'success');
}

function filterSalesHistory() { renderSalesHistory(); }
