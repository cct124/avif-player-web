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
export declare class WorkerEventEmitter<M> {
    private eventListeners;
    constructor();
    send<T extends keyof M>(channel: T, data: M[T], arrayBuffer?: ArrayBuffer): void;
    on<T extends keyof M>(channel: T, handler: (data: M[T], arrayBuffer?: ArrayBuffer) => void): void;
    /**
     * 为给定事件添加一次性侦听器。
     * @param channel 频道
     * @param listener 事件回调
     * @returns
     */
    once<T extends keyof M>(channel: T, handler: (data: M[T], arrayBuffer?: ArrayBuffer) => void): this;
    clear<T extends keyof M>(channel: T, handler: (data: M[T]) => void): boolean;
    private listen;
}
