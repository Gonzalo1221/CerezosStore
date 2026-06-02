// ============ API HELPERS (backend proxy) ============
function getApiToken() { return sessionStorage.getItem('cs_api_token'); }
function setApiToken(t) { sessionStorage.setItem('cs_api_token', t); }
function clearApiToken() { sessionStorage.removeItem('cs_api_token'); }

async function apiPost(path, body, timeoutMs = 15000) {
    const token = getApiToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
        });
        return res.json();
    } finally {
        clearTimeout(timer);
    }
}

async function apiQuery(table, opts = {}) {
    const result = await apiPost('/api/query', { table, ...opts });
    if (result.error) throw new Error(result.error);
    return result.data;
}

async function apiUpsert(table, data) {
    const result = await apiPost('/api/upsert', { table, data });
    if (result.error) throw new Error(result.error);
    return result.success;
}

async function apiDelete(table, id, opts = {}) {
    const body = opts.column ? { table, column: opts.column, values: opts.values } : { table, id };
    const result = await apiPost('/api/delete', body);
    if (result.error) throw new Error(result.error);
    return result.success;
}
