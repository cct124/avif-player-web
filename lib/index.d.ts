import { SoftAvifWebOptions } from "./types/SoftAvifWebType";
export default class SoftAvifWeb {
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
    private avifFileUint8Array?;
    /**
     * 解码数据唯一值
     */
    decodeSymbolId?: string;
    constructor(url: string | Uint8Array, canvas: string | HTMLCanvasElement | SoftAvifWebOptions, option?: SoftAvifWebOptions);
    decoder(url: string | Uint8Array): Promise<void>;
    /**
     * 获取avif文件的Uint8Array数据
     * @param url
     * @returns
     */
    private fillArrayBuffer;
    fetchFileArrayBuffer(url: string): Promise<ArrayBuffer>;
    private checkConstructor;
}
