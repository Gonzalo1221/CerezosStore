// ============ REPORTS ============
function findSaleProduct(name, price) {
    return products.find(p => p.name === name && Math.abs(p.price - price) < 0.01) || products.find(p => p.name === name);
}

function renderReports() {
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    document.getElementById('reportRevenue').textContent = '$' + totalRevenue.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('reportTotalSales').textContent = sales.length;
    document.getElementById('reportAvgTicket').textContent = sales.length > 0 ? '$' + (totalRevenue / sales.length).toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0}) : '$0';
    
    // Real profit calculation: match by name+price for accuracy
    let totalCost = 0;
    let totalProfit = 0;
    const catData = {};
    const prodData = {};
    
    sales.forEach(s => {
        s.items.forEach(si => {
            const product = findSaleProduct(si.name, si.price);
            const cost = product ? product.cost * si.qty : 0;
            const itemRevenue = si.price * si.qty;
            const itemProfit = itemRevenue - cost;
            totalCost += cost;
            totalProfit += itemProfit;
            
            // Category breakdown
            const cat = product ? product.category : 'Sin categoría';
            if (!catData[cat]) catData[cat] = { qty: 0, revenue: 0, cost: 0, profit: 0 };
            catData[cat].qty += si.qty;
            catData[cat].revenue += itemRevenue;
            catData[cat].cost += cost;
            catData[cat].profit += itemProfit;
            
            // Product breakdown
            if (!prodData[si.name]) prodData[si.name] = { qty: 0, revenue: 0, cost: 0, profit: 0 };
            prodData[si.name].qty += si.qty;
            prodData[si.name].revenue += itemRevenue;
            prodData[si.name].cost += cost;
            prodData[si.name].profit += itemProfit;
        });
    });
    
    const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
    document.getElementById('reportMargin').textContent = margin + '%';
    document.getElementById('reportProfit').textContent = '$' + totalProfit.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('reportCost').textContent = '$' + totalCost.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});

    // Category report with profit
    const catReport = document.getElementById('categoryReport');
    const totalCatQty = Object.values(catData).reduce((sum, c) => sum + c.qty, 0);
    catReport.innerHTML = Object.entries(catData).sort((a, b) => b[1].revenue - a[1].revenue).map(([cat, data]) => {
        const pct = totalCatQty > 0 ? (data.qty / totalCatQty * 100).toFixed(0) : 0;
        const catMargin = data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(0) : 0;
        return `
            <div style="margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;">
                    <span>${getCategoryIcon(cat)} ${cat}</span>
                    <span style="color:var(--gray);">${data.qty} uds · $${data.revenue.toLocaleString()}</span>
                </div>
                <div style="height:8px;background:var(--dark3);border-radius:4px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--primary),var(--primary-dark));border-radius:4px;transition:width 0.5s;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px;color:var(--gray);">
                    <span>Costo: $${data.cost.toLocaleString()}</span>
                    <span style="color:var(--success);">Ganancia: $${data.profit.toLocaleString()} (${catMargin}%)</span>
                </div>
            </div>
        `;
    }).join('') || '<p style="color:var(--gray);text-align:center;padding:20px;">Sin datos</p>';

    // Top products with profit
    const topProdEl = document.getElementById('topProductsReport');
    const sorted = Object.entries(prodData).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
    topProdEl.innerHTML = sorted.map(([name, data], i) => {
        const prodMargin = data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(0) : 0;
        return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i < sorted.length-1 ? 'border-bottom:1px solid var(--dark3);' : ''}">
            <span style="width:24px;height:24px;border-radius:50%;background:var(--dark3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--primary);">${i+1}</span>
            <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;">${name}</div>
                <div style="font-size:11px;color:var(--gray);">${data.qty} uds · Costo: $${data.cost.toLocaleString()}</div>
            </div>
            <div style="text-align:right;">
                <div style="color:var(--primary);font-weight:700;">$${data.revenue.toLocaleString()}</div>
                <div style="font-size:11px;color:var(--success);">+$${data.profit.toLocaleString()} (${prodMargin}%)</div>
            </div>
        </div>`;
    }).join('') || '<p style="color:var(--gray);text-align:center;padding:20px;">Sin datos</p>';
}

function exportReport() {
    let csv = 'Ticket,Fecha,Cliente,Artículos,Subtotal,IVA,Total,Método Pago,Tipo Crédito,Restante\n';
    sales.forEach(s => {
        const items = s.items.map(i => `${i.qty}x ${i.name}`).join(' | ');
        csv += `${s.ticket},${s.date},${s.client},"${items}",${s.subtotal},${s.tax},${s.total},${s.payMethod},${s.creditType},${s.creditRemaining || 0}\n`;
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte_ventas_cerezos.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Reporte exportado', 'success');
}

function exportAllData() {
    const data = { products, sales, users, clients, creditPayments };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cerezos_sneaker_backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Datos exportados', 'success');
}
