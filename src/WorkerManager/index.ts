export default class WorkerManager<T> {
  workers = new Map<string, T>();
  constructor() {}

  add(id: string, worker: T) {
    if (this.has(id)) return;
    return this.workers.set(id, worker);
  }

  get(id: string) {
    return this.workers.get(id);
  }

  has(id: string) {
    return this.workers.has(id);
  }
}
