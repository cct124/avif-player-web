export declare class MainEventEmitter<M> {
    private eventListeners;
    worker: Worker;
    constructor(url: string);
    send<T extends keyof M>(channel: T, data: M[T]): void;
    on<T extends keyof M>(channel: T, handler: (data: M[T]) => void): void;
    private listen;
}
export declare class WorkerEventEmitter<E extends {
    [key: number]: E[keyof E];
}> {
    private eventListeners;
    constructor();
    send(channel: keyof E, data: E[keyof E]): void;
    on(channel: keyof E, handler: (data: E[keyof E]) => void): void;
    private listen;
}
