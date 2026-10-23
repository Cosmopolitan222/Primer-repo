// Pruebas de la librería de autenticación. Ejecutar con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createToken, hashPassword, readToken, verifyPassword } from '../src/lib/auth.js';

test('hash y verificación de contraseña', async () => {
  const h = await hashPassword('secreto123');
  assert.match(h, /^pbkdf2\$100000\$/);
  assert.equal(await verifyPassword('secreto123', h), true);
  assert.equal(await verifyPassword('otra', h), false);
  assert.equal(await verifyPassword('secreto123', 'basura'), false);
});

test('el hash generado por el script de la demo (Node) es compatible', async () => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync('demo1234', salt, 100000, 32, 'sha256');
  const stored = `pbkdf2$100000$${salt.toString('base64')}$${hash.toString('base64')}`;
  assert.equal(await verifyPassword('demo1234', stored), true);
});

test('tokens de sesión: válidos, manipulados y con otro secreto', async () => {
  const t = await createToken('s1', { role: 'agency', agencyId: 'a1' });
  assert.equal((await readToken('s1', t)).agencyId, 'a1');
  assert.equal(await readToken('s2', t), null);
  const [body, sig] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 1e9 })).toString('base64url');
  assert.equal(await readToken('s1', `${forged}.${sig}`), null);
  assert.equal(await readToken('s1', `${body}.x`), null);
  assert.equal(await readToken('s1', null), null);
});
