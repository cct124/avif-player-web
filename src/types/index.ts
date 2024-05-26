// export interface MessageEventType<T, E> {
//   channel: T;
//   data: E;
// }

export type MessageEventType<T, E> = [T, E, ArrayBuffer | undefined];

export enum SoftAvifWebChannel {
  error = 0,
  play = 1,
  pause = 2,
  end = 3,
}

export interface SoftAvifWebEventMap {
  [SoftAvifWebChannel.error]: Error | ErrorEvent;
  [SoftAvifWebChannel.play]: boolean;
  [SoftAvifWebChannel.end]: boolean;
  [SoftAvifWebChannel.pause]: boolean;
}
