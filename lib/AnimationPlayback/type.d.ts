export declare enum PlayChannelType {
    frameIndexChange = 1
}
export interface PlayEventMap {
    [PlayChannelType.frameIndexChange]: number;
}
