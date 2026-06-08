// ============ USERS ============
function canEditUser(target) {
    if (!currentUser) return false;
    if (currentUser.role === 'Super Admin') return true;
    if (currentUser.role === 'Administrador' && target.role !== 'Super Admin') return true;
    return false;
}

function canDeleteUser(target) {
    if (!currentUser) return false;
    if (currentUser.id === target.id) return false; // cannot delete self
    if (currentUser.role === 'Super Admin') return true; // Super Admin can delete anyone except self
    if (currentUser.role === 'Administrador') {
        if (target.role === 'Super Admin') return false; // cannot delete Super Admin
        if (target.role === 'Administrador') return 'requires_super_admin'; // needs approval
        return true; // can delete Vendedor
    }
    return false;
}

function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(u => {
        const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        const roleIcons = { 'Vendedor': '🛒', 'Administrador': '👑', 'Super Admin': '🔰' };
        const canEdit = canEditUser(u);
        const delPerm = canDeleteUser(u);
        const showDelete = delPerm === true || delPerm === 'requires_super_admin';
        return `
            <tr>
                <td>
                    <div class="product-cell">
                        <div class="user-avatar" style="width:36px;height:36px;font-size:12px;">${initials}</div>
                        <div class="product-info">
                            <h4>${u.name}</h4>
                        </div>
                    </div>
                </td>
                <td>${u.email}</td>
                <td>${roleIcons[u.role] || ''} ${u.role}</td>
                <td><span class="status-badge ${u.status === 'active' ? 'active' : 'inactive'}"><i class="bi bi-circle-fill" style="font-size:6px;"></i> ${u.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                <td style="color:var(--gray);">${u.lastAccess || 'N/A'}</td>
                <td>
                    <div class="actions-cell">
                        ${canEdit ? `<button class="action-btn edit" onclick="editUser(${u.id})" title="Editar"><i class="bi bi-pencil"></i></button>` : ''}
                        ${showDelete ? `<button class="action-btn delete" onclick="deleteUser(${u.id})" title="Eliminar"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    const mobileEl = document.getElementById('usersMobileCards');
    if (mobileEl) {
        mobileEl.innerHTML = users.map(u => {
            const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2);
            const roleIcons = { 'Vendedor': '🛒', 'Administrador': '👑', 'Super Admin': '🔰' };
            const canEdit = canEditUser(u);
            const delPerm = canDeleteUser(u);
            const showDelete = delPerm === true || delPerm === 'requires_super_admin';
            const statusClass = u.status === 'active' ? 'active' : 'inactive';
            const statusLabel = u.status === 'active' ? 'Activo' : 'Inactivo';
            const actions = [];
            if (canEdit) actions.push({ icon: 'bi-pencil', class: 'edit', label: 'Editar', onclick: `editUser(${u.id})` });
            if (showDelete) actions.push({ icon: 'bi-trash3', class: 'delete danger', label: 'Eliminar', onclick: `deleteUser(${u.id})` });
            return `
            <div class="mobile-card">
                <div class="mobile-card-header">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div class="mobile-card-avatar">${initials}</div>
                        <div>
                            <div class="mobile-card-id" style="color:var(--dark);">${u.name}</div>
                            <div class="mobile-card-sub">${roleIcons[u.role] || ''} ${u.role}</div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span class="status-badge ${statusClass}"><i class="bi bi-circle-fill" style="font-size:6px;"></i> ${statusLabel}</span>
                        ${actions.length ? buildMobileActionsBtn('u-' + u.id, actions) : ''}
                    </div>
                </div>
                <div class="mobile-card-body">
                    <div class="mobile-card-row">
                        <i class="bi bi-envelope"></i>
                        <span class="mc-value">${u.email}</span>
                    </div>
                    <div class="mobile-card-row">
                        <i class="bi bi-clock"></i>
                        <span class="mc-value" style="color:var(--gray);">${u.lastAccess || 'N/A'}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
}

async function saveUser() {
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const pass = document.getElementById('userPass').value.trim();
    const role = document.querySelector('input[name="userRole"]:checked').value;

    if (!name || !email || !pass) { showToast('Completa todos los campos', 'error'); return; }
    if (role === 'Super Admin' && (!currentUser || currentUser.role !== 'Super Admin')) {
        showToast('Solo un Super Admin puede crear usuarios con este rol', 'error');
        return;
    }

    const salt = await generateSalt(16);
    const iterations = 100000;
    const hash = await hashPassword(pass, salt, iterations);
    users.push({ id: Date.now(), name, email, passwordHash: hash, passwordSalt: salt, passwordIterations: iterations, role, status: 'active', lastAccess: '' });
    saveUsers();
    renderUsers();
    hideModal('userModal');
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userPass').value = '';
    showToast('Usuario creado', 'success');
}

function editUser(id) {
    if (!canEditUser(users.find(u => u.id === id))) {
        showToast('No tienes permiso para editar este usuario', 'error');
        return;
    }
    const user = users.find(u => u.id === id);
    if (!user) return;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserPass').value = '';
    const radio = document.querySelector(`input[name="editUserRole"][value="${user.role}"]`);
    if (radio) radio.checked = true;
    document.getElementById('editUserModal').dataset.userId = id;
    showModal('editUserModal');
}

async function saveUserEdit() {
    const id = parseInt(document.getElementById('editUserModal').dataset.userId);
    const user = users.find(u => u.id === id);
    if (!user) { showToast('Usuario no encontrado', 'error'); return; }
    const name = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const pass = document.getElementById('editUserPass').value.trim();
    const role = document.querySelector('input[name="editUserRole"]:checked').value;

    if (!name || !email) { showToast('Nombre y correo son obligatorios', 'error'); return; }

    // Permission check: only Super Admin can set Super Admin role
    if (role === 'Super Admin' && currentUser.role !== 'Super Admin') {
        showToast('Solo un Super Admin puede asignar el rol de Super Admin', 'error');
        return;
    }
    // Cannot change own role or another Super Admin's role if not Super Admin
    if (currentUser.role !== 'Super Admin' && (user.role === 'Super Admin' || role === 'Super Admin')) {
        showToast('No tienes permiso para modificar roles de Super Admin', 'error');
        return;
    }

    user.name = name;
    user.email = email;
    user.role = role;
    if (pass) {
        const salt = await generateSalt(16);
        const iterations = 100000;
        user.passwordHash = await hashPassword(pass, salt, iterations);
        user.passwordSalt = salt;
        user.passwordIterations = iterations;
        delete user.password;
    }
    if (currentUser.id === user.id) {
        currentUser = user;
        updateSidebarUser(user);
    }
    saveUsers();
    renderUsers();
    hideModal('editUserModal');
    showToast('Usuario actualizado', 'success');
}

function deleteUser(id) {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const perm = canDeleteUser(target);
    if (perm === false) {
        if (currentUser && currentUser.id === id) {
            showToast('No puedes eliminarte a ti mismo', 'error');
        } else {
            showToast('No tienes permiso para eliminar este usuario', 'error');
        }
        return;
    }
    if (perm === 'requires_super_admin') {
        pendingDeleteId = id;
        pendingDeleteType = 'user';
        document.getElementById('superAuthEmail').value = '';
        document.getElementById('superAuthPass').value = '';
        showModal('superAdminAuthModal');
        return;
    }
    pendingDeleteId = id;
    pendingDeleteType = 'user';
    document.getElementById('confirmMessage').textContent = '¿Estás seguro de que deseas eliminar este usuario?';
    document.getElementById('confirmBtn').textContent = 'Eliminar';
    showModal('confirmModal');
}

function showLoader() {
    const el = document.getElementById('loaderOverlay');
    if (el) { el.classList.remove('hidden'); }
}
function hideLoader() {
    const el = document.getElementById('loaderOverlay');
    if (el) { el.classList.add('hidden'); }
}
