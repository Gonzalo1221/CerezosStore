import { supabase } from './_lib/supabase.js';
import { authMiddleware } from './_lib/auth.js';
import { getRawPermissions } from './_lib/permissions.js';

async function handler(req, res) {
  const perms = getRawPermissions();
  const userPerms = perms[req.user.role] || {};
  res.status(200).json({ user: req.user, permissions: userPerms });
}

export default authMiddleware(handler);
