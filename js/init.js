// ============ INIT ============
(async function() {
    // Safety timeout: force-hide loader after 30s even if API hangs
    const safetyTimer = setTimeout(() => {
        hideLoader();
        document.getElementById('appLayout')?.classList.remove('active');
        const lp = document.getElementById('loginPage');
        if (lp) lp.style.display = 'flex';
        const errEl = document.getElementById('loginError');
        if (errEl) { errEl.textContent = 'Tiempo de espera agotado. Verifica tu conexión e inicia sesión.'; errEl.classList.add('show'); }
    }, 30000);

    const sessionOk = await checkSessionOnLoad();
    clearTimeout(safetyTimer);
    if (!sessionOk) {
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('appLayout').classList.remove('active');
    }
    hideLoader();
})();