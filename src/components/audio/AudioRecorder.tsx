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
}

export function AudioRecorder({ defaultFilename }: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [filename, setFilename] = useState(defaultFilename ?? "override-message.wav");
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
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
    setConvertedBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setState("converting");
        await convertAudio(blob);
      };

      recorder.start(100); // collect every 100ms
      setState("recording");

      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      toast.error("Microphone access denied. Please allow microphone permission.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    timerRef.current && clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  const convertAudio = async (blob: Blob) => {
    const form = new FormData();
    form.append("audio", blob, "recording.webm");

    try {
      const res = await fetch("/api/audio/convert", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const wavBlob = await res.blob();
      setConvertedBlob(wavBlob);
      setState("recorded");
      toast.success("Recording ready — 8-bit 8 kHz µ-law WAV");
    } catch (err: any) {
      toast.error(`Conversion failed: ${err.message}`);
      setState("idle");
    }
  };

  const togglePlayback = () => {
    if (!convertedBlob) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(URL.createObjectURL(convertedBlob));
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
    setConvertedBlob(null);
    setState("idle");
    setDuration(0);
    setIsPlaying(false);
  };

  const upload = async () => {
    if (!convertedBlob || !filename.trim()) return;
    setState("uploading");

    const form = new FormData();
    const name = filename.endsWith(".wav") ? filename : `${filename}.wav`;
    form.append("file", convertedBlob, name);
    form.append("filename", name);

    try {
      const res = await fetch("/api/wxcc/audio", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`"${name}" uploaded to WxCC audio repository`);
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
        Record a message directly in the browser. It will be converted to the WxCC-required format (8-bit, 8 kHz, mono, µ-law WAV) before uploading.
      </p>

      {/* Recorder controls */}
      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="flex items-center gap-4">
          {/* Main record/stop button */}
          {state === "idle" && (
            <Button onClick={startRecording} className="gap-2 bg-red-600 hover:bg-red-700">
              <Mic className="w-4 h-4" />
              Start Recording
            </Button>
          )}
          {state === "recording" && (
            <Button onClick={stopRecording} variant="outline" className="gap-2 border-red-300 text-red-600">
              <Square className="w-4 h-4 fill-red-600" />
              Stop
            </Button>
          )}

          {/* Timer / status */}
          {state === "recording" && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="font-mono text-sm font-semibold text-red-600">
                {formatTime(duration)}
              </span>
              <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                Recording
              </Badge>
            </div>
          )}

          {state === "converting" && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Converting to µ-law WAV…
            </div>
          )}
        </div>

        {/* Playback & upload controls */}
        {state === "recorded" && convertedBlob && (
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
                <Trash2 className="w-4 h-4" />
                Discard
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
                <Button
                  onClick={upload}
                  disabled={!filename.trim()}
                  className="gap-2 shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                This uploads to the WxCC audio file repository. Update the Global Variable with this filename to use it in a flow.
              </p>
            </div>
          </div>
        )}

        {state === "uploading" && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading to WxCC…
          </div>
        )}
      </div>
    </div>
  );
}
