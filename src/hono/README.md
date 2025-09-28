# Hono Middleware for IoC

Este diretório contém o middleware opcional para integração com o framework
[Hono](https://hono.dev/).

## Instalação

Para usar o middleware do Hono, você precisa instalar o Hono separadamente:

```bash
# Para Deno
deno add npm:hono

# Para Node.js
npm install hono
```

## Uso

```typescript
import { Hono } from "hono";
import { IoC } from "@kazejs/ioc";
import { contextIoC } from "@kazejs/ioc/hono";

const app = new Hono();
const container = IoC.create("app");

// Adiciona o middleware IoC
app.use("*", contextIoC(container));

// Em suas rotas, você pode acessar o container
app.get("/", (c) => {
  const myService = c.var.use(MyService);
  return c.json({ message: myService.getMessage() });
});
```

## Recursos

- **Scoped Services**: Cada requisição tem seu próprio escopo
- **Injeção Automática**: O container e função `use` são injetados no contexto
- **Cleanup Automático**: O escopo é limpo automaticamente após a requisição

## Variáveis Injetadas

O middleware injeta as seguintes variáveis no contexto da requisição:

- `ioc`: O container IoC
- `scopeId`: ID do escopo atual
- `use`: Função para resolver dependências no escopo atual
