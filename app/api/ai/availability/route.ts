import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import {
  aiAvailabilityOutputSchema,
  aiAvailabilityRequestSchema,
  normalizeAIAvailabilityResponse,
} from "@/lib/ai/schemas";
import {
  AVAILABILITY_SYSTEM_PROMPT,
  buildAvailabilityUserPrompt,
} from "@/lib/ai/prompts";
import { getOpenAIModel, isAIConfigured } from "@/lib/ai/server-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsedRequest = aiAvailabilityRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "入力内容を確認してください。自由記述は1600文字以内で入力できます。", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "現在AI入力機能は設定されていません。通常入力をご利用ください。", code: "AI_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 25_000,
      maxRetries: 1,
    });
    const response = await client.responses.parse({
      model: getOpenAIModel(),
      input: [
        { role: "system", content: AVAILABILITY_SYSTEM_PROMPT },
        { role: "user", content: buildAvailabilityUserPrompt(parsedRequest.data) },
      ],
      text: {
        format: zodTextFormat(aiAvailabilityOutputSchema, "availability_plan"),
      },
    });

    if (!response.output_parsed) {
      return NextResponse.json(
        { error: "AIが予定を整理できませんでした。表現を少し変えて再度お試しください。", code: "INVALID_AI_RESPONSE" },
        { status: 502 },
      );
    }

    const result = normalizeAIAvailabilityResponse(
      response.output_parsed,
      parsedRequest.data.schedule,
    );
    return NextResponse.json(result);
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name.includes("Timeout") || error.message.toLowerCase().includes("timeout"));
    return NextResponse.json(
      {
        error: isTimeout
          ? "AIの応答に時間がかかっています。しばらくしてから再度お試しください。"
          : "AI入力を処理できませんでした。現在の予定は変更されていません。",
        code: isTimeout ? "AI_TIMEOUT" : "AI_REQUEST_FAILED",
      },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
