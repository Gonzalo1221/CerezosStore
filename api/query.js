import { supabase } from './_lib/supabase.js';
import { authMiddleware } from './_lib/auth.js';
import { can } from './_lib/permissions.js';
import { mapKeys, snakeToCamel } from './_lib/mapper.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { table, columns = '*', order } = req.body || {};

  if (!table) {
    return res.status(400).json({ error: 'table requerido' });
  }

  if (!can(req.user.role, 'read', table)) {
    return res.status(403).json({ error: 'No tienes permiso para leer esta tabla' });
  }

  try {
    let query = supabase.from(table).select(columns);
    if (order) {
      query = query.order(order.column || 'id', { ascending: order.ascending !== false });
    }
    const { data, error } = await query;
    if (error) throw error;
    const camelData = data ? data.map(d => mapKeys(d, snakeToCamel)) : data;
    res.status(200).json({ data: camelData, error: null });
  } catch (e) {
    res.status(500).json({ data: null, error: e.message });
  }
}

export default authMiddleware(handler);
