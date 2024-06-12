import MD5 from "crypto-js/md5";
import WebpackWorker from "./Worker/Libavif.worker";
// import DecoderManager from "./DecoderManager/index";
import { AvifPlayerWebOptions } from "./types/AvifPlayerWebType";
import { deepMixins } from "./utils";
import AnimationPlayback from "./AnimationPlayback";
import {
  DecoderChannel,
  DecoderEventMap,
  WorkerAvifDecoderMessageChannel,
} from "./types/WorkerMessageType";
import { Decoder } from "./Decoder";
import { PlayChannelType } from "./AnimationPlayback/type";
import { LibavifDecoder } from "./Decoder/LibavifDecoder";
import { Observer } from "./Observer";
import { AvifPlayerWebChannel, AvifPlayerWebEventMap } from "./types";

export default class AvifPlayer extends Observer<AvifPlayerWebEventMap> {
  url: string | Uint8Array;
  /**
   * 可选配置
   */
  private option: AvifPlayerWebOptions;
  /**
   * DecoderManager的管理对象，这个是全局共享的，注册到`window._AvifPlayerWebDecoderManager`
   */
  // private decoderManager: DecoderManager;
  /**
   * avif的Uint8Array文件数据
   */
  private avifFileArrayBuffer?: ArrayBuffer;
  /**
   * 唯一资源标识
   */
  resourceSymbolId?: string;
  /**
   * 播放对象
   */
  private animationPlayback: AnimationPlayback<Decoder<DecoderEventMap>>;
  /**
   * 是否支持av1视频编码
   */
  private av1Support = false;

  libavifDecoder: LibavifDecoder;

  constructor(
    url: string | Uint8Array,
    canvas: string | HTMLCanvasElement | AvifPlayerWebOptions,
    option: AvifPlayerWebOptions = {}
  ) {
    super();
    if (typeof canvas === "string" || canvas instanceof HTMLCanvasElement) {
      option.canvas = canvas;
    } else if (canvas instanceof Object) {
      option = canvas;
    }
    // 合并配置项
    this.option = deepMixins(option, {
      decodeImmediately: true,
      webgl: false,
      autoplay: false,
      initDecoderInstantly: false,
      initDecoderAvifInstantly: false,
    } as AvifPlayerWebOptions);
    // 判断是元素id还是DOM对象
    if (typeof this.option.canvas === "string") {
      this.option.canvas = document.getElementById(
        this.option.canvas
      ) as HTMLCanvasElement;
    }

    this.checkConstructor(url, this.option);
    this.url = url;
    this.resourceSymbolId = MD5(url as string).toString();

    if (this.option.autoplay) {
      this.initialLibavifDecoder().then(() => {
        this.decoderParsePlay(this.url).then(() => {
          this.animationPlayback.play();
        });
      });
    } else if (this.option.initDecoderInstantly) {
      this.initialLibavifDecoder();
    } else if (this.option.initDecoderAvifInstantly) {
      this.initialLibavifDecoder().then(() => {
        this.decoderParsePlay(this.url);
      });
    }
  }

  initialLibavifDecoder(reset?: boolean) {
    return new Promise<LibavifDecoder>((resolve, reject) => {
      try {
        this.libavifDecoder = new LibavifDecoder(
          new WebpackWorker() as unknown as Worker,
          this.resourceSymbolId
        );
        if (reset && this.animationPlayback) {
          this.animationPlayback.setDecoder(this.libavifDecoder);
        } else {
          this.animationPlayback = new AnimationPlayback(
            this,
            this.option.canvas as HTMLCanvasElement,
            this.libavifDecoder,
            {
              webgl: this.option.webgl,
              loop: this.option.loop,
              async: this.option.async,
              arrayBuffSize: this.option.arrayBuffSize,
            }
          );
        }

        this.libavifDecoder.onmessageOnce(
          WorkerAvifDecoderMessageChannel.initial,
          () => {
            resolve(this.libavifDecoder);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  pause() {
    this.animationPlayback.pause();
  }

  async play() {
    // 解码器对象不存在时，解码器可能为初始化或者被销毁，这时重新初始化解码器
    if (!this.libavifDecoder) {
      await this.initialLibavifDecoder();
      await this.decoderParsePlay(this.url);
    } else if (!this.libavifDecoder.decoderParseComplete) {
      await this.decoderParsePlay(this.url);
    }
    this.animationPlayback.play();
  }

  private async decoderParsePlay(url: string | ArrayBuffer) {
    if (!this.libavifDecoder.decoderParseComplete) {
      this.setCanvasSize();
      this.avifFileArrayBuffer = await this.fillArrayBuffer(url);
      await this.libavifDecoder.decoderParse(this.avifFileArrayBuffer!);
      this.animationPlayback.initRender();
      return;
    }
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
  /**
   * 检查构造参数
   * @param url
   * @param option
   */
  private checkConstructor(
    url: string | Uint8Array,
    option: AvifPlayerWebOptions
  ) {
    if (!url) throw new Error("请传入Avif文件Url或Uint8Array文件数据");
    if (
      typeof option.canvas !== "string" &&
      !((option.canvas as any) instanceof HTMLCanvasElement)
    )
      throw new Error("请传入canvas元素ID或canvas DOM对象");
  }

  /**
   * 判断是否支持av1视频编码
   * @returns
   */
  hasAv1Support() {
    const vid = document.createElement("video");
    return vid.canPlayType('video/mp4; codecs="av01.0.05M.08"') === "probably";
  }

  setCanvasSize() {
    this.libavifDecoder.once(DecoderChannel.avifParse, ({ width, height }) => {
      (this.option.canvas as HTMLCanvasElement).width = width;
      (this.option.canvas as HTMLCanvasElement).height = height;
    });
  }

  /**
   * 销毁解码器`Worker`线程
   *
   * 播放将暂停帧索引重置为0
   */
  destroy() {
    this.emit(AvifPlayerWebChannel.destroy, {});
    this.animationPlayback.destroy();
    this.libavifDecoder.destroy();
    this.libavifDecoder = null;
  }
}
