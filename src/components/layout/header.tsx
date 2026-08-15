"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard, LayoutList, LogOut } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const navItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/orcamentos",
      label: "Orçamentos",
      icon: LayoutList,
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="group flex min-h-11 items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="SE7E — ir para o dashboard">
          <Image
            src="/se7e-logo-v2.png"
            alt="Logo SE7E Alumínio & Vidros"
            width={32}
            height={32}
            loading="eager"
            className="h-8 w-8 rounded-full object-cover transition-transform group-hover:scale-110"
          />
          <span className="text-lg font-bold tracking-tighter text-foreground uppercase">
            SE7E
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1" aria-label="Navegação principal">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "sm" }),
                  "h-11 min-w-11 gap-2 px-3 text-sm",
                  isActive && "bg-primary/10 text-primary",
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}

          <div className="mx-2 h-6 w-px bg-border" />

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="size-11 text-muted-foreground hover:text-destructive"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
