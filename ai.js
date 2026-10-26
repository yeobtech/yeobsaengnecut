// AI 누끼: MediaPipe 모델을 기기 안에서 실행 (사진을 밖으로 보내지 않음)
import { FilesetResolver, ImageSegmenter, InteractiveSegmenterLegacy } from "./vendor/mediapipe/vision_bundle.mjs";

const BASE = new URL("./", import.meta.url).href;
let filesetP;
const fileset = () => (filesetP ||= FilesetResolver.forVisionTasks(BASE + "vendor/mediapipe/wasm"));

// GPU를 먼저 시도하고, 안 되는 기기는 CPU로
async function create(Cls, opts) {
  const fs = await fileset();
  try { return await Cls.createFromOptions(fs, { ...opts, baseOptions: { ...opts.baseOptions, delegate: "GPU" } }); }
  catch { return await Cls.createFromOptions(fs, { ...opts, baseOptions: { ...opts.baseOptions, delegate: "CPU" } }); }
}
function readMask(result, pick) {
  const masks = result.confidenceMasks || [];
  const m = pick(masks);
  const out = { w: m.width, h: m.height, data: Float32Array.from(m.getAsFloat32Array()) };
  result.close?.();
  return out;
}

/* 사진 속 사람 (머리카락·몸·옷 포함) */
let personP;
export async function personAlpha(source) {
  const seg = await (personP ||= create(ImageSegmenter, {
    baseOptions: { modelAssetPath: BASE + "models/selfie_multiclass_256x256.tflite" },
    runningMode: "IMAGE", outputConfidenceMasks: true, outputCategoryMask: false,
  }));
  // 0번 채널이 배경 → 사람 = 1 - 배경
  const m = readMask(seg.segment(source), (ms) => ms[0]);
  for (let i = 0; i < m.data.length; i++) m.data[i] = 1 - m.data[i];
  return m;
}

/* 누른 곳에 있는 대상 하나 (사람·동물·물건) */
let objectP;
export async function objectAlpha(source, x, y) {
  const seg = await (objectP ||= create(InteractiveSegmenterLegacy, {
    baseOptions: { modelAssetPath: BASE + "models/magic_touch.tflite" },
    outputConfidenceMasks: true, outputCategoryMask: false,
  }));
  return readMask(seg.segment(source, { keypoint: { x, y } }), (ms) => ms[0]);
}

/* 촬영 화면 실시간 인물 분리 */
let videoSeg;
export async function initVideo() {
  videoSeg ||= await create(ImageSegmenter, {
    baseOptions: { modelAssetPath: BASE + "models/selfie_segmenter.tflite" },
    runningMode: "VIDEO", outputConfidenceMasks: true, outputCategoryMask: false,
  });
}
let lastTs = 0;
export function videoAlpha(video) {
  const ts = Math.max(performance.now(), lastTs + 1); lastTs = ts;
  // 모델 출력이 한 장이면 사람 확률, 두 장이면 마지막이 사람
  return readMask(videoSeg.segmentForVideo(video, ts), (ms) => ms[ms.length - 1]);
}
