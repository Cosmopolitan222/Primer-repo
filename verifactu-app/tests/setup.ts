import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

process.env.DATABASE_FILE = path.join(os.tmpdir(), `verifactu-test-${crypto.randomUUID()}.sqlite`);
process.env.SESSION_SECRET = "test-secret-solo-para-pruebas-automatizadas-no-usar-en-produccion";
