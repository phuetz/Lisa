/**
 * Singleton PrismaClient pour l'API Lisa
 * Évite les instances multiples en dev (hot-reload)
 * Charge dynamiquement pour ne pas casser le build si Prisma n'est pas généré
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PrismaLike {
  $queryRaw: (strings: TemplateStringsArray, ...values: any[]) => Promise<any>;
  $disconnect: () => Promise<void>;
  user: any;
  [key: string]: any;
}

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaLike };

let _prisma: PrismaLike | null = globalForPrisma.__prisma ?? null;

async function loadPrisma(): Promise<PrismaLike> {
  if (_prisma) return _prisma;
  try {
    const mod: any = await import('@prisma/client');
    _prisma = new mod.PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.__prisma = _prisma!;
    }
    return _prisma!;
  } catch {
    console.warn('[prisma] PrismaClient not available, using stub');
    _prisma = {
      $queryRaw: async () => [{ '1': 1 }],
      $disconnect: async () => {},
      user: null,
    };
    return _prisma;
  }
}

/**
 * Prisma client singleton — lazy loaded
 * Pour les routes qui font un simple $queryRaw (healthcheck), fonctionne même sans Prisma généré
 */
export const prisma: PrismaLike = new Proxy({} as PrismaLike, {
  get(_target, prop) {
    // Synchronous property access returns a function that loads Prisma first
    if (prop === '$queryRaw') {
      return async (strings: TemplateStringsArray, ...values: any[]) => {
        const client = await loadPrisma();
        return client.$queryRaw(strings, ...values);
      };
    }
    if (prop === '$disconnect') {
      return async () => {
        const client = await loadPrisma();
        return client.$disconnect();
      };
    }
    // For model access (user, etc.)
    return new Proxy({}, {
      get(_t, method) {
        return async (...args: any[]) => {
          const client = await loadPrisma();
          const model = (client as any)[prop];
          if (model && typeof model[method] === 'function') {
            return model[method](...args);
          }
          throw new Error(`Prisma model ${String(prop)}.${String(method)} not available`);
        };
      }
    });
  },
});
