import MD5 from "crypto-js/md5";
import workerScript from "./Worker/worker";
import DecoderManager from "./DecoderManager/index";
import { SoftAvifWebOptions } from "./types/SoftAvifWebType";
import { deepMixins } from "./utils";
import Play from "./Play";
import {
  DecoderChannel,
  DecoderEventMap,
  WorkerAvifDecoderMessageChannel,
} from "./types/WorkerMessageType";
import { Decoder } from "./Decoder";

const blob = new Blob([workerScript], { type: "text/javascript" });
const workerDecoderUrl = URL.createObjectURL(blob);

export default class SoftAvifWeb {
  url: string | Uint8Array;
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
  private avifFileArrayBuffer?: ArrayBuffer;
  /**
   * 唯一资源标识
   */
  resourceSymbolId?: string;

  private avifPlay: Play<Decoder<DecoderEventMap>>;

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

    this.option = deepMixins(option, {
      decodeImmediately: true,
      webgl: true,
    } as SoftAvifWebOptions);
    if (typeof this.option.canvas === "string") {
      this.option.canvas = document.getElementById(
        this.option.canvas
      ) as HTMLCanvasElement;
    }
    this.checkConstructor(url, this.option);
    if (window._SoftAvifWebDecoderManager) {
      this.decoderManager = window._SoftAvifWebDecoderManager;
    } else {
      this.decoderManager = window._SoftAvifWebDecoderManager =
        new DecoderManager(workerDecoderUrl);
    }

    this.url = url;
    this.avifPlay = new Play(this.option.canvas as HTMLCanvasElement, {
      webgl: this.option.webgl,
    });
    if (this.option.decodeImmediately) {
      this.decoder(this.url);
    }
  }

  play() {
    this.decoder(this.url);
  }

  private async decoder(url: string | ArrayBuffer) {
    this.avifFileArrayBuffer = await this.fillArrayBuffer(url);
    this.resourceSymbolId = MD5(url as string).toString();
    const decoder = await this.decoderManager.decoder(this.resourceSymbolId);
    await decoder.decoderParse(this.avifFileArrayBuffer);
    this.avifPlay.setDecoder(decoder);
    this.avifPlay.play();
    // const res = await decoder.decoder(this.avifFileArrayBuffer);
    // decoder.on(WorkerAvifDecoderMessageChannel.avifDecoderNextImage, (data) => {
    //   this.avifPlay.playDecoderFrame(data);
    // });

    // decoder.on(WorkerAvifDecoderMessageChannel.decoderImageData, (data) => {
    //   this.avifPlay.playDecoderFrame(data);
    // });
    // if (decoder.decodingComplete) {
    //   this.avifPlay.setFrames(decoder.cacheFrameDatas, decoder.imageCount);
    //   this.avifPlay.playCacheFrames();
    // } else {
    //   decoder.decoder(this.avifFileArrayBuffer);
    //   decoder.on(WorkerAvifDecoderMessageChannel.decoderImageData, (data) => {
    //     this.avifPlay.playDecoderFrame(data);
    //   });
    // }
  }

  /**
   * 获取avif文件的Uint8Array数据
   * @param url
   * @returns
   */
  private async fillArrayBuffer(url: string | ArrayBuffer) {
    if (typeof url === "string") {
      return await this.fetchFileArrayBuffer(url);
    } else if (url instanceof ArrayBuffer) {
      return url;
    } else {
      throw new Error("请传入文件Url或Uint8Array数据对象");
    }
  }

  private async fetchFileArrayBuffer(url: string) {
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
