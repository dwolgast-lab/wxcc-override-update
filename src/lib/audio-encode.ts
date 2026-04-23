// G.711 µ-law (PCMU) encoding for Webex Contact Center WAV uploads.
// No external dependencies — uses only the Web Audio API.

function linearToMuLaw(sample: number): number {
  const MU = 255;
  const pcm = Math.round(Math.max(-1, Math.min(1, sample)) * 32767);
  const sign = pcm < 0 ? 0x80 : 0;
  const magnitude = Math.abs(pcm);
  const compressed = Math.log(1 + (MU * magnitude) / 32767) / Math.log(1 + MU);
  const quantized = Math.min(127, Math.floor(compressed * 127 + 0.5));
  return (~(sign | quantized)) & 0xff;
}

function buildMuLawWav(mulaw: Uint8Array): Blob {
  const SR = 8000;
  const dataLen = mulaw.length;
  // RIFF(12) + fmt(8+18) + fact(8+4) + data(8+N)
  const buf = new ArrayBuffer(12 + 26 + 12 + 8 + dataLen);
  const v = new DataView(buf);
  let o = 0;
  const str = (s: string) => { for (const c of s) v.setUint8(o++, c.charCodeAt(0)); };
  const u32 = (n: number) => { v.setUint32(o, n, true); o += 4; };
  const u16 = (n: number) => { v.setUint16(o, n, true); o += 2; };

  str("RIFF"); u32(buf.byteLength - 8); str("WAVE");
  str("fmt "); u32(18);
  u16(7);   // MULAW format
  u16(1);   // mono
  u32(SR);
  u32(SR);  // byte rate = SR × 1 channel × 1 byte/sample
  u16(1);   // block align
  u16(8);   // bits per sample
  u16(0);   // cbSize
  str("fact"); u32(4); u32(dataLen);
  str("data"); u32(dataLen);
  new Uint8Array(buf, o).set(mulaw);

  return new Blob([buf], { type: "audio/wav" });
}

export async function toMuLawWav(rawBlob: Blob): Promise<Blob> {
  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(await rawBlob.arrayBuffer());
  await audioCtx.close();

  const TARGET_SR = 8000;
  const offCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_SR), TARGET_SR);
  const src = offCtx.createBufferSource();
  src.buffer = decoded;
  src.connect(offCtx.destination);
  src.start(0);
  const resampled = await offCtx.startRendering();

  const pcm = resampled.getChannelData(0);
  const mulaw = new Uint8Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) mulaw[i] = linearToMuLaw(pcm[i]);

  return buildMuLawWav(mulaw);
}
