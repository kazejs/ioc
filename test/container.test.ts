import { assertEquals } from "@std/assert";

import {
  Container,
  type FactoryFn,
  LifeTime,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "../src/mod.ts";
import { IoC } from "../src/ioc.ts";

import { StubService } from "./stubs/stub.service.ts";

const container = IoC.create("test");

const TOKEN_A = Symbol("A");
const TOKEN_B = "B";

container.registerValue(TOKEN_A, "AA");
container.registerValue(TOKEN_B, "BB");
container.registerValue(StubService, new StubService());

await container.initializeServices();

Deno.test("Use token A", function addTest() {
  const value = container.use(TOKEN_A);

  assertEquals(value, "AA");
});

Deno.test("Use token B", function addTest() {
  const value = container.use(TOKEN_B);

  assertEquals(value, "BB");
});

Deno.test("Use service", function addTest() {
  const service = container.use(StubService);

  assertEquals(service.foo(), "bar");
});

Deno.test("Use factory with SINGLETON", function addTest() {
  let times = 0;

  const fn: FactoryFn<string> = () => {
    times++;
    return "BILU";
  };

  container.registerFactory("FF_SINGLETON", fn);

  const value1 = container.use("FF_SINGLETON");
  assertEquals(value1, "BILU");
  assertEquals(times, 1);

  const value2 = container.use("FF_SINGLETON");
  assertEquals(value2, "BILU");
  assertEquals(times, 1);
});

Deno.test("Use factory with TRANSIENT", function addTest() {
  let times = 0;

  const fn: FactoryFn<string> = () => {
    times++;
    return "BILU";
  };

  container.registerFactory("FF_TRANSIENT", fn, LifeTime.TRANSIENT);

  const value1 = container.use("FF_TRANSIENT");
  assertEquals(value1, "BILU");
  assertEquals(times, 1);

  const value2 = container.use("FF_TRANSIENT");
  assertEquals(value2, "BILU");
  assertEquals(times, 2);
});

Deno.test("Use factory with SCOPED", function scopedTest() {
  let times = 0;

  class ScopedService {
    id: number;
    constructor() {
      this.id = ++times;
    }
  }

  const fn: FactoryFn<ScopedService> = () => {
    return new ScopedService();
  };

  container.registerFactory("FF_SCOPED", fn, LifeTime.SCOPED);

  const scope1 = "sc1";
  const scope2 = "sc2";

  const a = container.getByScope<ScopedService>("FF_SCOPED", scope1);
  const b = container.getByScope<ScopedService>("FF_SCOPED", scope2);
  const c = container.getByScope<ScopedService>("FF_SCOPED", scope1);

  // Cada chamada deve retornar uma nova instância
  assertEquals(a instanceof ScopedService, true);
  assertEquals(b instanceof ScopedService, true);
  assertEquals(c instanceof ScopedService, true);
  assertEquals(a !== b, true);
  assertEquals(a === c, true);
  assertEquals(a.id !== b.id, true);
  assertEquals(a.id === c.id, true);
  assertEquals(times, 2);
});

Deno.test("Register with SINGLETON", function scopedTest() {
  let times = 0;

  class ScopedService {
    id: number;
    constructor() {
      this.id = ++times;
    }
  }

  const fn: FactoryFn<ScopedService> = () => {
    return new ScopedService();
  };

  container.register({
    token: "R_1",
    useValue: "Fodax",
  });

  container.register({
    token: "R_2",
    useFactory: fn,
  });

  container.register({
    token: "R_3",
    useFactory: fn,
    lifeTime: LifeTime.TRANSIENT,
  });

  container.register({
    token: ScopedService,
    useClass: ScopedService,
  });

  const a = container.use("R_1");
  const b1 = container.use(ScopedService);
  const b2 = container.use(ScopedService);
  const c1 = container.use<ScopedService>("R_2");
  const c2 = container.use<ScopedService>("R_2");
  const d1 = container.use<ScopedService>("R_3");
  const d2 = container.use<ScopedService>("R_3");

  assertEquals(a, "Fodax");
  assertEquals(b1.id, 1);
  assertEquals(b2.id, 1);
  assertEquals(c1.id, 2);
  assertEquals(c2.id, 2);
  assertEquals(d1.id, 3);
  assertEquals(d2.id, 4);
});

Deno.test("Register without token", function scopedTest() {
  const token = container.register({
    useValue: "Fodax",
  });

  const value = container.use(token);
  assertEquals(value, "Fodax");
});

Deno.test("Container lifecycle", async function hasTest() {
  const calledFn = {
    onApplicationBootstrapCalled: false,
    onApplicationShutdownCalled: false,
  };

  class FakeService implements OnApplicationShutdown, OnApplicationBootstrap {
    onApplicationBootstrap(): void {
      calledFn.onApplicationBootstrapCalled = true;
      return undefined;
    }

    onApplicationShutdown(): void {
      calledFn.onApplicationShutdownCalled = true;
      return undefined;
    }
  }

  const ioc = IoC.create("lifecycle-test");
  ioc.registerValue(FakeService, new FakeService());

  // Testando o bootstrap
  await ioc.initializeServices();
  assertEquals(calledFn.onApplicationBootstrapCalled, true);
  assertEquals(calledFn.onApplicationShutdownCalled, false);

  // Resetando os valores
  calledFn.onApplicationBootstrapCalled = false;
  calledFn.onApplicationShutdownCalled = false;

  // Testando o shutdown
  await ioc.shutdownServices("SIGINT");
  assertEquals(calledFn.onApplicationBootstrapCalled, false);
  assertEquals(calledFn.onApplicationShutdownCalled, true);
});

Deno.test("useFactory", function hasTest() {
  class DepContainer extends Container {
    get stub(): StubService {
      return this.use(StubService);
    }
  }

  const ioc = new DepContainer();

  ioc.registerValue(StubService, new StubService("Ahoi"));

  let times = 0;

  const value = ioc.useFactory((c) => {
    times++;
    return c.stub.foo();
  });

  assertEquals(value(), "Ahoi");
  assertEquals(value(), "Ahoi");
  assertEquals(times, 1);
});

// await container.shutdownServices();
