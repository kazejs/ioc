import type { IContainer, IProvider, ProviderToken } from "./types.ts";
import { Container } from "./container.ts";

export class IoC {
  static namespaces = new Map<string, IContainer>();

  static register(
    provider: IProvider,
    namespace = "default",
  ): void {
    IoC.ns(namespace).register(provider);
  }

  static use<T>(
    // deno-lint-ignore no-explicit-any
    provider: ProviderToken | (new (...args: any) => T),
    namespace = "default",
  ): T {
    return IoC.ns(namespace).use(provider);
  }

  static create(name: string): Container {
    const container = new Container(name);
    IoC.set(container);
    return container;
  }

  static ns<C = IContainer>(name: string): C {
    return IoC.namespaces.get(name) as C;
  }

  static set(c: IContainer): void {
    IoC.namespaces.set(c.namespace, c);
  }

  static has(name: string): boolean {
    return IoC.namespaces.has(name);
  }
}
