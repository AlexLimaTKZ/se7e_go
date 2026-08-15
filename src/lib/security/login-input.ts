export const MAX_LOGIN_PASSWORD_LENGTH = 256;

type LoginInputResult =
  | { ok: true; password: string }
  | { ok: false; error: string };

export function parseLoginInput(value: unknown): LoginInputResult {
  if (!value || typeof value !== "object" || !("password" in value)) {
    return { ok: false, error: "Senha é obrigatória." };
  }

  const password = (value as { password?: unknown }).password;
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, error: "Senha é obrigatória." };
  }
  if (password.length > MAX_LOGIN_PASSWORD_LENGTH) {
    return { ok: false, error: "A senha informada é inválida." };
  }

  return { ok: true, password };
}

export function resolveLoginRedirect(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001F\u007F]/u.test(value)
  ) {
    return "/";
  }

  try {
    const baseUrl = new URL("https://se7e.local");
    const destination = new URL(value, baseUrl);
    const decodedPath = decodeURIComponent(destination.pathname);

    if (
      destination.origin !== baseUrl.origin ||
      decodedPath.includes("\\") ||
      destination.pathname === "/login" ||
      destination.pathname.startsWith("/login/")
    ) {
      return "/";
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}
