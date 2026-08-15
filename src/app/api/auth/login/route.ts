import { NextResponse } from "next/server";
import { createAuthToken, passwordMatches } from "@/lib/auth";
import { getRateLimitStatus, registerFailedLogin, resetLoginAttempts } from "@/lib/rate-limit";
import { parseLoginInput } from "@/lib/security/login-input";

const MAX_LOGIN_REQUEST_BYTES = 1024;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function jsonResponse(body: object, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function requestTooLargeResponse(): NextResponse {
  return jsonResponse({ error: "A solicitação de login é grande demais." }, 413);
}

async function readJsonBody(request: Request): Promise<
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse }
> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_LOGIN_REQUEST_BYTES) {
    return { ok: false, response: requestTooLargeResponse() };
  }

  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalBytes = 0;

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_LOGIN_REQUEST_BYTES) {
        await reader.cancel();
        return { ok: false, response: requestTooLargeResponse() };
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
  }

  try {
    return { ok: true, value: JSON.parse(chunks.join("")) as unknown };
  } catch {
    return {
      ok: false,
      response: jsonResponse({ error: "O corpo da solicitação não contém um JSON válido." }, 400),
    };
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      "unknown_ip";

    const status = await getRateLimitStatus(ip);
    if (status.blocked) {
      return jsonResponse(
        { error: status.message || "Muitas tentativas. Tente novamente mais tarde." },
        429,
      );
    }

    const body = await readJsonBody(request);
    if (!body.ok) return body.response;

    const parsed = parseLoginInput(body.value);
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, 400);
    }

    if (!(await passwordMatches(parsed.password))) {
      const failStatus = await registerFailedLogin(ip);
      if (failStatus.blocked) {
        return jsonResponse(
          { error: failStatus.message || "Muitas tentativas. Tente novamente mais tarde." },
          429,
        );
      }

      return jsonResponse({ error: "Senha incorreta." }, 401);
    }

    await resetLoginAttempts(ip);
    const token = await createAuthToken();
    const response = jsonResponse({ success: true });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Erro ao autenticar:", error);
    return jsonResponse({ error: "Erro interno do servidor." }, 500);
  }
}
