"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MotionConfig, motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { MAX_LOGIN_PASSWORD_LENGTH } from "@/lib/security/login-input";
import styles from "./login-ambient.module.css";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

type LoginFormProps = {
  redirectTo: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // Do not prefetch protected routes before authentication. A prefetch made
        // without the auth cookie can cache the /login redirect and immediately
        // send a successfully authenticated user back to this page.
        router.replace(redirectTo);
        return;
      }

      let message = "Não foi possível entrar. Tente novamente.";
      try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body.error === "string" && body.error.length > 0) {
          message = body.error;
        }
      } catch {
        // Mantém uma mensagem acionável quando a resposta não contém JSON.
      }

      setError(message);
      setPassword("");
      inputRef.current?.focus();
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const currentYear = new Date().getUTCFullYear();

  return (
    <MotionConfig reducedMotion="user">
      <main
        data-login-page
        className="flex min-h-screen min-h-dvh w-full max-w-full overflow-x-clip bg-[#030303] text-white selection:bg-white/30 selection:text-white"
      >
        <section
          aria-labelledby="login-title"
          className="relative z-10 flex w-full flex-col justify-center border-white/5 bg-black/70 pb-[max(3rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pt-[max(3rem,env(safe-area-inset-top))] shadow-[20px_0_100px_rgba(0,0,0,0.5)] lg:w-[45%] lg:border-r lg:bg-black/40 lg:px-16 lg:py-12 lg:backdrop-blur-2xl xl:w-[40%]"
        >
          <div
            data-mobile-login-ambient
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 overflow-hidden lg:hidden ${styles.mobileAmbient}`}
          >
            <div data-mobile-grid className={styles.mobileGrid} />
            <div data-mobile-grid-glow className={styles.mobileGlow} />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[min(28rem,90vw)] w-[min(28rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 opacity-40 blur-[80px] sm:blur-[110px]"
          />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-20 mx-auto flex w-full max-w-sm flex-col"
          >
            <motion.header variants={fadeUp} className="mb-12 flex flex-col items-start sm:mb-14">
              <div className="mb-3 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-white/15 bg-white/[0.04] p-1.5 shadow-xl">
                  <Image
                    src="/se7e-logo-v2.png"
                    alt="SE7E Alumínio e Vidros"
                    width={48}
                    height={48}
                    priority
                    className="h-full w-full object-contain"
                  />
                </div>
                <h1 id="login-title" className="text-4xl font-bold tracking-tighter text-white sm:text-5xl">
                  SE7E GO
                </h1>
              </div>
              <p className="ml-1 text-xs font-medium uppercase leading-relaxed tracking-[0.22em] text-white/65">
                Sistema gerador de orçamentos
              </p>
            </motion.header>

            <motion.form
              variants={fadeUp}
              onSubmit={handleSubmit}
              aria-busy={loading}
              className="w-full"
            >
              <div className="mb-6">
                <label
                  htmlFor="login-password"
                  className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75"
                >
                  <Lock aria-hidden="true" className="h-4 w-4" />
                  Senha de acesso
                </label>

                <div className="relative flex min-h-14 items-center rounded-xl border border-white/15 bg-white/[0.04] transition-[border-color,box-shadow,background-color] focus-within:border-white/45 focus-within:bg-white/[0.06] focus-within:ring-2 focus-within:ring-white/15">
                  <input
                    ref={inputRef}
                    id="login-password"
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (error) setError("");
                    }}
                    required
                    maxLength={MAX_LOGIN_PASSWORD_LENGTH}
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "password-error" : "password-help"}
                    className="h-14 min-w-0 flex-1 bg-transparent px-4 pr-14 text-base text-white outline-none placeholder:text-white/50 disabled:cursor-wait [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:transition-colors [&:-webkit-autofill]:duration-[5000s]"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    aria-label={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={passwordVisible}
                    className="absolute right-1 flex h-12 w-12 touch-manipulation items-center justify-center rounded-lg text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-50"
                    disabled={loading}
                  >
                    {passwordVisible ? (
                      <EyeOff aria-hidden="true" className="h-5 w-5" />
                    ) : (
                      <Eye aria-hidden="true" className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="min-h-10 pt-2">
                  {error ? (
                    <motion.p
                      id="password-error"
                      role="alert"
                      aria-live="polite"
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm font-medium leading-5 text-red-300"
                    >
                      {error}
                    </motion.p>
                  ) : (
                    <p id="password-help" className="text-xs leading-5 text-white/55">
                      Use a senha definida pelo administrador.
                    </p>
                  )}
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading || !password}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="group flex h-14 w-full touch-manipulation items-center justify-between rounded-full bg-white px-6 text-xs font-bold uppercase tracking-[0.16em] text-black transition-[background-color,box-shadow,opacity] hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span>{loading ? "Autenticando..." : "Entrar no sistema"}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 transition-colors group-hover:bg-black/20">
                  {loading ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  )}
                </span>
              </motion.button>
            </motion.form>

            <motion.footer
              variants={fadeIn}
              className="mt-16 text-xs uppercase tracking-[0.2em] text-white/55 sm:mt-20"
            >
              <p>Acesso restrito &copy; {currentYear}</p>
            </motion.footer>
          </motion.div>
        </section>

        <aside
          data-login-ambient
          aria-hidden="true"
          className="relative hidden w-full flex-col items-center justify-center overflow-hidden bg-[#020202] lg:flex lg:w-[55%] xl:w-[60%]"
        >
          <div className="absolute inset-0 z-0">
            <div className="absolute left-[-20%] top-[-10%] h-[70%] w-[70%] rounded-full bg-primary/20 opacity-60 blur-[150px] mix-blend-screen" />
            <div className="absolute right-[-10%] top-[40%] h-[60%] w-[60%] rounded-full bg-[#102450]/40 opacity-70 blur-[150px] mix-blend-screen" />
            <div className="absolute bottom-[-20%] left-[20%] h-[50%] w-[50%] rounded-full bg-primary/10 opacity-50 blur-[120px] mix-blend-screen" />
          </div>

          <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:100px_100px] opacity-10 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />
          <div data-ambient-beam className={styles.beam} />

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex w-full select-none flex-col items-center justify-center px-12"
          >
            <motion.h2
              data-ambient-brand
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.85, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className={`${styles.brand} text-[15vw] font-bold leading-none tracking-tighter text-transparent`}
            >
              SE7E
            </motion.h2>
            <motion.p
              data-ambient-tagline
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.58, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-[20%] w-full max-w-lg text-center text-xs font-medium uppercase leading-relaxed tracking-[0.5em] text-white/55 drop-shadow-md"
            >
              Elevando o padrão em alumínio e vidros com design e precisão.
            </motion.p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.75, ease: "easeOut" }}
            className="absolute right-12 top-8 z-10 font-mono text-xs uppercase tracking-[0.2em] text-white/50"
          >
            SYS.VER.2.0
          </motion.p>
          <motion.p
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.9, ease: "easeOut" }}
            className="absolute bottom-8 right-12 z-10 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-white/55"
          >
            <span data-ambient-security-pulse className={styles.securityPulse}>
              <ShieldCheck aria-hidden="true" className="relative z-10 h-4 w-4 text-emerald-400/80" />
            </span>
            Acesso seguro
          </motion.p>
        </aside>
      </main>
    </MotionConfig>
  );
}
