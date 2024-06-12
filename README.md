# avif-player-web

> 使用 webassembly 播放 AVIF 动画文件

[![npm version](https://badge.fury.io/js/avif-player-web.svg)](https://www.npmjs.com/package/avif-player-web)

## Installation

```shell
# npm
npm i avif-player-web

# yarn
yarn add avif-player-web
```

## Example

```html
<canvas id="canvas"></canvas>
```

```typescript
import AvifPlayerWeb from "avif-player-web";

// 第二个参数可以是配置对象
const avifPlayerWeb = new AvifPlayerWeb.AvifPlayerWeb(
  // 你的avif文件链接
  "www.example.com/test.avif",
  // 传入canvas DOM对象或id
  document.getElementById("canvas"),
  {
    // 配置项列出了所有配置选项
    // 自动播放
    autoplay: true,
  }
);

AvifPlayerWeb.on(
  // AvifPlayerWeb对象的所有事件都在AvifPlayerWebChannel枚举中
  AvifPlayerWeb.AvifPlayerWebChannel.frameIndexChange,
  (data) => {
    console.log(data.index);
  }
);
```

## Option

`AvifPlayerWeb`对象的所有可选配置

```typescript
/**
 * 可选配置项
 */
export interface AvifPlayerWebOptions {
  /**
   * 传入canvas DOM对象或id
   */
  canvas?: string | HTMLCanvasElement;
  /**
   * 启用webgl api渲染
   */
  webgl?: boolean;
  /**
   * 循环播放次数，0表示无限循环播放，默认1
   */
  loop?: number;
  /**
   * 初始化完成后立即播放
   */
  autoplay?: boolean;
  /**
   * 是否开启异步解码，开启这个播放系统将尽可能的解码每一帧，播放将会更流畅，副作用是占用内存大，目前暂停后重新播放时可能有延迟，默认false
   */
  async?: boolean;
  /**
   * 开启异步解码时图像数据缓冲区允许最大的内存占用，这个值是根据`pixels.byteLength`图像数据大小计算的，真正占用的内存空间会比这个值略大，默认`67108864`即`64MB`，单位`byte`
   */
  arrayBuffSize?: number;
  /**
   * 实例化对象时立刻初始化解码器，默认false
   */
  initDecoderInstantly?: boolean;
  /**
   * 实例化对象时立刻初始化解码器并解析AVIF文件，默认false
   */
  initDecoderAvifInstantly?: boolean;
}
```
