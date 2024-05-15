export enum MessageType {
  initial = 1,
  fileLoadedSuccessfully = 0,
}

export interface MessageEvent<T> {
  type: MessageType;
  event: T;
}

export interface FileLoadedSuccessfully {
  name: string;
  arrayBufff: Uint8Array;
}

export interface EventMap {
  [MessageType.fileLoadedSuccessfully]: MessageEvent<FileLoadedSuccessfully>;
  [MessageType.initial]: MessageEvent<string>;
}
