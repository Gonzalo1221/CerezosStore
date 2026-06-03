// ============ DASHBOARD ============
function renderDashboard() {
    document.getElementById('statProducts').textContent = products.length;
    const now = new Date();
    const monthPrefix = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const monthSales = sales.filter(s => s.date && s.date.startsWith(monthPrefix));
    const totalRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);
    document.getElementById('statSales').textContent = '$' + totalRevenue.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('statOrders').textContent = monthSales.length;
    
    const totalCreditsPending = sales.filter(s => s.creditType === 'credito' && s.creditRemaining > 0).reduce((sum, s) => sum + s.creditRemaining, 0);
    document.getElementById('statCredits').textContent = '$' + totalCreditsPending.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    
    const creditCount = sales.filter(s => s.creditType === 'credito' && s.creditRemaining > 0).length;
    const creditsBadge = document.getElementById('creditsBadge');
    if (creditCount > 0) {
        creditsBadge.style.display = 'inline';
        creditsBadge.textContent = creditCount;
    } else {
        creditsBadge.style.display = 'none';
    }

    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const weekDates = days.map((_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    });
    const values = weekDates.map(dateStr => {
        const daySales = sales.filter(s => {
            const sDate = s.date ? s.date.slice(0, 10) : '';
            return sDate === dateStr;
        });
        return daySales.reduce((sum, s) => sum + s.total, 0);
    });
    const maxVal = Math.max(...values);
    const chartEl = document.getElementById('weeklyChart');
    chartEl.innerHTML = days.map((d, i) => `
        <div class="bar-item">
            <div class="bar-value">$${(values[i]/1000).toFixed(1)}k</div>
            <div class="bar" style="height:${(values[i]/maxVal)*180}px"></div>
            <div class="bar-label">${d}</div>
        </div>
    `).join('');

    const topEl = document.getElementById('topSalesList');
    const salesByProduct = {};
    sales.forEach(s => {
        (s.items || []).forEach(item => {
            const key = item.name + '||' + item.price;
            if (!salesByProduct[key]) salesByProduct[key] = { name: item.name, price: item.price, qty: 0 };
            salesByProduct[key].qty += item.qty;
        });
    });
    let topList = Object.values(salesByProduct).sort((a, b) => b.qty - a.qty).slice(0, 5);
    if (topList.length === 0) {
        topList = products.filter(p => getTotalStock(p) > 0).sort((a, b) => b.price - a.price).slice(0, 5);
    }
    topEl.innerHTML = topList.map((p, i) => {
        const brandCat = p.brand ? `${p.brand} · ${p.category}` : (p.qty ? `${p.qty} vendidos` : '');
        return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i < topList.length-1 ? 'border-bottom:1px solid var(--dark3);' : ''}">
            <span style="width:24px;height:24px;border-radius:50%;background:var(--dark3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--primary);">${i+1}</span>
            <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;">${p.name}</div>
                <div style="font-size:11px;color:var(--gray);">${brandCat}</div>
            </div>
            <span style="color:var(--primary);font-weight:700;font-size:14px;">$${p.price.toLocaleString()}</span>
        </div>`;
    }).join('');

    const recentBody = document.getElementById('recentSalesBody');
    const recent = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    recentBody.innerHTML = recent.map(s => `
        <tr>
            <td style="font-weight:600;color:var(--primary);">${s.ticket}</td>
            <td>${s.client}</td>
            <td>${s.items.reduce((sum, i) => sum + i.qty, 0)} artículos</td>
            <td style="font-weight:700;">$${s.total.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
            <td>${s.payMethod}</td>
            <td style="color:var(--gray);">${s.date}</td>
            <td><span class="status-badge ${s.creditType === 'credito' ? (s.creditRemaining > 0 ? 'pending' : 'paid') : 'active'}"><i class="bi bi-circle-fill" style="font-size:6px;"></i> ${s.creditType === 'credito' ? (s.creditRemaining > 0 ? 'Crédito' : 'Pagado') : 'Contado'}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:30px;">No hay ventas registradas</td></tr>';
}
