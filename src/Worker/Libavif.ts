import {
  WorkerAvifDecoderEventMap,
  WorkerAvifDecoderMessageChannel,
} from "../types/WorkerMessageType";
import { WorkerEventEmitter } from "../Observer/index";
import { AVIF_RESULT } from "./type";

const AVIF_RGB_IMAGE_STRUCT_SIZE = 64;
const AVIF_RGB_IMAGE_TIMING_STRUCT_SIZE = 40;

export default class Libavif extends WorkerEventEmitter<WorkerAvifDecoderEventMap> {
  AwsmAvifDecode: any;
  decoderPtr?: number;
  bufferPtr?: number;
  constructor(awsmAvifDecode: any) {
    super();
    this.AwsmAvifDecode = awsmAvifDecode;
    this.on(WorkerAvifDecoderMessageChannel.avifDecoderParse, (arrayBuffer) => {
      this.avifDecoderParse(arrayBuffer);
    });
    this.on(WorkerAvifDecoderMessageChannel.avifDecoderImage, () => {
      this.avifDecoderImage();
    });
    this.send(WorkerAvifDecoderMessageChannel.initial, this.avifVersion());
  }

  avifDecoderParse(arrayBuffer: ArrayBuffer) {
    // Allocate and copy the image file data to WASM memory
    const bufferSize = arrayBuffer.byteLength;
    // await onRuntimeInitialized;
    this.bufferPtr = this.AwsmAvifDecode._malloc(bufferSize);
    this.AwsmAvifDecode.HEAPU8.set(new Uint8Array(arrayBuffer), this.bufferPtr);

    // Create AVIF decoder
    this.decoderPtr = this.AwsmAvifDecode._avifDecoderCreate();
    if (!this.decoderPtr) {
      this.error(new Error("Memory allocation failure"));
      return;
    }

    // Set IO memory
    let result = this.AwsmAvifDecode._avifDecoderSetIOMemory(
      this.decoderPtr,
      this.bufferPtr,
      bufferSize
    );

    if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
      this.error(
        new Error(`Failed to set IO memory: ${this.resultToStr(result)}`)
      );
      if (this.bufferPtr) this.free(this.bufferPtr);
      return;
    }

    // Parse the image
    result = this.AwsmAvifDecode._avifDecoderParse(this.decoderPtr);
    if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
      this.error(
        new Error(`Failed to decode image: ${this.resultToStr(result)}`)
      );
      if (this.bufferPtr) this.free(this.bufferPtr);
      return;
    }
    const imageCount = this.AwsmAvifDecode._avifGetImageCount(this.decoderPtr);
    this.send(WorkerAvifDecoderMessageChannel.avifDecoderParseComplete, {
      imageCount,
    });
  }

  avifDecoderImage() {
    let result = 0;
    let index = 0;
    let t1 = performance.now();
    while (
      (result = this.AwsmAvifDecode._avifDecoderNextImage(this.decoderPtr)) ===
      AVIF_RESULT.AVIF_RESULT_OK
    ) {
      const t2 = performance.now();
      const decodeTime = t2 - t1;
      t1 = t2;
      const rbgPtr = this.AwsmAvifDecode._malloc(AVIF_RGB_IMAGE_STRUCT_SIZE); // Assuming avifRGBImage size is 32 bytes
      this.AwsmAvifDecode.HEAP8.fill(
        0,
        rbgPtr,
        rbgPtr + AVIF_RGB_IMAGE_STRUCT_SIZE
      );

      const imagePtr = this.AwsmAvifDecode._avifGetDecoderImage(
        this.decoderPtr
      );
      this.AwsmAvifDecode._avifRGBImageSetDefaults(rbgPtr, imagePtr);
      result = this.AwsmAvifDecode._avifRGBImageAllocatePixels(rbgPtr);

      const timingPtr = this.AwsmAvifDecode._avifGetImageTiming(
        this.decoderPtr,
        index
      );
      const timing = this.getImageTiming(timingPtr);
      if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
        this.error(
          new Error(
            `Allocation of RGB samples failed:  ${this.resultToStr(result)}`
          )
        );
        this.free(timingPtr);
        this.free(rbgPtr);
      }
      result = this.AwsmAvifDecode._avifImageYUVToRGB(imagePtr, rbgPtr);
      if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
        this.error(
          new Error(`Conversion from YUV failed:  ${this.resultToStr(result)}`)
        );
      }
      const pixelsPtr = this.AwsmAvifDecode._avifGetRGBImagePixels(rbgPtr);
      const width = this.AwsmAvifDecode._avifGetRGBImageWidth(rbgPtr);
      const height = this.AwsmAvifDecode._avifGetRGBImageHeight(rbgPtr);
      const depth = this.AwsmAvifDecode._avifGetRGBImageDepth(rbgPtr);
      const _pixels = new Uint8ClampedArray(
        this.AwsmAvifDecode.HEAPU8.buffer,
        pixelsPtr,
        width * height * 4
      );
      const pixels = _pixels.slice();
      this.send(
        WorkerAvifDecoderMessageChannel.avifDecoderNextImage,
        {
          ...timing,
          index,
          width,
          height,
          depth,
          decodeTime,
          pixels: pixels.buffer,
        },
        [pixels.buffer]
      );

      index++;
      this.AwsmAvifDecode._avifRGBImageFreePixels(rbgPtr);
      this.free(rbgPtr);
      this.free(timingPtr);
    }

    if (result === AVIF_RESULT.AVIF_RESULT_NO_IMAGES_REMAINING)
      this.send(WorkerAvifDecoderMessageChannel.decodingComplete, {});

    if (this.bufferPtr) this.free(this.bufferPtr);
    if (this.decoderPtr)
      this.AwsmAvifDecode._avifDecoderDestroy(this.decoderPtr);
  }

  getImageTiming(timingPtr: number) {
    // 直接访问Timing结构体的值
    const timescale = this.AwsmAvifDecode.getValue(timingPtr + 0, "double"); // Timing结构体中duration的偏移量为0
    const pts = this.AwsmAvifDecode.getValue(timingPtr + 8, "double");
    const ptsInTimescales = this.AwsmAvifDecode.getValue(timingPtr + 16, "i32");
    const duration = this.AwsmAvifDecode.getValue(timingPtr + 24, "double");
    const durationInTimescales = this.AwsmAvifDecode.getValue(
      timingPtr + 32,
      "i32"
    );
    return {
      timescale,
      pts,
      ptsInTimescales,
      duration,
      durationInTimescales,
    };
  }

  avifVersion() {
    return this.AwsmAvifDecode.UTF8ToString(
      this.AwsmAvifDecode._avifVersion()
    ) as string;
  }

  resultToStr(result: number) {
    return this.UTF8ToString(this.AwsmAvifDecode._avifResultToString(result));
  }

  error(error: Error) {
    this.send(WorkerAvifDecoderMessageChannel.error, error);
  }

  free(ptr: number) {
    this.AwsmAvifDecode._free(ptr);
  }

  UTF8ToString(ptr: number) {
    return this.AwsmAvifDecode.UTF8ToString(ptr);
  }
}
