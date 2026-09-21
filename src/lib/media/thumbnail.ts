// Browser-only: builds a JPEG preview of an image or video so an upload is
// recognisable at a glance. Returns null when the browser can't decode the file
// (e.g. HEIC images or HEVC video in Chrome) — callers fall back to an icon.

/** Longest side of the generated preview, in px. Big enough to recognise content, small enough to be cheap to store. */
const MAX_SIZE = 800;

function drawToBlob(source: CanvasImageSource, width: number, height: number): Promise<Blob | null> {
  if (!width || !height) return Promise.resolve(null);
  const scale = Math.min(1, MAX_SIZE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = "#fff"; // JPEG has no alpha; avoid black backgrounds on transparent PNGs
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

async function imageThumbnail(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const blob = await drawToBlob(bitmap, bitmap.width, bitmap.height);
    bitmap.close();
    return blob;
  } catch {
    return null;
  }
}

function videoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");

    const finish = (blob: Blob | null) => {
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(blob);
    };

    const timer = setTimeout(() => finish(null), 10000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onerror = () => finish(null);
    // Grab a frame a little way in, so we skip the black/fade-in first frame.
    video.onloadeddata = () => {
      const t = Number.isFinite(video.duration) ? Math.min(1, video.duration / 10) : 0;
      video.currentTime = Math.max(t, 0.01);
    };
    video.onseeked = async () => finish(await drawToBlob(video, video.videoWidth, video.videoHeight));
    video.src = url;
  });
}

export function makeThumbnail(file: File): Promise<Blob | null> {
  if (file.type.startsWith("image/")) return imageThumbnail(file);
  if (file.type.startsWith("video/")) return videoThumbnail(file);
  return Promise.resolve(null);
}
