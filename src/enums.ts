/**
 * Escopo dos serviços no container
 *
 * SINGLETON - Uma única instância é criada e reutilizada para toda a aplicação
 * SCOPED - Uma nova instância é criada por escopo. Ex: a cada request
 * TRANSIENT - Uma nova instância é criada a cada vez que o serviço é solicitado
 */
export enum LifeTime {
  SINGLETON = "singleton",
  SCOPED = "scope",
  TRANSIENT = "transient",
}
