import { SoftAvifWebOptions } from "./types/SoftAvifWebType";
export default class SoftAvifWeb {
    url: string | Uint8Array;
    /**
     * 可选配置
     */
    private option;
    /**
     * DecoderManager的管理对象，这个是全局共享的，注册到`window._SoftAvifWebDecoderManager`
     */
    private decoderManager;
    /**
     * avif的Uint8Array文件数据
     */
    private avifFileArrayBuffer?;
    /**
     * 解码数据唯一值
     */
    decodeSymbolId?: string;
    private avifPlay;
    constructor(url: string | Uint8Array, canvas: string | HTMLCanvasElement | SoftAvifWebOptions, option?: SoftAvifWebOptions);
    play(): void;
    private decoder;
    /**
     * 获取avif文件的Uint8Array数据
     * @param url
     * @returns
     */
    private fillArrayBuffer;
    private fetchFileArrayBuffer;
    private checkConstructor;
}
