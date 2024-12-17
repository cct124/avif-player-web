import WebpackWorker from "./Worker/Libavif.worker";
import { AvifPlayerWebOptions, Source } from "./types/AvifPlayerWebType";
import { deepMixins, fetchText, isNumeric } from "./utils";
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
  AID_TYPE,
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
   * 当前播放的动画id
   */
  playingId: AID_TYPE;
  decoderStr: string;

  constructor(
    url: string | ArrayBuffer | AvifPlayerWebOptions,
    canvas?: string | HTMLCanvasElement | AvifPlayerWebOptions,
    option: AvifPlayerWebOptions = {}
  ) {
    try {
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
      this.option.playingId =
        this.option.playingId === undefined
          ? this.sources[0].id
          : this.option.playingId;

      // 判断是元素id还是DOM对象
      if (typeof this.option.canvas === "string") {
        this.option.canvas = document.getElementById(
          this.option.canvas
        ) as HTMLCanvasElement;
      }
      this.decoderStr = this.option.decoderStr;

      this.checkConstructor(this.option);
      this.initail();
    } catch (error) {
      throw error;
    }
  }

  async initail() {
    if (this.option.decoderUrl) {
      this.decoderStr = await fetchText(this.option.decoderUrl);
    }

    if (this.option.autoplay) {
      this.initialLibavifDecoder().then(() => {
        this.decoderParsePlay(this.option.playingId).then(() => {
          this.playingId = this.animationPlayback.play(
            this.findSource(this.option.playingId)
          );
        });
      });
    } else if (this.option.initDecoderInstantly) {
      this.initialLibavifDecoder();
    } else if (this.option.initDecoderAvifInstantly) {
      this.initialLibavifDecoder().then(() => {
        this.decoderParsePlay(this.option.playingId);
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

  /**
   *
   * @param reset 初始化解码器线程
   * @returns
   */
  initialLibavifDecoder(reset?: boolean) {
    return new Promise<LibavifDecoder>(async (resolve, reject) => {
      try {
        this.libavifDecoder = new LibavifDecoder(
          new WebpackWorker() as unknown as Worker,
          this.sources,
          this.option.enableStreaming,
          this.decoderStr
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
          WorkerAvifDecoderMessageChannel.initialComplete,
          () => {
            resolve(this.libavifDecoder);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  pause(index?: number) {
    this.animationPlayback.pause(this.playingId, index);
  }

  async play(play?: number | PlayOptions) {
    const options: PlayOptions = {
      id: undefined,
      index: undefined,
    };
    if (typeof play === "object") {
      const { id, index } = play;
      options.id = id;
      options.index = index;
    } else {
      options.index = play;
    }
    const id =
      options.id !== undefined
        ? options.id
        : this.playingId !== undefined
          ? this.playingId
          : this.option.playingId;
    // 解码器对象不存在时，解码器可能为初始化或者被销毁，这时重新初始化解码器
    if (!this.libavifDecoder) {
      await this.initialLibavifDecoder();
      await this.decoderParsePlay(id);
    } else {
      await this.decoderParsePlay(id);
    }
    this.playingId = this.animationPlayback.play(
      this.findSource(id),
      options.index
    );
  }

  private async decoderParsePlay(id: AID_TYPE = this.playingId) {
    if (!this.libavifDecoder.findSource(id).decoderParseComplete)
      this.setCanvasSize();
    if (this.option.enableStreaming) {
      await this.streamingArrayBuffer(this.sources, this.libavifDecoder);
      await this.libavifDecoder.decoderParse(id);
    } else {
      await this.fillArrayBuffer(this.sources);
      const source = this.sources.find((source) => source.id === id);
      await this.libavifDecoder.decoderParse(
        id,
        source.arrayBuffer.byteLength ? source.arrayBuffer : null
      );
    }
    this.animationPlayback.initRender();
    return;
  }

  private async streamingArrayBuffer(
    sources: AvifPlayerSourceType[],
    libavifDecoder: LibavifDecoder
  ) {
    return Promise.all(
      sources.map(
        (source) =>
          new Promise<AID_TYPE>((resolve, reject) => {
            try {
              if (source.arrayBuffer) {
                return resolve(source.id);
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
                          .streamingArrayBuffer(source.id, done, value, size)
                          .then(() => resolve(source.id));
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
          return source.id;
        } else {
          source.arrayBuffer = await this.fetchFileArrayBuffer(source.url);
          return source.id;
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

  setCanvasSize() {
    this.libavifDecoder.once(
      DecoderChannel.avifParse,
      ({ width, height, id }) => {
        (this.option.canvas as HTMLCanvasElement).width = width;
        (this.option.canvas as HTMLCanvasElement).height = height;
        this.emit(AvifPlayerWebChannel.parse, {
          id: this.sources.find((source) => source.id === id).id,
          width,
          height,
        });
      }
    );
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
            loop,
          });
        } else if (arrayBuffer) {
          _sources.push({
            id,
            url: "",
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
      _sources.push({
        id: 0,
        url: sources,
        loop: isNumeric(this.option?.loop) ? this.option?.loop : 1,
      });
      return _sources;
    }

    throw new Error(
      "参数url类型错误，请传入Avif图像Url、URL数组或Uint8Array、Uint8Array数组"
    );
  }

  /**
   * 获取 source
   * @param id
   * @returns
   */
  findSource(id: AID_TYPE) {
    return this.sources.find((source) => source.id === id);
  }

  /**
   * 销毁解码器`Worker`线程
   *
   * 播放将暂停帧索引重置为0
   */
  destroy() {
    this.animationPlayback.destroy();
    this.sources.forEach((source) => {
      source.arrayBuffer = null;
    });
    this.libavifDecoder.destroy();
    this.libavifDecoder = null;
    this.emit(AvifPlayerWebChannel.destroy, {});
  }
}
