import type {
  FactoryFn,
  IContainer,
  IProvider,
  ProviderToken,
  UseFactoryFn,
} from "./types.ts";
import { LifeTime } from "./enums.ts";

/**
 * Classe responsável por gerenciar os serviços da aplicação
 */
export class Container implements IContainer {
  private readonly services = new Map<ProviderToken, unknown>();

  private readonly serviceFactories = new Map<
    ProviderToken,
    FactoryFn<unknown, this>
  >();

  private readonly serviceLifeTime = new Map<ProviderToken, LifeTime>();

  private readonly scopedServices = new Map<
    string,
    Map<ProviderToken, unknown>
  >();

  private registering = false;
  private bootstraping = false;

  constructor(public readonly namespace = "default") {}

  /**
   * Registra um serviço no container
   */
  public register(provider: IProvider<this>): ProviderToken {
    const token = provider.token || Symbol();
    const lifeTime = provider.lifeTime || LifeTime.SINGLETON;

    if (!token) {
      throw new Error("Provider token is required");
    }

    if (provider.useFactory) {
      this.registerFactory(token, provider.useFactory, lifeTime);
    } else if (provider.useValue) {
      this.registerValue(token, provider.useValue, lifeTime);
    } else if (provider.useClass) {
      this.registerFactory(token, () => new provider.useClass!(), lifeTime);
    } else {
      throw new Error(
        "Provider must use one of: useFactory, useValue, useClass",
      );
    }

    return token;
  }

  /**
   * Registra um serviço no container
   */
  public registerValue(
    token: ProviderToken,
    value: unknown,
    lifeTime = LifeTime.SINGLETON,
  ): void {
    // if (this.bootstraping) {
    //   throw new Error(
    //     "Não é possível registrar serviços durante a inicialização",
    //   );
    // }

    if (lifeTime === LifeTime.SCOPED) {
      throw new Error("SCOPED não é suportado no container");
    }

    this.services.set(token, value);
    this.serviceLifeTime.set(token, lifeTime);
  }

  /**
   * Registra uma fábrica de serviço no container
   * @param token Nome do serviço
   * @param factory Função que cria uma instância do serviço
   * @param lifeTime Escopo do serviço (singleton, scoped ou transient)
   */
  public registerFactory<T = unknown>(
    token: ProviderToken,
    factory: FactoryFn<T, this>,
    lifeTime: LifeTime = LifeTime.SINGLETON,
  ): void {
    if (this.bootstraping) {
      throw new Error(
        "Não é possível registrar serviços durante a inicialização",
      );
    }

    this.serviceFactories.set(token, factory);
    this.serviceLifeTime.set(token, lifeTime);
  }

  /**
   * Obtém ou cria um escopo de serviços
   * @param scopeId ID do escopo
   * @returns Map contendo os serviços no escopo
   */
  public getScope(scopeId: string): Map<ProviderToken, unknown> {
    const scopeServices = this.scopedServices.get(scopeId);
    if (scopeServices) {
      return scopeServices;
    }

    this.createScope(scopeId);
    return this.scopedServices.get(scopeId)!;
  }

  /**
   * Cria um novo escopo para serviços
   * @returns ID do escopo criado
   */
  public createScope(scopeId?: string): string {
    scopeId = scopeId || crypto.randomUUID();
    this.scopedServices.set(scopeId, new Map());
    return scopeId;
  }

  /**
   * Limpa um escopo específico, liberando seus recursos
   * @param scopeId ID do escopo
   */
  public clearScope(scopeId: string): void {
    this.scopedServices.delete(scopeId);
  }

  /**
   * Obtém um serviço do container baseado no nome e no escopo
   * @param token Nome do serviço
   * @param scopeId ID do escopo (obrigatório para serviços com escopo)
   * @returns Instância do serviço
   */
  public getByScope<T>(token: ProviderToken, scopeId: string): T {
    const scope = this.serviceLifeTime.get(token);

    if (scope !== LifeTime.SCOPED) {
      return this.get<T>(token);
    }

    const scopeServices = this.getScope(scopeId);

    // Verifica se o serviço já existe no escopo atual
    if (scopeServices.has(token)) {
      return scopeServices.get(token) as T;
    }

    // Cria uma nova instância do serviço para o escopo atual
    if (this.serviceFactories.has(token)) {
      const factory = this.serviceFactories.get(token)!;
      const instance = factory(this);
      scopeServices.set(token, instance);
      return instance as T;
    }

    throw new Error(
      `Escopo de serviço '${String(token)}' não encontrado no container`,
    );
  }

