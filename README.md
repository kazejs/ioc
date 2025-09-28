# Injeção de Dependências (IoC)

Biblioteca standalone, sem dependências externas, para Injeção de Dependências
(IoC) em aplicações Deno/NodeJS/TypeScript, com suporte a namespaces, escopos e
lifecycle hooks.

Inclui middleware para integração com frameworks web como Hono.

## Visão Geral

Container de inversão de controle para gerenciamento de dependências:

- Registro de serviços com diferentes ciclos de vida
- Suporte a namespaces isolados
- Injeção automática em contexto de requisições
- Gerenciamento de escopos (singleton, scoped, transient)
- Lifecycle hooks para inicialização e finalização

## Tipos de LifeTime

```typescript
enum LifeTime {
  SINGLETON = "singleton", // Uma instância para toda a aplicação
  SCOPED = "scope", // Uma instância por escopo (por requisição)
  TRANSIENT = "transient", // Nova instância a cada solicitação
}
```

## API Principal

### IoC (Classe estática)

Ponto de acesso global para gerenciamento de containers:

```typescript
import { IoC, LifeTime } from "@kazejs/ioc/mod.ts";

// Registrar provider
IoC.register({
  token: "myService",
  useValue: new MyService(),
  lifeTime: LifeTime.SINGLETON,
});

// Usar serviço
const service = IoC.use<MyService>("myService");

// Trabalhar com namespaces
IoC.register({ token: "db", useValue: dbService }, "database");
const db = IoC.use("db", "database");
```

### Container

Implementação do container de DI:

```typescript
import { Container, LifeTime } from "@kazejs/ioc/mod.ts";

const container = new Container("myApp");

// Registrar por valor
container.registerValue("config", { port: 3000 }, LifeTime.SINGLETON);

// Registrar por factory
container.registerFactory(
  "logger",
  (c) => new Logger(c.get("config")),
  LifeTime.SINGLETON,
);

// Obter serviços
const config = container.get("config");
const logger = container.get("logger");

// Trabalhar com escopos
const scopeId = container.createScope();
const scopedService = container.getByScope("scopedService", scopeId);
container.clearScope(scopeId);
```

## Lifecycle Hooks

Serviços podem implementar hooks de inicialização e finalização:

```typescript
import {
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@kazejs/ioc/mod.ts";

class DatabaseService implements OnApplicationBootstrap, OnApplicationShutdown {
  private connection: any;

  // Hook de inicialização
  async onApplicationBootstrap(): Promise<void> {
    console.log("Inicializando conexão com banco de dados...");
    this.connection = await this.connect();
  }

  // Hook de finalização
  async onApplicationShutdown(): Promise<void> {
    console.log("Fechando conexão com banco de dados...");
    await this.connection.close();
  }

  private async connect() {
    // Lógica de conexão
    return {
      close: async () => {
      },
    };
  }

  query(sql: string) {
    return this.connection.query(sql);
  }
}

// Registro
IoC.register({
  token: "database",
  useClass: DatabaseService,
  lifeTime: LifeTime.SINGLETON,
});

// Os hooks são chamados automaticamente
const container = IoC.create("default");
await container.initializeServices(); // Chama onApplicationBootstrap
await container.shutdownServices(); // Chama onApplicationShutdown
```

## Middleware para Hono

Injeção automática de IoC no contexto de requisições:

```typescript
import { Hono } from "hono";
import { IoC, iocMiddleware } from "@kazejs/ioc/mod.ts";

const app = new Hono();
const container = IoC.ns("default");

app.use(iocMiddleware(container));

app.get("/", (c) => {
  // Acessar container
  const ioc = c.var.ioc; // ou c.get("ioc");

  // Usar função helper (com escopo automático)
  const service = c.var.ioc.use<MyService>("myService");

  return c.json({ message: "OK" });
});
```

## Padrões de Uso

### 1. Registro de Serviços

