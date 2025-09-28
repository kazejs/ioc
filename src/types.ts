import type { LifeTime } from "./enums.ts";

export interface IContainer {
  readonly namespace: string;
  register(provider: IProvider): void;
  registerValue(
    token: ProviderToken,
    value: unknown,
    lifeTime?: LifeTime,
  ): void;
  registerFactory<T = unknown>(
    token: ProviderToken,
    factory: FactoryFn<T, IContainer>,
    lifeTime?: LifeTime,
  ): void;
  getScope(scopeId: string): Map<ProviderToken, unknown>;
  createScope(scopeId?: string): string;
  clearScope(scopeId: string): void;
  getByScope<T>(token: ProviderToken, scopeId: string): T;
  get<T>(token: ProviderToken): T;
  use<T>(
    // deno-lint-ignore no-explicit-any
    provider: ProviderToken | (new (...args: any) => T) | IConstructor,
    scopeId?: string,
  ): T;
  initializeServices(): Promise<void>;
  shutdownServices(signal: string): Promise<void>;
}

export interface IProvider<C = IContainer> {
  token?: ProviderToken;
  lifeTime?: LifeTime;
  useValue?: unknown;
  useClass?: IConstructor;
  useFactory?: FactoryFn<unknown, C>;
}

export interface IConstructor {
  // deno-lint-ignore no-explicit-any
  new (...args: any): unknown;
}

export type FactoryFn<T = unknown, C = IContainer> = (ci: C) => T;

export type UseFactoryFn<T = unknown> = () => T;

export type ProviderToken = string | symbol | IConstructor;

export type IocVariables<C = IContainer> = {
  ioc: C;
  scopeId: string;
  // deno-lint-ignore no-explicit-any
  use: <T>(provider: ProviderToken | (new (...args: any) => T)) => T;
};
