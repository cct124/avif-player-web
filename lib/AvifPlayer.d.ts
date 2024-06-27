import { AvifPlayerWebOptions, Source } from "./types/AvifPlayerWebType";
import { LibavifDecoder } from "./Decoder/LibavifDecoder";
import { Observer } from "./Observer";
import { AvifPlayerWebEventMap, AvifPlayerSourceType, PlayOptions } from "./types";
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
     * 当前播放的资源id，默认是sources资源数组的第一个
     */
    playSourceId: string;
    constructor(url: string | ArrayBuffer | AvifPlayerWebOptions, canvas?: string | HTMLCanvasElement | AvifPlayerWebOptions, option?: AvifPlayerWebOptions);
    /**
     * 合并默认配置项
     * @param options
     * @returns
     */
    mixinOptions(options: AvifPlayerWebOptions): AvifPlayerWebOptions;
    initialLibavifDecoder(reset?: boolean): Promise<LibavifDecoder>;
    /**
     * 切换播放的资源
     * @param id 动画id
     * @param index 帧索引
     */
    switch(id: number | string, index?: number): void;
    pause(index?: number): void;
    play(index?: number | PlayOptions): Promise<void>;
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
    /**
     * 判断是否支持av1视频编码
     * @returns
     */
    hasAv1Support(): boolean;
    setCanvasSize(): void;
    sourcesHandle(sources: Sources): AvifPlayerSourceType[];
    /**
     * 销毁解码器`Worker`线程
     *
     * 播放将暂停帧索引重置为0
     */
    destroy(): void;
}
export {};