  /**
   * Obtém um serviço do container
   * @param token Nome do serviço
   * @returns Instância do serviço
   */
  public get<T>(token: ProviderToken): T {
    const scope = this.serviceLifeTime.get(token);
    const tokenName = this.tokenToString(token);

    // Se for um serviço com escopo, lança erro pois precisamos do scopeId
    if (scope === LifeTime.SCOPED) {
      throw new Error(
        `O serviço '${tokenName}' requer um escopo. Use getByScope(name, scopeId) em vez disso.`,
      );
    }

    // Verifica se o serviço existe como singleton
    if (this.services.has(token)) {
      return this.services.get(token) as T;
    }

    // Verifica se existe uma fábrica para o serviço
    if (this.serviceFactories.has(token)) {
      const factory = this.serviceFactories.get(token)!;
      const scope = this.serviceLifeTime.get(token)!;
      const instance = factory(this);

      // Para serviços singleton, armazena a instância
      if (scope === LifeTime.SINGLETON) {
        this.services.set(token, instance);
      }

      return instance as T;
    }

    if (!this.bootstraping) {
      throw new Error(
        `Serviço '${tokenName}' não registrado no container pois aplicação não foi inicializada`,
      );
    }

    throw new Error(`Serviço '${tokenName}' não encontrado no container`);
  }

  public use<T>(
    // deno-lint-ignore no-explicit-any
    provider: ProviderToken | (new (...args: any) => T),
    scopeId?: string,
  ): T {
    return scopeId
      ? this.getByScope<T>(provider, scopeId)
      : this.get<T>(provider);
  }

  public useFactory<T = unknown>(
    factory: FactoryFn<T, this>,
    lifeTime: LifeTime = LifeTime.SINGLETON,
    token: ProviderToken = Symbol(),
  ): UseFactoryFn<T> {
    this.registerFactory(token, factory, lifeTime);
    return () => this.get<T>(token);
  }

  /**
   * Registra todos os serviços registrados
   */
  public async registerServices(): Promise<void> {
    if (this.registering) {
      return;
    }

    this.registering = true;

    for await (const [token, service] of this.services.entries()) {
      if (
        typeof service === "object" && service !== null &&
        "onApplicationRegister" in service &&
        typeof service.onApplicationRegister === "function"
      ) {
        console.info(
          `[IoC::${this.namespace}] ⚙️ Registering serviço: ${
            this.tokenToString(token)
          }`,
        );
        await service.onApplicationRegister();
      }
    }

    const initPromises: Promise<void>[] = [];

    for (const [token, factory] of this.serviceFactories.entries()) {
      const scope = this.serviceLifeTime.get(token)!;

      if (scope === LifeTime.SINGLETON && !this.services.has(token)) {
        const instance = factory(this);
        this.services.set(token, instance);

        if (
          typeof instance === "object" && instance !== null &&
          "onApplicationRegister" in instance &&
          typeof instance.onApplicationRegister === "function"
        ) {
          console.info(
            `[IoC::${this.namespace}] 🏭 Registering serviço factory: ${
              this.tokenToString(token)
            }`,
          );
          initPromises.push(instance.onApplicationRegister());
        }
      }
    }

    await Promise.all(initPromises);
    this.registering = false;
  }

  /**
   * Inicializa todos os serviços registrados
   */
  public async bootstrapServices(): Promise<void> {
    if (this.bootstraping) {
      return;
    }

    this.bootstraping = true;

    // Inicializa serviços registrados diretamente
    for await (const [token, service] of this.services.entries()) {
      if (
        typeof service === "object" && service !== null &&
        "onApplicationBootstrap" in service &&
        typeof service.onApplicationBootstrap === "function"
      ) {
        console.info(
          `[IoC::${this.namespace}] ⚙️ Bootstrap serviço: ${
            this.tokenToString(token)
          }`,
        );
        await service.onApplicationBootstrap();
      }
    }

    const initPromises: Promise<void>[] = [];

    // Inicializa serviços singleton que foram registrados via factory
    for (const [token, factory] of this.serviceFactories.entries()) {
      const scope = this.serviceLifeTime.get(token)!;

      if (scope === LifeTime.SINGLETON && !this.services.has(token)) {
        const instance = factory(this);
        this.services.set(token, instance);

        if (
          typeof instance === "object" && instance !== null &&
          "onApplicationBootstrap" in instance &&
          typeof instance.onApplicationBootstrap === "function"
        ) {
          console.info(
            `[IoC::${this.namespace}] 🏭 Bootstrap serviço factory: ${
              this.tokenToString(token)
            }`,
          );
          initPromises.push(instance.onApplicationBootstrap());
        }
      }
    }

    await Promise.all(initPromises);
    this.bootstraping = false;
  }

  /**
   * Desliga todos os serviços registrados
   */
  public async shutdownServices(signal: string): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];

    // Desliga serviços registrados
    for await (const [token, service] of this.services.entries()) {
      if (
        typeof service === "object" && service !== null &&
        "onApplicationShutdown" in service &&
        typeof service.onApplicationShutdown === "function"
      ) {
        console.info(
          `[IoC::${this.namespace}] 🛑 Shutdown serviço: ${
            this.tokenToString(token)
          }`,
        );
        shutdownPromises.push(service.onApplicationShutdown(signal));
      }
    }

    await Promise.all(shutdownPromises);

    // Limpa as referências
    this.services.clear();
    this.scopedServices.clear();
  }

  private tokenToString(token: ProviderToken): string {
    return typeof token === "function" ? token.name : String(token);
  }
}
