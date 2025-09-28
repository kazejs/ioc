import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import type { IContainer, IocVariables, ProviderToken } from "../src/types.ts";

type Env = { Variables: IocVariables & { requestId: string } };

/**
 * Middleware para injetar serviços no contexto da requisição do Hono
 */
export function contextIoC(container: IContainer): MiddlewareHandler<Env> {
  return createMiddleware<Env>(async (ctx, next) => {
    const scopeId = container.createScope(ctx.var.requestId);

    ctx.set("ioc", container);
    ctx.set("scopeId", scopeId);
    ctx.set(
      "use",
      // deno-lint-ignore no-explicit-any
      <T>(provider: ProviderToken | (new (...args: any) => T)): T =>
        container.use(provider, scopeId),
    );

    await next();

    container.clearScope(scopeId);
  });
}
