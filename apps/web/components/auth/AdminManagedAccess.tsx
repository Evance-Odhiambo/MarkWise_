import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AdminManagedAccess() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-4 py-8">
      <Card className="w-full max-w-md border-white/80 bg-white/90 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 ring-1 ring-sky-200">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="mt-3 text-2xl">
            Super admin access is managed
          </CardTitle>
          <CardDescription className="mt-2 text-base leading-6">
            Super admin accounts are created securely by the MarkWise platform
            owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            There is no public sign-up for this role.
          </p>
          <Link
            href="/admin/super-admin/login"
            className="block font-semibold text-sky-700 hover:text-sky-800"
          >
            Go to sign in
          </Link>
          <Link
            href="/admin/institution/register"
            className="block text-sm text-emerald-700 hover:text-emerald-800"
          >
            Need to onboard an institution?
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
