import { LoginForm } from "./login-form";
import { resolveLoginRedirect } from "@/lib/security/login-input";

type LoginPageProps = {
  searchParams: Promise<{
    from?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { from } = await searchParams;
  return <LoginForm redirectTo={resolveLoginRedirect(from)} />;
}
