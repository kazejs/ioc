export interface OnApplicationBootstrap {
  /**
   * Method called during application bootstrap.
   */
  onApplicationBootstrap(): void | Promise<void>;
}

export interface OnApplicationShutdown {
  /**
   * Method called during application shutdown.
   * @param signal The shutdown signal (e.g., 'SIGINT', 'SIGTERM').
   */
  onApplicationShutdown(signal: string): void | Promise<void>;
}
