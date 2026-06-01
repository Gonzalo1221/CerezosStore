import { supabase } from './_lib/supabase.js';
import { authMiddleware } from './_lib/auth.js';
import { can } from './_lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { table, id, column, values } = req.body || {};

  if (!table) {
    return res.status(400).json({ error: 'table requerido' });
  }

  if (!can(req.user.role, 'delete', table)) {
    return res.status(403).json({ error: `No tienes permiso para eliminar en ${table}` });
  }

  try {
    let query = supabase.from(table).delete();

    if (column && values !== undefined) {
      // Delete where column IN (values)
      const vals = Array.isArray(values) ? values : [values];
      query = query.in(column, vals);
    } else if (id !== undefined && id !== null) {
      // Delete by id
      query = query.eq('id', id);
    } else {
      return res.status(400).json({ error: 'Se requiere id o column+values' });
    }

    const { error } = await query;
    if (error) throw error;
    res.status(200).json({ success: true, error: null });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

export default authMiddleware(handler);
