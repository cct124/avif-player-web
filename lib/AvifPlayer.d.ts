import { AvifPlayerWebOptions } from "./types/AvifPlayerWebType";
import { LibavifDecoder } from "./Decoder/LibavifDecoder";
import { Observer } from "./Observer";
import { AvifPlayerWebEventMap } from "./types";
export default class AvifPlayer extends Observer<AvifPlayerWebEventMap> {
    url: string | Uint8Array;
    /**
     * 可选配置
     */
    private option;
    /**
     * DecoderManager的管理对象，这个是全局共享的，注册到`window._AvifPlayerWebDecoderManager`
     */
    /**
     * avif的Uint8Array文件数据
     */
    private avifFileArrayBuffer?;
    /**
     * 唯一资源标识
     */
    resourceSymbolId?: string;
    /**
     * 播放对象
     */
    private animationPlayback;
    /**
     * 是否支持av1视频编码
     */
    private av1Support;
    libavifDecoder: LibavifDecoder;
    constructor(url: string | Uint8Array, canvas: string | HTMLCanvasElement | AvifPlayerWebOptions, option?: AvifPlayerWebOptions);
    pause(): void;
    play(): void;
    private decoderParsePlay;
    /**
     * 获取avif文件的Uint8Array数据
     * @param url
     * @returns
     */
    private fillArrayBuffer;
    private fetchFileArrayBuffer;
    /**
     * 检查构造参数
     * @param url
     * @param option
     */
    private checkConstructor;
    /**
     * 判断是否支持av1视频编码
     * @returns
     */
    hasAv1Support(): boolean;
}
