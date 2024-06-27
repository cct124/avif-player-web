import MD5 from "crypto-js/md5";
import CryptoJS from "crypto-js/core";
import WebpackWorker from "./Worker/Libavif.worker";
import { AvifPlayerWebOptions, Source } from "./types/AvifPlayerWebType";
import { deepMixins, isNumeric } from "./utils";
import AnimationPlayback from "./AnimationPlayback";
import {
  DecoderChannel,
  DecoderEventMap,
  WorkerAvifDecoderMessageChannel,
} from "./types/WorkerMessageType";
import { Decoder } from "./Decoder";
import { LibavifDecoder } from "./Decoder/LibavifDecoder";
import { Observer } from "./Observer";
import {
  AvifPlayerWebChannel,
  AvifPlayerWebEventMap,
  AvifPlayerSourceType,
  PlayOptions,
} from "./types";

type Sources = string | ArrayBuffer | Source[];

export default class AvifPlayer extends Observer<AvifPlayerWebEventMap> {
  /**
   * 可选配置
   */
  private option: AvifPlayerWebOptions;
  /**
   * 播放对象
   */
  private animationPlayback: AnimationPlayback<Decoder<DecoderEventMap>>;
  sources: AvifPlayerSourceType[];
  libavifDecoder: LibavifDecoder;
  /**
   * 当前播放的资源id，默认是sources资源数组的第一个
   */
  playSourceId: string;

  constructor(
    url: string | ArrayBuffer | AvifPlayerWebOptions,
    canvas?: string | HTMLCanvasElement | AvifPlayerWebOptions,
    option: AvifPlayerWebOptions = {}
  ) {
    super();
    if (typeof canvas === "string" || canvas instanceof HTMLCanvasElement) {
      option.canvas = canvas;
    } else if (canvas instanceof Object) {
      option = canvas;
    }
    if (typeof url === "string" || url instanceof ArrayBuffer) {
      this.option = this.mixinOptions(option);
      this.sources = this.sourcesHandle(url);
    } else {
      option = url as AvifPlayerWebOptions;
      this.option = this.mixinOptions(option);
      this.sources = this.sourcesHandle(this.option.source);
    }

    // 判断是元素id还是DOM对象
    if (typeof this.option.canvas === "string") {
      this.option.canvas = document.getElementById(
        this.option.canvas
      ) as HTMLCanvasElement;
    }

    this.checkConstructor(this.option);
    this.playSourceId = this.sources[0].sourceId;
    if (this.option.autoplay) {
      this.initialLibavifDecoder().then(() => {
        this.decoderParsePlay().then(() => {
          this.animationPlayback.play(this.playSourceId);
        });
      });
    } else if (this.option.initDecoderInstantly) {
      this.initialLibavifDecoder();
    } else if (this.option.initDecoderAvifInstantly) {
      this.initialLibavifDecoder().then(() => {
        this.decoderParsePlay();
      });
    }
  }

  /**
   * 合并默认配置项
   * @param options
   * @returns
   */
  mixinOptions(options: AvifPlayerWebOptions) {
    return deepMixins(options, {
      decodeImmediately: true,
      autoplay: false,
      initDecoderInstantly: false,
      initDecoderAvifInstantly: false,
      enableStreaming: true,
      loop: 1,
    } as AvifPlayerWebOptions);
  }

