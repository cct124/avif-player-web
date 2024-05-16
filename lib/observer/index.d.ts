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
    once<T extends keyof M>(channel: T, listener: (this: this, ev: M[T]) => void): this;
    /**
     * 删除监听的事件
     * @param channel
     * @param handler
     * @returns
     */
    clear<T extends keyof M>(channel: T, handler: (data: M[T]) => void): boolean;
}
export declare class MainEventEmitter<W, M> extends Observer<M> {
    private workerListeners;
    worker: Worker;
    constructor(url: string);
    /**
     * 发送事件到Worker线程
     * @param channel
     * @param data
     * @param args
     */
    postMessage<T extends keyof W>(channel: T, data: W[T], ...args: any[]): void;
    /**
     * 为给定的Worker线程事件添加一次性侦听器。
     * @param channel 频道
     * @param handler 事件回调
     * @returns
     */
    onmessageOnce<T extends keyof W>(channel: T, handler: (this: this, ev: W[T]) => void): this;
    /**
     * 清除Worker线程事件
     * @param channel
     * @param handler
     * @returns
     */
    clearOnmessage<T extends keyof W>(channel: T, handler: (data: W[T]) => void): boolean;
    /**
     * 监听Worker线程发送的事件
     * @param channel
     * @param handler
     */
    onmessage<T extends keyof W>(channel: T, handler: (data: W[T]) => void): void;
    private listenOnmessage;
}
export declare class WorkerEventEmitter<M> {
    private eventListeners;
    constructor();
    send<T extends keyof M>(channel: T, data: M[T], ...args: any[]): void;
    on<T extends keyof M>(channel: T, handler: (data: M[T]) => void): void;
    /**
     * 为给定事件添加一次性侦听器。
     * @param channel 频道
     * @param listener 事件回调
     * @returns
     */
    once<T extends keyof M>(channel: T, listener: (this: this, ev: M[T]) => void): this;
    clear<T extends keyof M>(channel: T, handler: (data: M[T]) => void): boolean;
    private listen;
}
