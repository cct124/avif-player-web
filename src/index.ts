import workerScript from "./Worker/worker";
import { MainEventEmitter } from "./Observer/index";
import DecoderManager from "./DecoderManager/index";
import { SoftAvifWebOptions } from "./types/SoftAvifWebType";
import { WorkerEventMap } from "./types/WorkerMessageType";
import { deepMixins } from "./utils";

const blob = new Blob([workerScript], { type: "text/javascript" });
const workerDecoderUrl = URL.createObjectURL(blob);

export default class SoftAvifWeb {
  /**
   * 可选配置
   */
  private option: SoftAvifWebOptions;
  /**
   * DecoderManager的管理对象，这个是全局共享的，注册到`window._SoftAvifWebDecoderManager`
   */
  private decoderManager: DecoderManager;
  /**
   * avif的Uint8Array文件数据
   */
  private avifFileUint8Array?: Uint8Array;
  /**
   * 解码数据唯一值
   */
  decodeSymbolId?: string;

  constructor(
    url: string | Uint8Array,
    canvas: string | HTMLCanvasElement | SoftAvifWebOptions,
    option: SoftAvifWebOptions = {}
  ) {
    if (typeof canvas === "string" || canvas instanceof HTMLCanvasElement) {
      option.canvas = canvas;
    } else if (canvas instanceof Object) {
      option = canvas;
    }
    this.option = deepMixins(option, {});
    this.checkConstructor(url, this.option);
    if (window._SoftAvifWebDecoderManager) {
      this.decoderManager = window._SoftAvifWebDecoderManager =
        new DecoderManager(workerDecoderUrl);
    } else {
      this.decoderManager = window._SoftAvifWebDecoderManager;
    }
    this.decoder(url);
  }

  async decoder(url: string | Uint8Array) {
    this.avifFileUint8Array = await this.fillArrayBuffer(url);
  }

  /**
   * 获取avif文件的Uint8Array数据
   * @param url
   * @returns
   */
  private async fillArrayBuffer(url: string | Uint8Array) {
    if (typeof url === "string") {
      const arrayBuffer = await this.fetchFileArrayBuffer(url);
      return new Uint8Array(arrayBuffer);
    } else if (url instanceof Uint8Array) {
      return url;
    } else {
      throw new Error("请传入文件Url或Uint8Array数据对象");
    }
  }

  async fetchFileArrayBuffer(url: string) {
    const res = await fetch(url);
    return await res.arrayBuffer();
  }

  private checkConstructor(
    url: string | Uint8Array,
    option: SoftAvifWebOptions
  ) {
    if (!url) throw new Error("请传入Avif文件Url或Uint8Array文件数据");
    if (
      typeof option.canvas !== "string" &&
      !((option.canvas as any) instanceof HTMLCanvasElement)
    )
      throw new Error("请传入canvas元素ID或canvas DOM对象");
  }
}