  initialLibavifDecoder(reset?: boolean) {
    return new Promise<LibavifDecoder>((resolve, reject) => {
      try {
        this.libavifDecoder = new LibavifDecoder(
          new WebpackWorker() as unknown as Worker,
          this.sources,
          this.option.enableStreaming
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
  /**
   * 切换播放的资源
   * @param id 动画id
   * @param index 帧索引
   */
  switch(id: number | string, index: number = 0) {
    const source = this.sources.find((source) => source.id === id);
    if (source) {
      this.animationPlayback.stopNthImageCallback();
      this.animationPlayback.loop = 0;
      this.animationPlayback.loopCount = 0;
      this.animationPlayback.paused = false;
      this.animationPlayback.playing = false;
      this.playSourceId = source.sourceId;
    } else {
      throw new Error(`id: ${id}不存在`);
    }
  }

  pause(index?: number) {
    this.animationPlayback.pause(this.playSourceId, index);
  }

  async play(index?: number | PlayOptions) {
    if (typeof index === "object") {
      this.switch(index.id);
      index = index.index;
    }
    // 解码器对象不存在时，解码器可能为初始化或者被销毁，这时重新初始化解码器
    if (!this.libavifDecoder) {
      await this.initialLibavifDecoder();
      await this.decoderParsePlay();
    } else if (
      !this.libavifDecoder.findSource(this.playSourceId).decoderParseComplete
    ) {
      await this.decoderParsePlay();
    }
    this.animationPlayback.play(this.playSourceId, index);
  }

  private async decoderParsePlay() {
    if (
      !this.libavifDecoder.findSource(this.playSourceId).decoderParseComplete
    ) {
      this.setCanvasSize();
      if (this.option.enableStreaming) {
        await this.streamingArrayBuffer(this.sources, this.libavifDecoder);
        await this.libavifDecoder.decoderParse(this.playSourceId);
      } else {
        await this.fillArrayBuffer(this.sources);
        const source = this.sources.find(
          (source) => source.sourceId === this.playSourceId
        );
        await this.libavifDecoder.decoderParse(
          this.playSourceId,
          source.arrayBuffer
        );
      }
      this.animationPlayback.initRender();
      return;
    }
  }

  private async streamingArrayBuffer(
    sources: AvifPlayerSourceType[],
    libavifDecoder: LibavifDecoder
  ) {
    return Promise.all(
      sources.map(
        (source) =>
          new Promise<string>((resolve, reject) => {
            try {
              if (source.arrayBuffer) {
                return resolve(source.sourceId);
              } else {
                return fetch(source.url)
                  .then((response) => {
                    const reader = response.body.getReader();
                    const size = Number(response.headers.get("Content-Length"));
                    if (isNumeric(size)) {
                      return reader.read().then(function processChunk({
                        done,
                        value,
                      }): any {
                        libavifDecoder
                          .streamingArrayBuffer(
                            source.sourceId,
                            done,
                            value,
                            size
                          )
                          .then(() => resolve(source.sourceId));
                        if (!source?.arrayBuffer) source.arrayBuffer = value;
                        if (done) return;
                        // 继续读取下一个数据块
                        return reader.read().then(processChunk);
                      });
                    }
                    throw new Error(
                      `数据流请求头内容长度错误，Content-Length: ${response.headers.get("Content-Length")}`
                    );
                  })
                  .then(() => {
                    return;
                  })
                  .catch((error) => {
                    throw error;
                  });
              }
            } catch (error) {
              reject(error);
            }
          })
      )
    );
  }

  /**
   * 获取avif文件的Uint8Array数据
   * @param url
   * @returns
   */
  private async fillArrayBuffer(sources: AvifPlayerSourceType[]) {
    return Promise.all(
      sources.map(async (source) => {
        if (source.arrayBuffer) {
          return source.sourceId;
        } else {
          source.arrayBuffer = await this.fetchFileArrayBuffer(source.url);
          return source.sourceId;
        }
      })
    );
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
  private checkConstructor(option: AvifPlayerWebOptions) {
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

  sourcesHandle(sources: Sources) {
    const _sources: AvifPlayerSourceType[] = [];
    if (sources instanceof Array) {
      sources.forEach(({ id, url, arrayBuffer, loop }) => {
        loop = isNumeric(loop) ? loop : this.option.loop || 1;
        if (url) {
          _sources.push({
            id,
            url,
            sourceId: MD5(url).toString(),
            loop,
          });
        } else if (arrayBuffer) {
          _sources.push({
            id,
            url: "",
            sourceId: MD5(
              CryptoJS.lib.WordArray.create(arrayBuffer)
            ).toString(),
            arrayBuffer: arrayBuffer,
            loop,
          });
        } else {
          throw new Error(
            "参数url类型错误，请传入Avif图像Url、URL数组或Uint8Array、Uint8Array数组"
          );
        }
      });

      return _sources;
    } else if (typeof sources === "string") {
      const sourceId = MD5(sources).toString();
      _sources.push({
        id: sourceId,
        url: sources,
        sourceId,
        loop: isNumeric(this.option?.loop) ? this.option?.loop : 1,
      });
      return _sources;
    }

    throw new Error(
      "参数url类型错误，请传入Avif图像Url、URL数组或Uint8Array、Uint8Array数组"
    );
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
    this.sources.forEach((source) => {
      source.arrayBuffer = null;
    });
    this.libavifDecoder = null;
  }
}
