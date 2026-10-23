// Borra la base de datos y las imágenes locales de desarrollo (carpeta .wrangler/state).
import fs from 'node:fs';
fs.rmSync(new URL('../.wrangler/state', import.meta.url), { recursive: true, force: true });
console.log('Datos locales borrados.');