```typescript
// Por valor
IoC.register({
  token: "config",
  useValue: { port: 3000, host: "localhost" },
});

// Por classe
IoC.register({
  token: "logger",
  useClass: ConsoleLogger,
  lifeTime: LifeTime.SINGLETON,
});

// Por factory
IoC.register({
  token: "database",
  useFactory: (c) => new Database(c.use("config")),
  lifeTime: LifeTime.SINGLETON,
});

// Factory inline com useFactory()
const useDemo = ioc.useFactory((c) => {
  times++;
  return c.stub.foo();
});

const service = useDemo();
```

### 2. Tokens de Serviço

```typescript
// String
IoC.register({ token: "logger", useClass: Logger });
const logger = IoC.use<Logger>("logger");

// Symbol
const DB_TOKEN = Symbol("database");
IoC.register({ token: DB_TOKEN, useClass: Database });
const db = IoC.use<Database>(DB_TOKEN);

// Construtor
IoC.register({ token: Logger, useClass: Logger });
const logger = IoC.use(Logger);
```

### 3. Serviços com Escopo

```typescript
// Registro
IoC.register({
  token: "requestService",
  useFactory: () => new RequestService(),
  lifeTime: LifeTime.SCOPED,
});

// Uso em middleware Hono (escopo automático)
app.get("/", (c) => {
  const service = c.get("use")<RequestService>("requestService");
  // Mesmo serviço durante toda a requisição
});

// Uso manual com escopo
const container = IoC.ns("default");
const scopeId = container.createScope();
const service1 = container.getByScope("requestService", scopeId);
const service2 = container.getByScope("requestService", scopeId);
// service1 === service2
container.clearScope(scopeId);
```

### 4. Inicialização e Shutdown

```typescript
const container = IoC.ns("default");

// Inicializar todos os serviços
await container.initializeServices();

// Finalizar todos os serviços
await container.shutdownServices();
```

## Exemplo Completo

```typescript
import { Hono } from "hono";
import {
  IoC,
  iocMiddleware,
  LifeTime,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@kazejs/ioc/mod.ts";
import {} from "@kazejs/ioc/mod.ts";

// Serviços com Lifecycle
class Logger implements OnApplicationBootstrap {
  async onApplicationBootstrap() {
    console.log("Logger inicializado");
  }

  log(message: string) {
    console.log(message);
  }
}

class DatabaseService implements OnApplicationBootstrap, OnApplicationShutdown {
  private connection: any;

  async onApplicationBootstrap() {
    console.log("Conectando ao banco de dados...");
    this.connection = { query: (sql: string) => [] };
  }

  async onApplicationShutdown() {
    console.log("Desconectando do banco de dados...");
  }

  query(sql: string) {
    return this.connection.query(sql);
  }
}

// Aplicação
const app = new Hono();
const container = IoC.ns("default");

// Registro direto
IoC.register({
  token: "logger",
  useClass: Logger,
  lifeTime: LifeTime.SINGLETON,
});

IoC.register({
  token: "database",
  useClass: DatabaseService,
  lifeTime: LifeTime.SINGLETON,
});

// Inicialização (chama lifecycle hooks)
await container.initializeServices();

// Middleware
app.use(iocMiddleware(container));

// Rotas
app.get("/", (c) => {
  const logger = c.var.ioc.use<Logger>("logger");
  const db = c.var.ioc.use<DatabaseService>("database");

  logger.log("Requisição recebida");
  const data = db.query("SELECT * FROM users");

  return c.json(data);
});

// Cleanup (chama lifecycle hooks)
process.on("SIGINT", async () => {
  await container.shutdownServices();
  process.exit(0);
});
```

## Namespaces

Isolamento de containers por contexto:

```typescript
// Container padrão
IoC.register({ token: "service", useClass: Service });

// Container específico
IoC.register({ token: "service", useClass: TestService }, "test");

// Uso
const prodService = IoC.use("service"); // default namespace
const testService = IoC.use("service", "test"); // test namespace

// Acesso direto a namespace
const testContainer = IoC.ns("test");
testContainer.register({ token: "custom", useValue: {} });
```

## Contribuições

Contribuições são bem-vindas! Por favor, abra uma issue ou envie um pull
request.
