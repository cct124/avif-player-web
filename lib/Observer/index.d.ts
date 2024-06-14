export declare class Observer<M> {
    private eventListeners;
    constructor();
    /**
     * 监听事件
     * @param channel
     * @param handler
     */
    on<T extends keyof M>(channel: T, handler: (data: M[T]) => void): this;
    /**
     * 发送事件
     * @param channel
     * @param data
     */
    emit<T extends keyof M>(channel: T, data: M[T]): this;
    /**
     * 为给定事件添加一次性监听器。
     * @param channel 频道
     * @param listener 事件回调
     * @returns
     */
    once<T extends keyof M>(channel: T, handler: (data: M[T], arrayBuffer?: ArrayBuffer) => void): this;
    /**
     * 删除监听的事件
     * @param channel
     * @param handler
     * @returns
     */
    clear<T extends keyof M>(channel: T, handler: (data: M[T]) => void): boolean;
    clearAll<T extends keyof M>(channel?: T): void;
}
export declare class WorkerEventEmitter<M, C, W> extends Observer<W> {
    private workerEventListeners;
    constructor();
    postMessage<T extends keyof M, A extends keyof C>(channel: T | number, data: M[T] | C[A], arrayBuffer?: ArrayBuffer): void;
    onmessage<T extends keyof M = keyof M>(channel: T, handler: (data: M[T], arrayBuffer?: ArrayBuffer, callback?: <A extends keyof C>(data: C[A], arrayBuffer?: ArrayBuffer) => void) => void): void;
    /**
     * 为给定事件添加一次性侦听器。
     * @param channel 频道
     * @param listener 事件回调
     * @returns
     */
    onmessageOnce<T extends keyof M>(channel: T, handler: (data: M[T], arrayBuffer?: ArrayBuffer) => void): this;
    clearOnmessage<T extends keyof M>(channel: T, handler: (data: M[T]) => void): boolean;
    private listen;
    callback<A extends keyof C>(callbackSymbol: number, channel?: string | number | symbol): (data: C[A], arrayBuffer?: ArrayBuffer) => void;
}
