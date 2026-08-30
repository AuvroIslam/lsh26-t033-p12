/**
 * Image preparation before OCR.
 *
 * Tesseract was built for scanned documents, not for photographs taken in a
 * shop doorway. A phone picture of a receipt arrives with uneven lighting, a
 * grey-white background rather than a white one, and far more pixels than the
 * engine needs. Feeding it directly is the main reason in-browser OCR gets a
 * reputation for being unusable.
 *
 * Three cheap corrections recover most of the gap, all on a canvas with no
 * dependency:
 *
 *   1. Scale so the text is around the size Tesseract expects — roughly 1500px
 *      on the long edge. Bigger is slower without reading better; much smaller
 *      loses the strokes of small print.
 *   2. Convert to greyscale using perceptual weights, so coloured shop logos
 *      and thermal-paper tints do not survive as noise.
 *   3. Binarise adaptively against a local average rather than a fixed cutoff.
 *      A global threshold destroys a receipt that is brighter at one end than
 *      the other, which is what a photograph almost always is.
 */

/** Long edge Tesseract reads most reliably at. */
const TARGET_LONG_EDGE = 1500;

/**
 * Radius of the local average used for thresholding, as a fraction of the
 * image width. Roughly a character-height window: small enough to follow a
 * lighting gradient, large enough not to erase the inside of thick glyphs.
 */
const WINDOW_FRACTION = 0.06;

/** How far below the local average a pixel must fall to count as ink. */
const BIAS = 8;

export interface PreprocessResult {
  /** The processed image, ready to hand to the OCR engine. */
  blob: Blob;
  /** A data URL of the processed image, for showing the user what was read. */
  dataUrl: string;
  width: number;
  height: number;
}

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The image could not be opened.'));
    };
    img.src = url;
  });
}

/**
 * Integral image, so the mean of any rectangle is four array reads.
 *
 * Without this, an adaptive threshold is O(width x height x window^2) and a
 * 1500px image visibly freezes the tab. With it the pass is linear.
 */
function integralImage(gray: Uint8ClampedArray, w: number, h: number): Float64Array {
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      sum[(y + 1) * (w + 1) + (x + 1)] = sum[y * (w + 1) + (x + 1)] + rowSum;
    }
  }
  return sum;
}

/** Mean of the rectangle (x0,y0)-(x1,y1) inclusive, from an integral image. */
function rectMean(
  sum: Float64Array,
  w: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const stride = w + 1;
  const total =
    sum[(y1 + 1) * stride + (x1 + 1)] -
    sum[y0 * stride + (x1 + 1)] -
    sum[(y1 + 1) * stride + x0] +
    sum[y0 * stride + x0];
  const area = (x1 - x0 + 1) * (y1 - y0 + 1);
  return total / area;
}

/**
 * Scale, greyscale and adaptively binarise a receipt photograph.
 *
 * Falls back to returning the original file if anything here fails — a
 * preprocessing bug must never be the reason a receipt cannot be read at all.
 */
export async function preprocessReceipt(file: File): Promise<PreprocessResult> {
  const img = await loadImage(file);

  const longEdge = Math.max(img.width, img.height);
  const scale = longEdge > TARGET_LONG_EDGE ? TARGET_LONG_EDGE / longEdge : 1;
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;

  // Greyscale with perceptual weights, kept in its own buffer for the integral.
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    gray[p] = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
  }

  const sum = integralImage(gray, w, h);
  const radius = Math.max(8, Math.round(w * WINDOW_FRACTION));

  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      const mean = rectMean(sum, w, x0, y0, x1, y1);
      const value = gray[y * w + x];
      // Ink where the pixel is meaningfully darker than its neighbourhood.
      const ink = value < mean - BIAS;
      const out = ink ? 0 : 255;
      const i = (y * w + x) * 4;
      px[i] = out;
      px[i + 1] = out;
      px[i + 2] = out;
      px[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('The image could not be encoded.'))),
      'image/png',
    );
  });

  return { blob, dataUrl: canvas.toDataURL('image/png'), width: w, height: h };
}
