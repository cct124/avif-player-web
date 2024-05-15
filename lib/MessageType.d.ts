export interface MessageEvent<T, E> {
    type: T;
    event: E;
}
export declare enum WorkerMessageType {
    initial = 1,
    fileLoadedSuccessfully = 0
}
export interface FileLoadedSuccessfully {
    name: string;
    arrayBufff: Uint8Array;
}
export interface WorkerEventMap {
    [WorkerMessageType.fileLoadedSuccessfully]: MessageEvent<WorkerMessageType, FileLoadedSuccessfully>;
    [WorkerMessageType.initial]: MessageEvent<WorkerMessageType, string>;
}
