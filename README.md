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
<canvas id="canvas2" class="canvas"></canvas>
```

```typescript
import AvifPlayerWeb from "avif-player-web";

const avifPlayerWeb = new AvifPlayerWeb.AvifPlayerWeb(
  "url.avif",
  document.getElementById("canvas"),
  {
    autoplay: true,
  }
);

AvifPlayerWeb.on(
  AvifPlayerWeb.AvifPlayerWebChannel.frameIndexChange,
  (data) => {
    console.log(data.index);
  }
);
```
