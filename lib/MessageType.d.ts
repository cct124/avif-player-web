export declare enum MessageType {
    initial = 1,
    fileLoadedSuccessfully = 0
}
export interface MessageEvent<T> {
    type: MessageType;
    event: T;
}
export interface FileLoadedSuccessfully {
    name: string;
    arrayBufff: Uint8Array;
}
export declare const EventMap: {
    0: {
        new (type: string, eventInitDict?: MessageEventInit<FileLoadedSuccessfully> | undefined): globalThis.MessageEvent<FileLoadedSuccessfully>;
        prototype: globalThis.MessageEvent<any>;
    };
    1: {
        new (type: string, eventInitDict?: MessageEventInit<string> | undefined): globalThis.MessageEvent<string>;
        prototype: globalThis.MessageEvent<any>;
    };
};
