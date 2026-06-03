// ============ CUSTOM DROPDOWN COMPONENT ============
// Creates a styled dropdown with search, icons, and animations

function createCustomDropdown(containerId, options, config = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const {
        placeholder = 'Seleccionar...',
        icon = '',
        value = '',
        onChange = null,
        searchable = true
    } = config;

    const selectedOption = options.find(o => o.value === value);
    const hasValue = value !== '' && selectedOption;

    container.innerHTML = `
        <div class="cd-wrap">
            <div class="cd-trigger ${hasValue ? 'cd-has-value' : ''}" tabindex="0">
                ${icon ? `<i class="bi bi-${hasValue ? (selectedOption.icon || icon) : icon} cd-icon"></i>` : ''}
                <span class="cd-text">${hasValue ? selectedOption.label : placeholder}</span>
                <i class="bi bi-chevron-down cd-chevron"></i>
                <input type="hidden" class="cd-hidden-input" value="${value}">
            </div>
            <div class="cd-list">
                ${searchable ? `<div class="cd-search"><input type="text" placeholder="Buscar..." class="cd-search-input"></div>` : ''}
                <div class="cd-items">
                    ${renderCdItems(options, value, placeholder)}
                </div>
            </div>
        </div>
    `;

    const trigger = container.querySelector('.cd-trigger');
    const list = container.querySelector('.cd-list');
    const items = container.querySelector('.cd-items');
    const searchInput = container.querySelector('.cd-search-input');
    const hiddenInput = container.querySelector('.cd-hidden-input');

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        const isOpen = list.classList.toggle('cd-open');
        trigger.classList.toggle('cd-open', isOpen);
        if (isOpen && searchInput) {
            searchInput.value = '';
            searchInput.focus();
            filterCdItems(items, options, value, placeholder, '');
        }
    });

    // Search
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterCdItems(items, options, value, placeholder, e.target.value);
        });
        searchInput.addEventListener('click', (e) => e.stopPropagation());
    }

    // Select item
    items.addEventListener('click', (e) => {
        const item = e.target.closest('.cd-item');
        if (!item || item.classList.contains('cd-empty')) return;
        const itemValue = item.dataset.value;
        const itemLabel = item.dataset.label;
        const itemIcon = item.dataset.icon;

        hiddenInput.value = itemValue;
        trigger.querySelector('.cd-text').textContent = itemLabel;
        const iconEl = trigger.querySelector('.cd-icon');
        if (iconEl && itemIcon) iconEl.className = `bi bi-${itemIcon} cd-icon`;
        trigger.classList.add('cd-has-value');
        trigger.classList.remove('cd-open');
        list.classList.remove('cd-open');

        // Update selected state
        items.querySelectorAll('.cd-item').forEach(i => i.classList.remove('cd-selected'));
        item.classList.add('cd-selected');

        if (onChange) onChange(itemValue);
    });

    // Close on outside click
    document.addEventListener('click', () => {
        list.classList.remove('cd-open');
        trigger.classList.remove('cd-open');
    });
}

function renderCdItems(options, selectedValue, placeholder) {
    if (options.length === 0) {
        return '<div class="cd-empty">Sin opciones disponibles</div>';
    }
    return options.map(opt => {
        const isSelected = opt.value === selectedValue;
        return `<div class="cd-item ${isSelected ? 'cd-selected' : ''}" data-value="${opt.value}" data-label="${opt.label}" data-icon="${opt.icon || ''}">
            ${opt.icon ? `<i class="bi bi-${opt.icon}"></i>` : ''}
            <span>${opt.label}</span>
        </div>`;
    }).join('');
}

function filterCdItems(itemsEl, options, selectedValue, placeholder, query) {
    const q = query.toLowerCase().trim();
    const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
    itemsEl.innerHTML = renderCdItems(filtered, selectedValue, placeholder);
}

function closeAllDropdowns() {
    document.querySelectorAll('.cd-list.cd-open').forEach(el => el.classList.remove('cd-open'));
    document.querySelectorAll('.cd-trigger.cd-open').forEach(el => el.classList.remove('cd-open'));
}

function setCdValue(containerId, value) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const hiddenInput = container.querySelector('.cd-hidden-input');
    const trigger = container.querySelector('.cd-trigger');
    const textEl = container.querySelector('.cd-text');
    const items = container.querySelectorAll('.cd-item');

    if (hiddenInput) hiddenInput.value = value;

    let found = false;
    items.forEach(item => {
        item.classList.remove('cd-selected');
        if (item.dataset.value === value) {
            item.classList.add('cd-selected');
            if (textEl) textEl.textContent = item.dataset.label;
            const iconEl = trigger?.querySelector('.cd-icon');
            if (iconEl && item.dataset.icon) iconEl.className = `bi bi-${item.dataset.icon} cd-icon`;
            if (trigger) trigger.classList.add('cd-has-value');
            found = true;
        }
    });

    if (!found && trigger) {
        const placeholder = container.querySelector('.cd-text')?.textContent || 'Seleccionar...';
        textEl.textContent = placeholder;
        trigger.classList.remove('cd-has-value');
    }
}

function getCdValue(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return '';
    const hiddenInput = container.querySelector('.cd-hidden-input');
    return hiddenInput ? hiddenInput.value : '';
}
