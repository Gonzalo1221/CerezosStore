import { createHash } from 'crypto';

const PERMISSIONS = {
  'Super Admin': {
    users:            ['read', 'create', 'edit', 'delete'],
    products:         ['read', 'create', 'edit', 'delete'],
    sales:            ['read', 'create', 'edit', 'delete', 'void'],
    clients:          ['read', 'create', 'edit', 'delete'],
    quotes:           ['read', 'create', 'edit', 'delete'],
    settings:         ['read', 'edit'],
    credit_payments:  ['read', 'create', 'delete'],
    brands:           ['read', 'create', 'edit', 'delete'],
    categories:       ['read', 'create', 'edit', 'delete']
  },
  'Administrador': {
    users:            ['read', 'create', 'edit'],
    products:         ['read', 'create', 'edit', 'delete'],
    sales:            ['read', 'create', 'edit', 'delete', 'void'],
    clients:          ['read', 'create', 'edit', 'delete'],
    quotes:           ['read', 'create', 'edit', 'delete'],
    settings:         ['read'],
    credit_payments:  ['read', 'create', 'edit', 'delete'],
    brands:           ['read', 'create', 'edit', 'delete'],
    categories:       ['read', 'create', 'edit', 'delete']
  },
  'Vendedor': {
    users:            ['read'],
    products:         ['read'],
    sales:            ['read', 'create'],
    clients:          ['read', 'create', 'edit'],
    quotes:           ['read', 'create', 'edit', 'delete'],
    settings:         [],
    credit_payments:  ['read', 'create'],
    brands:           ['read'],
    categories:       ['read']
  }
};

export function can(role, action, table) {
  return PERMISSIONS[role]?.[table]?.includes(action) ?? false;
}

export function getRawPermissions() {
  return PERMISSIONS;
}
