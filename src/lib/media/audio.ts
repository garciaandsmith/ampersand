import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

/** Length of each audio piece. Transcription models reject clips much over ~23 minutes. */
const CHUNK_SECONDS = 20 * 60;
/** Give up on ffmpeg after this long, before the serverless function's own limit (300 s) kills it. */
const FFMPEG_TIMEOUT_MS = 240_000;

export type AudioChunks = {
  /** Each chunk's mp3 bytes, in playback order. */
  chunks: Buffer[];
};

/**
 * Pulls the audio track out of an audio/video file and splits it into short,
 * small mp3 pieces that fit a transcription API. ffmpeg reads the file
 * straight from a (signed) URL, so a 300 MB video is never held in memory or
 * written to disk — only the few-MB output goes to the temp directory
 * (`/tmp` on Vercel), which is removed afterwards.
 *
 * Speech survives 16 kHz mono at 32 kbps, which is also what the models
 * downsample to internally: ~14 MB per hour of audio.
 */
export async function extractAudioChunks(sourceUrl: string): Promise<AudioChunks> {
  if (!ffmpegPath) throw new Error("ffmpeg isn't available on this platform, so audio can't be extracted.");

  const dir = await mkdtemp(path.join(tmpdir(), "ampersand-audio-"));
  try {
    await runFfmpeg(ffmpegPath, [
      "-nostdin",
      "-hide_banner",
      "-loglevel", "error",
      "-i", sourceUrl,
      "-vn",
      "-ac", "1",
      "-ar", "16000",
      "-c:a", "libmp3lame",
      "-b:a", "32k",
      "-f", "segment",
      "-segment_time", String(CHUNK_SECONDS),
      "-reset_timestamps", "1",
      path.join(dir, "chunk-%04d.mp3"),
    ]);

    const names = (await readdir(dir)).filter((n) => n.endsWith(".mp3")).sort();
    if (names.length === 0) throw new Error("No audio track found in this file.");
    const chunks = await Promise.all(names.map((n) => readFile(path.join(dir, n))));
    return { chunks };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function runFfmpeg(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      // Keep only the tail; a failing run can be chatty and the last lines hold the reason.
      stderr = (stderr + d).slice(-2000);
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Extracting the audio took too long."));
    }, FFMPEG_TIMEOUT_MS);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`Could not start ffmpeg: ${e.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg couldn't read this file${stderr.trim() ? `: ${stderr.trim().split("\n").pop()}` : "."}`));
    });
  });
}
