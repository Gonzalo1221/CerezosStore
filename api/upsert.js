import { supabase } from './_lib/supabase.js';
import { authMiddleware } from './_lib/auth.js';
import { can } from './_lib/permissions.js';
import { mapKeys, camelToSnake } from './_lib/mapper.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { table, data } = req.body || {};

  if (!table || !data) {
    return res.status(400).json({ error: 'table y data requeridos' });
  }

  const action = Array.isArray(data) ? 'create' : 'edit';
  if (!can(req.user.role, action, table)) {
    return res.status(403).json({ error: `No tienes permiso para ${action} en ${table}` });
  }

  try {
    const snakeData = mapKeys(data, camelToSnake);
    const { data: result, error } = await supabase
      .from(table)
      .upsert(snakeData, { onConflict: 'id', ignoreDuplicates: false })
      .select();
    if (error) throw error;
    res.status(200).json({ success: true, data: result, error: null });
  } catch (e) {
    res.status(500).json({ success: false, data: null, error: e.message });
  }
}

export default authMiddleware(handler);
