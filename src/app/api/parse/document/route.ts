import { parseProfileText } from "@/lib/parsers";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";
import { createWorker } from "tesseract.js";

async function extractTextFromPdf(file: File) {
  const arr = await file.arrayBuffer();
  const parser = new PDFParse({ data: Buffer.from(arr) });
  try {
    const parsed = await parser.getText();
    return parsed.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function extractTextFromImage(file: File) {
  const arr = await file.arrayBuffer();
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(Buffer.from(arr));
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const raw = form.get("file");
  if (!(raw instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const file = raw as File;
  const mime = file.type?.toLowerCase() ?? "";

  try {
    if (mime.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")) {
      const text = await extractTextFromPdf(file);
      if (!text.trim()) {
        return NextResponse.json(
          { error: "No readable text found in PDF. If this is a scanned PDF, OCR is needed." },
          { status: 422 },
        );
      }
      return NextResponse.json({
        text,
        parsed: parseProfileText(text),
      });
    }

    if (mime.startsWith("image/")) {
      const text = await extractTextFromImage(file);
      if (!text.trim()) {
        return NextResponse.json(
          { error: "OCR did not detect readable text in this image. Try a clearer image or PDF." },
          { status: 422 },
        );
      }
      return NextResponse.json({
        text,
        parsed: parseProfileText(text),
      });
    }

    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF or image." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: `Could not parse document: ${(error as Error).message}` },
      { status: 400 },
    );
  }
}
