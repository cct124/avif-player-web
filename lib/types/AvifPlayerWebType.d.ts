/**
 * 可选配置项
 */
export interface AvifPlayerWebOptions {
    canvas?: string | HTMLCanvasElement;
    /**
     * 启用webgl api渲染
     */
    webgl?: boolean;
    /**
     * 循环播放次数，0表示无限循环播放，默认1
     */
    loop?: number;
    /**
     * 初始化完成后立即播放
     */
    autoplay?: boolean;
    /**
     * 实例化对象时立刻初始化解码器，默认false
     */
    initDecoderInstantly?: boolean;
    /**
     * 实例化对象时立刻初始化解码器并解析AVIF文件，默认false
     */
    initDecoderAvifInstantly?: boolean;
    /**
     * 是否开启异步解码，开启这个播放系统将尽可能的解码每一帧，播放将会更流畅，副作用是占用内存大，暂停后重新播放时可能有延迟，默认false
     */
    async?: boolean;
}
export declare enum AvifPlayerWebMessageType {
}
export interface AvifPlayerWebEventMap {
}
