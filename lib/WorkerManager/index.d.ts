export default class WorkerManager<T> {
    workers: Map<string, T>;
    constructor();
    add(id: string, worker: T): Map<string, T> | undefined;
    get(id: string): T | undefined;
    has(id: string): boolean;
}
