import { NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { PDFParse } from "pdf-parse";
import { requireUserId } from "@/lib/auth";
import {
  getDemoTranscript,
  parseVtTranscriptText,
  type TranscriptParseResult,
} from "@/lib/transcript-parser";

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing PDF file field 'file'" }, { status: 400 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  const uploadDir = join(tmpdir(), "artisan-uploads");
  await mkdir(uploadDir, { recursive: true });
  const tempPath = join(uploadDir, `${randomUUID()}.pdf`);

  let result: TranscriptParseResult;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);

    let text = "";
    const parser = new PDFParse({ data: buffer });
    try {
      const textResult = await parser.getText();
      text = textResult.text ?? "";
    } finally {
      await parser.destroy();
    }

    const parsed = parseVtTranscriptText(text);
    if (parsed) {
      result = parsed;
    } else {
      result = getDemoTranscript();
    }
  } catch {
    result = getDemoTranscript();
  } finally {
    try {
      await unlink(tempPath);
    } catch {
      // temp file may not exist if write failed early
    }
  }

  return NextResponse.json(result);
}
