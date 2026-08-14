export type AIAvailabilityErrorResponse = {
  status: number;
  code: string;
  message: string;
};

type ErrorLike = {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  code?: unknown;
};

function asErrorLike(error: unknown): ErrorLike {
  return error && typeof error === "object" ? error as ErrorLike : {};
}

/** OpenAI SDKの例外を、秘密情報を含まない利用者向けエラーへ変換する。 */
export function classifyAIAvailabilityError(error: unknown): AIAvailabilityErrorResponse {
  const candidate = asErrorLike(error);
  const status = typeof candidate.status === "number" ? candidate.status : undefined;
  const code = typeof candidate.code === "string" ? candidate.code : undefined;
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";

  if (name.includes("Timeout") || message.includes("timeout") || message.includes("timed out")) {
    return {
      status: 504,
      code: "AI_TIMEOUT",
      message: "AIの応答に時間がかかっています。しばらくしてから再度お試しください。",
    };
  }

  if (status === 401) {
    return {
      status: 503,
      code: "AI_AUTH_ERROR",
      message: "AIの認証設定を確認できませんでした。VercelのOPENAI_API_KEYを確認してください。",
    };
  }

  if (status === 403) {
    return {
      status: 503,
      code: "AI_PERMISSION_ERROR",
      message: "AIモデルを利用する権限がありません。OpenAIプロジェクトとモデル設定を確認してください。",
    };
  }

  if (status === 429) {
    return {
      status: 429,
      code: code === "insufficient_quota" ? "AI_QUOTA_EXCEEDED" : "AI_RATE_LIMITED",
      message: code === "insufficient_quota"
        ? "OpenAI APIの利用枠が不足しています。請求設定と利用上限を確認してください。"
        : "AIへのアクセスが集中しています。少し待ってから再度お試しください。",
    };
  }

  if (status === 400 || status === 404 || status === 422) {
    return {
      status: 502,
      code: "AI_MODEL_CONFIGURATION_ERROR",
      message: "AIモデルまたは出力形式の設定を確認できませんでした。OPENAI_MODELを未設定にするか、gpt-4o-miniを指定してください。",
    };
  }

  if (status && status >= 500) {
    return {
      status: 503,
      code: "AI_PROVIDER_UNAVAILABLE",
      message: "現在AIサービスへ接続しづらい状態です。少し待ってから再度お試しください。",
    };
  }

  return {
    status: 502,
    code: "AI_REQUEST_FAILED",
    message: "AI入力を処理できませんでした。現在の予定は変更されていません。",
  };
}

/** Vercelログへ残す、入力本文やAPIキーを含まない診断情報。 */
export function getSafeAIErrorLog(error: unknown) {
  const candidate = asErrorLike(error);
  return {
    name: typeof candidate.name === "string" ? candidate.name : "UnknownError",
    status: typeof candidate.status === "number" ? candidate.status : null,
    code: typeof candidate.code === "string" ? candidate.code : null,
    message: typeof candidate.message === "string" ? candidate.message.slice(0, 500) : "Unknown error",
  };
}
