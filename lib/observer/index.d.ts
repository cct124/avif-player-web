export declare class MainEventEmitter<M> {
    private eventListeners;
    worker: Worker;
    constructor(url: string);
    sendArrayBuffer<T extends keyof M>(channel: T, arrayBuffer: ArrayBuffer): void;
    send<T extends keyof M>(channel: T, data: M[T], ...args: any[]): void;
    on<T extends keyof M>(channel: T, handler: (data: M[T]) => void): void;
    private listen;
}
export declare class WorkerEventEmitter<M> {
    private eventListeners;
    constructor();
    send<T extends keyof M>(channel: T, data: M[T], ...args: any[]): void;
    on<T extends keyof M>(channel: T, handler: (data: M[T]) => void): void;
    private listen;
}
export declare class Observer<M> {
    private eventListeners;
    constructor();
    on<T extends keyof M>(channel: T, handler: (data: M[T]) => void): this;
    emit<T extends keyof M>(channel: T, data: M[T]): this;
    /**
     * 为给定事件添加一次性侦听器。
     * @param channel 频道
     * @param listener 事件回调
     * @returns
     */
    once<T extends keyof M>(channel: T, listener: (this: this, ev: M[T]) => void): this;
    clear<T extends keyof M>(channel: T, handler: (data: M[T]) => void): boolean;
}
