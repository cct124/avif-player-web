# avif-player-web

> 使用[Webassembly][Webassembly]播放[AVIF][AVIF]动画文件。单帧的图像也是支持的，但是因为解码时间过长，所以意义不大。这个库使用了[Emscripten][Emscripten]编译[Libavif](https://github.com/AOMediaCodec/libavif)为[Webassembly][Webassembly]从而提供向后兼容的AVIF文件的支持

> 只支持`8bit`色深文件，每个AvifPlayerWeb对象创建播放时都会新建一个[Worker][Worker]线程

[![npm version](https://badge.fury.io/js/avif-player-web.svg)](https://www.npmjs.com/package/avif-player-web)

## 安装

```shell
# npm
npm i avif-player-web

# yarn
yarn add avif-player-web
```

## 示例

### 播放一个动画文件

```html
<canvas id="canvas"></canvas>
```

```typescript
import AvifPlayerWeb from "avif-player-web";

// 每个AvifPlayerWeb对象创建播放时都会新建一个Worker线程
// 第二个参数可以是配置对象
const avifPlayerWeb = new AvifPlayerWeb.AvifPlayerWeb(
  // 你的avif文件链接
  "www.example.com/animation.avif",
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

### 显示单帧的图像文件

```typescript
import AvifPlayerWeb from "avif-player-web";

const avifPlayerWeb = new AvifPlayerWeb.AvifPlayerWeb(
  "www.example.com/one.avif",
  document.getElementById("canvas"),
  {
    // 这样才能一开始就显示图像
    autoplay: true,
  }
);

avifPlayerWeb.on(AvifPlayerWeb.AvifPlayerWebChannel.end, (data) => {
  // 播放完成后销毁Worker线程以节省内存
  avifPlayerWeb.destroy();
});
```

## 配置

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

## 如何实现

解码的流程

![alt text](doc/Libavif.png)

[Emscripten]: (https://emscripten.org/)
[Webassembly]: (https://webassembly.org)
[AVIF]: (https://en.wikipedia.org/wiki/AVIF)
[Worker]: (https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Using_web_workers#web_workers_api)
