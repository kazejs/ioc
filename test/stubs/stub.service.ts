import type {
  OnApplicationBootstrap,
  OnApplicationRegister,
  OnApplicationShutdown,
} from "../../src/mod.ts";

export class StubService
  implements
    OnApplicationRegister,
    OnApplicationBootstrap,
    OnApplicationShutdown {
  constructor(private readonly world: string = "bar") {
  }

  onApplicationRegister(): void | Promise<void> {
    console.log("StubService::onApplicationRegister");
    return undefined;
  }

  onApplicationBootstrap(): void | Promise<void> {
    console.log("StubService::onApplicationBootstrap");
    return undefined;
  }

  onApplicationShutdown(signal: string): void | Promise<void> {
    console.log("StubService::onApplicationShutdown", signal);
    return undefined;
  }

  foo() {
    return this.world;
  }
}
