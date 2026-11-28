/* Fast on-device checks so a client never uploads an unusable shot. */

export function frameStats(source: CanvasImageSource, w: number, h: number) {
  const W = 240;
  const H = Math.round((h / w) * W);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);
  const gray = new Float32Array(W * H);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = g;
    sum += g;
  }
  const brightness = sum / gray.length; // 0..255
  // Variance of the Laplacian = sharpness.
  let lsum = 0;
  let lsq = 0;
  let n = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const lap = gray[i - W] + gray[i + W] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      lsum += lap;
      lsq += lap * lap;
      n++;
    }
  }
  const mean = lsum / n;
  const sharpness = lsq / n - mean * mean;
  return { brightness, sharpness };
}

export function verdict(s: { brightness: number; sharpness: number }) {
  if (s.brightness < 45) return "Too dark — move closer to a window or turn on more light.";
  if (s.brightness > 225) return "Too bright — step out of direct light.";
  if (s.sharpness < 35) return "A little soft — hold steady and try again.";
  return null;
}

export function grab(video: HTMLVideoElement, maxSide: number, quality = 0.9): Promise<{ blob: Blob; canvas: HTMLCanvasElement }> {
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const scale = Math.min(1, maxSide / Math.max(vw, vh));
  const c = document.createElement("canvas");
  c.width = Math.round(vw * scale);
  c.height = Math.round(vh * scale);
  c.getContext("2d")!.drawImage(video, 0, 0, c.width, c.height);
  return new Promise((resolve) => c.toBlob((b) => resolve({ blob: b!, canvas: c }), "image/jpeg", quality));
}
