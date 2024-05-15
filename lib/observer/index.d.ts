export declare class MainEventEmitter<M> {
    private eventListeners;
    worker: Worker;
    constructor(url: string);
    send<T extends keyof M>(channel: T, data: M[T]): void;
    on<T extends keyof M>(channel: T, handler: (data: M[T]) => void): void;
    private listen;
}
export declare class WorkerEventEmitter<M> {
    private eventListeners;
    constructor();
    send<T extends keyof M>(channel: T, data: M[T]): void;
    on<T extends keyof M>(channel: T, handler: (data: M[T]) => void): void;
    private listen;
}
