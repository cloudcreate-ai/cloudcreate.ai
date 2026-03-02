/**
 * 图片滤镜 - 纯像素运算，不依赖 DOM/Canvas
 * 用于放大后减轻糊/颗粒感（反锐化掩模）
 */

/**
 * 3x3 盒式模糊，用于反锐化掩模的“模糊”层
 * @param {ImageData} imageData
 * @returns {ImageData}
 */
function boxBlur3x3(imageData) {
  const { data, width: w, height: h } = imageData;
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              sum += data[(ny * w + nx) * 4 + c];
              n++;
            }
          }
        }
        out[(y * w + x) * 4 + c] = n ? Math.round(sum / n) : data[(y * w + x) * 4 + c];
      }
    }
  }
  return new ImageData(out, w, h);
}

/**
 * 反锐化掩模：原图 + amount * (原图 - 模糊图)，使边缘更清晰，减轻放大后的糊/颗粒感
 * @param {ImageData} imageData
 * @param {number} [amount=0.35] 强度，建议 0.2–0.5，过大会增加噪点
 * @returns {ImageData}
 */
export function unsharpMask(imageData, amount = 0.35) {
  const blurred = boxBlur3x3(imageData);
  const { data, width, height } = imageData;
  const b = blurred.data;
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i++) {
    const v = data[i] + amount * (data[i] - b[i]);
    out[i] = Math.max(0, Math.min(255, Math.round(v)));
  }
  return new ImageData(out, width, height);
}
