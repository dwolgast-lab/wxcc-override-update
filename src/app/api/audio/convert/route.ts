import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { randomBytes } from "crypto";

const execAsync = promisify(exec);

// POST /api/audio/convert
// Body: multipart/form-data with field "audio" (any browser-recorded format)
// Returns: WAV in 8-bit, 8 kHz, mono, µ-law encoding
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("audio") as File | null;
  if (!file) return NextResponse.json({ error: "No audio file provided" }, { status: 400 });

  const id = randomBytes(8).toString("hex");
  const inputPath = join(tmpdir(), `wxcc_in_${id}`);
  const outputPath = join(tmpdir(), `wxcc_out_${id}.wav`);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    // Convert to 8-bit µ-law, 8000 Hz, mono WAV using ffmpeg
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -ar 8000 -ac 1 -acodec pcm_mulaw "${outputPath}"`
    );

    const outBuffer = await readFile(outputPath);
    return new NextResponse(outBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `attachment; filename="recording.wav"`,
      },
    });
  } catch (err: any) {
    console.error("Audio conversion error:", err);
    return NextResponse.json({ error: "Audio conversion failed. Ensure ffmpeg is installed." }, { status: 500 });
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
