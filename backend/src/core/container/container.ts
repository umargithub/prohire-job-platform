type Factory<T> = () => T;

class Container {
  private readonly registry = new Map<string, unknown>();

  register<T>(key: string, factory: Factory<T>): void {
    this.registry.set(key, factory());
  }

  resolve<T>(key: string): T {
    const instance = this.registry.get(key);
    if (!instance) throw new Error(`Dependency not registered: ${key}`);
    return instance as T;
  }
}

export const container = new Container();
