import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthLayoutProps {
  role: "student" | "lecturer";
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

const roleStyles = {
  student: {
    page: "from-emerald-50 via-white to-cyan-50",
    glow: "bg-emerald-300/30",
    icon: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  lecturer: {
    page: "from-emerald-50 via-white to-cyan-50",
    glow: "bg-emerald-300/30",
    icon: "bg-sky-100 text-sky-700 ring-sky-200",
  },
} as const;

export function AuthLayout({
  role,
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  const styles = roleStyles[role];

  return (
    <main className={`relative flex min-h-dvh items-start justify-center overflow-x-hidden bg-gradient-to-br ${styles.page} px-4 py-6 sm:items-center sm:px-6 sm:py-10`}>
      <div className={`pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl ${styles.glow}`} />
      <div className={`pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full blur-3xl ${styles.glow}`} />

        <section className="relative my-auto w-full min-w-0 max-w-md">
          <Card className="w-full min-w-0 border-white/70 bg-white/90 shadow-[0_25px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <CardHeader className="space-y-4 pb-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${styles.icon}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{eyebrow}</p>
                <CardTitle className="mt-2 text-3xl tracking-tight text-slate-950">{title}</CardTitle>
                <CardDescription className="mt-2 text-base leading-6 text-slate-600">{description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {children}
              {footer}
            </CardContent>
          </Card>
      </section>
    </main>
  );
}
