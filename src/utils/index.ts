/**
 * # 深度混入
 * `obj1`混入`obj2`中
 * ## Example
 * 给一个对象赋予默认值
 * 
 * 如果`options`不存在`buttons`，则`obj1`的`buttons`的值就是输出对象`this.options`的`buttons`值
 * ```ts
 * this.options = deepMixins(
      options,
      {
        buttons: [],
      }
    );
 * ```
 * @param obj1 原始对象
 * @param obj2 混入对象
 * @returns
 */
export function deepMixins<T extends { [key: string]: any }>(
  obj2: T,
  obj1: { [key: string]: any }
): T {
  let key;
  for (key in obj2) {
    obj1[key] =
      obj1[key] &&
      obj1[key].toString() === "[object Object]" &&
      obj2[key] &&
      obj2[key].toString() === "[object Object]"
        ? deepMixins(obj1[key], obj2[key])
        : obj2[key] === undefined
        ? (obj2[key as keyof T] = obj1[key])
        : (obj1[key] = obj2[key]);
  }
  return obj1 as T;
}

/**
 * 基于 [requestAnimationFrame](https://developer.mozilla.org/zh-CN/docs/Web/API/window/requestAnimationFrame) 实现的定时器
 * @param callback
 * @param ms
 */
export function timeout(callback: (elapsed: number) => void, ms = 0) {
  let start: number;
  function step(timestamp: number) {
    if (start === undefined) start = timestamp;
    const elapsed = timestamp - start;
    if (elapsed < ms) {
      window.requestAnimationFrame(step);
    } else {
      return callback(elapsed);
    }
  }
  window.requestAnimationFrame(step);
}
