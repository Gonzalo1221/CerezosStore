import { pbkdf2Sync, timingSafeEqual, randomBytes } from 'crypto';
import { supabase } from './_lib/supabase.js';
import { signToken } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1);

  if (error || !users || users.length === 0) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const user = users[0];
  let hash = user.password_hash;
  let salt = user.password_salt;
  const iterations = user.password_iterations || 100000;

  // Migrar contraseñas legacy (plaintext → hash)
  if ((!hash || !salt) && user.password && user.password === password) {
    const newSalt = randomBytes(16).toString('base64');
    const migKey = pbkdf2Sync(password, Buffer.from(newSalt, 'base64'), 100000, 32, 'sha256');
    hash = migKey.toString('base64');
    salt = newSalt;
    await supabase.from('users').update({
      password_hash: hash, password_salt: salt,
      password_iterations: 100000, password: null
    }).eq('id', user.id);
  }

  if (!hash || !salt) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const saltBuf = Buffer.from(salt, 'base64');
  const derivedKey = pbkdf2Sync(password, saltBuf, iterations, 32, 'sha256');
  const enteredHash = derivedKey.toString('base64');

  if (hash.length !== enteredHash.length || !timingSafeEqual(Buffer.from(hash), Buffer.from(enteredHash))) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const userData = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = signToken(userData);

  await supabase.from('users').update({ last_access: new Date().toISOString() }).eq('id', user.id);

  res.status(200).json({ token, user: userData });
}
