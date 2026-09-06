// Declaracion minima de tipos para el modulo experimental "node:sqlite"
// (disponible de forma nativa en Node.js >= 22.5, sin dependencias externas).
// @types/node aun no incluye esta API en la version usada por este proyecto.
declare module "node:sqlite" {
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    run(...params: unknown[]): StatementResultingChanges;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(...params: unknown[]): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all(...params: unknown[]): any[];
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    open(): void;
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}

// process.getBuiltinModule (Node.js >= 22.3) no esta tipado todavia en la
// version de @types/node usada por este proyecto.
declare namespace NodeJS {
  interface Process {
    getBuiltinModule(id: string): unknown;
  }
}

