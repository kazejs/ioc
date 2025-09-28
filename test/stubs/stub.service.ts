import type {
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@kaze/core/ioc/mod.ts";

export class StubService
  implements OnApplicationBootstrap, OnApplicationShutdown {
  constructor(private readonly world: string = "bar") {
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
