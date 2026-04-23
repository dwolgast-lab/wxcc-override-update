"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mic, Square, Play, Pause, Upload, Trash2, Loader2 } from "lucide-react";

type RecordingState = "idle" | "recording" | "recorded" | "converting" | "uploading";

interface AudioRecorderProps {
  defaultFilename?: string;
  onUploaded?: (filename: string) => void;
}

// G.711 µ-law (PCMU) encoding — no external dependencies
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

async function toMuLawWav(rawBlob: Blob): Promise<Blob> {
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

export function AudioRecorder({ defaultFilename, onUploaded }: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [filename, setFilename] = useState(defaultFilename ?? "override-message.wav");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null); // original recording for playback
  const [wavBlob, setWavBlob] = useState<Blob | null>(null);          // µ-law WAV for upload
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    setDuration(0);
    setPreviewBlob(null);
    setWavBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const raw = new Blob(chunksRef.current, { type: recorder.mimeType });
        setState("converting");
        try {
          const wav = await toMuLawWav(raw);
          setPreviewBlob(raw);   // keep original for listen-back
          setWavBlob(wav);        // µ-law copy for upload
          setState("recorded");
          toast.success("Recording ready — 8-bit 8 kHz µ-law WAV");
        } catch (err: any) {
          toast.error(`Conversion failed: ${err.message}`);
          setState("idle");
        }
      };

      recorder.start(100);
      setState("recording");
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      toast.error("Microphone access denied. Please allow microphone permission.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    timerRef.current && clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  const togglePlayback = () => {
    if (!previewBlob) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(URL.createObjectURL(previewBlob));
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const discard = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPreviewBlob(null);
    setWavBlob(null);
    setState("idle");
    setDuration(0);
    setIsPlaying(false);
  };

  const upload = async () => {
    if (!wavBlob || !filename.trim()) return;
    setState("uploading");
    const name = filename.endsWith(".wav") ? filename : `${filename}.wav`;
    const form = new FormData();
    form.append("file", wavBlob, name);
    form.append("filename", name);
    try {
      const res = await fetch("/api/wxcc/audio", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }
      toast.success(`"${name}" uploaded to WxCC audio repository`);
      onUploaded?.(name);
      discard();
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
      setState("recorded");
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Record a message directly in the browser. It will be converted to the WxCC-required
        format (8-bit, 8 kHz, mono, µ-law WAV) before uploading.
      </p>

      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="flex items-center gap-4">
          {state === "idle" && (
            <Button onClick={startRecording} className="gap-2 bg-red-600 hover:bg-red-700">
              <Mic className="w-4 h-4" /> Start Recording
            </Button>
          )}
          {state === "recording" && (
            <Button onClick={stopRecording} variant="outline" className="gap-2 border-red-300 text-red-600">
              <Square className="w-4 h-4 fill-red-600" /> Stop
            </Button>
          )}
          {state === "recording" && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="font-mono text-sm font-semibold text-red-600">{formatTime(duration)}</span>
              <Badge variant="outline" className="text-xs text-red-600 border-red-200">Recording</Badge>
            </div>
          )}
          {state === "converting" && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Converting to µ-law WAV…
            </div>
          )}
        </div>

        {state === "recorded" && wavBlob && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
              <span className="text-green-700 text-sm font-medium">
                Recording ready ({formatTime(duration)})
              </span>
              <Badge className="bg-green-600 text-xs ml-auto">8 kHz µ-law WAV</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={togglePlayback} variant="outline" className="gap-2">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? "Pause" : "Listen back"}
              </Button>
              <Button onClick={discard} variant="ghost" className="gap-2 text-gray-500">
                <Trash2 className="w-4 h-4" /> Discard
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Filename for WxCC repository</Label>
              <div className="flex gap-2">
                <Input
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="override-message.wav"
                  className="font-mono"
                />
                <Button onClick={upload} disabled={!filename.trim()} className="gap-2 shrink-0">
                  <Upload className="w-4 h-4" /> Upload
                </Button>
              </div>
            </div>
          </div>
        )}

        {state === "uploading" && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading to WxCC…
          </div>
        )}
      </div>
    </div>
  );
}
