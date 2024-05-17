// export interface MessageEventType<T, E> {
//   channel: T;
//   data: E;
// }

export type MessageEventType<T, E> = [T, E, ArrayBuffer | undefined];
