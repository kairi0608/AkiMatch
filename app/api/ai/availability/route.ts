import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import {
  aiAvailabilityOutputSchema,
  aiAvailabilityRequestSchema,
  normalizeAIAvailabilityResponse,
  openAIAvailabilityOutputSchema,
} from "@/lib/ai/schemas";
import {
  AVAILABILITY_SYSTEM_PROMPT,
  buildAvailabilityUserPrompt,
} from "@/lib/ai/prompts";
import { getOpenAIAPIKey, getOpenAIModel } from "@/lib/ai/server-config";
import {
  classifyAIAvailabilityError,
  getSafeAIErrorLog,
} from "@/lib/ai/error-handling";

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

  const apiKey = getOpenAIAPIKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "現在AI入力機能は設定されていません。通常入力をご利用ください。", code: "AI_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  try {
    const client = new OpenAI({
      apiKey,
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
        format: zodTextFormat(openAIAvailabilityOutputSchema, "availability_plan"),
      },
    });

    if (!response.output_parsed) {
      return NextResponse.json(
        { error: "AIが予定を整理できませんでした。表現を少し変えて再度お試しください。", code: "INVALID_AI_RESPONSE" },
        { status: 502 },
      );
    }

    const validatedOutput = aiAvailabilityOutputSchema.safeParse(response.output_parsed);
    if (!validatedOutput.success) {
      console.error("akimatch_ai_availability_invalid_response", {
        issues: validatedOutput.error.issues.map(({ code, path }) => ({ code, path })),
      });
      return NextResponse.json(
        { error: "AIが予定を安全な形式で整理できませんでした。表現を少し変えて再度お試しください。", code: "INVALID_AI_RESPONSE" },
        { status: 502 },
      );
    }

    const result = normalizeAIAvailabilityResponse(
      validatedOutput.data,
      parsedRequest.data.schedule,
    );
    return NextResponse.json(result);
  } catch (error) {
    const failure = classifyAIAvailabilityError(error);
    console.error("akimatch_ai_availability_failed", {
      model: getOpenAIModel(),
      ...getSafeAIErrorLog(error),
    });
    return NextResponse.json(
      {
        error: failure.message,
        code: failure.code,
      },
      { status: failure.status },
    );
  }
}
