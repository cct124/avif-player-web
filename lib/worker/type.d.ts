export declare enum AVIF_RESULT {
    AVIF_RESULT_OK = 0,
    AVIF_RESULT_UNKNOWN_ERROR = 1,
    AVIF_RESULT_INVALID_FTYP = 2,
    AVIF_RESULT_NO_CONTENT = 3,
    AVIF_RESULT_NO_YUV_FORMAT_SELECTED = 4,
    AVIF_RESULT_REFORMAT_FAILED = 5,
    AVIF_RESULT_UNSUPPORTED_DEPTH = 6,
    AVIF_RESULT_ENCODE_COLOR_FAILED = 7,
    AVIF_RESULT_ENCODE_ALPHA_FAILED = 8,
    AVIF_RESULT_BMFF_PARSE_FAILED = 9,
    AVIF_RESULT_MISSING_IMAGE_ITEM = 10,
    AVIF_RESULT_DECODE_COLOR_FAILED = 11,
    AVIF_RESULT_DECODE_ALPHA_FAILED = 12,
    AVIF_RESULT_COLOR_ALPHA_SIZE_MISMATCH = 13,
    AVIF_RESULT_ISPE_SIZE_MISMATCH = 14,
    AVIF_RESULT_NO_CODEC_AVAILABLE = 15,
    /**
     * 没有剩余的图像数据可用
     */
    AVIF_RESULT_NO_IMAGES_REMAINING = 16,
    AVIF_RESULT_INVALID_EXIF_PAYLOAD = 17,
    AVIF_RESULT_INVALID_IMAGE_GRID = 18,
    AVIF_RESULT_INVALID_CODEC_SPECIFIC_OPTION = 19,
    AVIF_RESULT_TRUNCATED_DATA = 20,
    AVIF_RESULT_IO_NOT_SET = 21,// the avifIO field of avifDecoder is not set
    AVIF_RESULT_IO_ERROR = 22,
    AVIF_RESULT_WAITING_ON_IO = 23,// similar to EAGAIN/EWOULDBLOCK, this means the avifIO doesn't have necessary data available yet
    AVIF_RESULT_INVALID_ARGUMENT = 24,// an argument passed into this function is invalid
    AVIF_RESULT_NOT_IMPLEMENTED = 25,// a requested code path is not (yet) implemented
    AVIF_RESULT_OUT_OF_MEMORY = 26,
    AVIF_RESULT_CANNOT_CHANGE_SETTING = 27,// a setting that can't change is changed during encoding
    AVIF_RESULT_INCOMPATIBLE_IMAGE = 28,// the image is incompatible with already encoded images
    AVIF_RESULT_NO_AV1_ITEMS_FOUND = 10
}
export interface AvifImageCache {
    cacheImage(id: string, image: number, index: number): void;
    initializeCacheEntry(id: string, count: number): void;
    getImages(id: string, count: number): number | null;
    getImage(id: string, index: number): number | null;
    clearCacheForId(id: string): void;
    clearCache(): void;
}
export interface AvifImageTiming {
    /**
     * 媒体的时间刻度（Hz）
     */
    timescale: number;
    /**
     * 表示时间戳，单位为秒
     */
    pts: number;
    /**
     * 表示时间戳，单位为“timescales”
     */
    ptsInTimescales: number;
    /**
     * 持续时间，单位为秒
     */
    duration: number;
    /**
     * 持续时间，单位为“timescales”
     */
    durationInTimescales: number;
}
