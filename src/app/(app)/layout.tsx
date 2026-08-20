import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { verifyToken } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth-token");

  if (!authToken || !(await verifyToken(authToken.value))) {
    redirect("/login");
  }

  return (
    <>
      <a
        href="#conteudo-principal"
        className="fixed left-4 top-3 z-[100] inline-flex min-h-11 -translate-y-20 items-center rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-6 outline-none sm:py-8">{children}</main>
    </>
  );
}
