import { AvifPlayerWebOptions, Source } from "./types/AvifPlayerWebType";
import { LibavifDecoder } from "./Decoder/LibavifDecoder";
import { Observer } from "./Observer";
import { AvifPlayerWebEventMap, AvifPlayerSourceType, PlayOptions, AID_TYPE } from "./types";
type Sources = string | ArrayBuffer | Source[];
export default class AvifPlayer extends Observer<AvifPlayerWebEventMap> {
    /**
     * 可选配置
     */
    private option;
    /**
     * 播放对象
     */
    private animationPlayback;
    sources: AvifPlayerSourceType[];
    libavifDecoder: LibavifDecoder;
    /**
     * 当前播放的动画id
     */
    playingId: AID_TYPE;
    decoderStr: string;
    constructor(url: string | ArrayBuffer | AvifPlayerWebOptions, canvas?: string | HTMLCanvasElement | AvifPlayerWebOptions, option?: AvifPlayerWebOptions);
    initail(): Promise<void>;
    /**
     * 合并默认配置项
     * @param options
     * @returns
     */
    mixinOptions(options: AvifPlayerWebOptions): AvifPlayerWebOptions;
    /**
     *
     * @param reset 初始化解码器线程
     * @returns
     */
    initialLibavifDecoder(reset?: boolean): Promise<LibavifDecoder>;
    pause(index?: number): void;
    play(play?: number | PlayOptions): Promise<void>;
    private decoderParsePlay;
    private streamingArrayBuffer;
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
    setCanvasSize(): void;
    sourcesHandle(sources: Sources): AvifPlayerSourceType[];
    /**
     * 获取 source
     * @param id
     * @returns
     */
    findSource(id: AID_TYPE): AvifPlayerSourceType;
    /**
     * 销毁解码器`Worker`线程
     *
     * 播放将暂停帧索引重置为0
     */
    destroy(): void;
}
export {};
