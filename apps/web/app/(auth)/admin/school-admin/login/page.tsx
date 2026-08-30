import Link from "next/link";
import { AdminLoginForm } from "@/components/features/auth/admin-login-form";

export default function SchoolAdminLoginPage() {
  return (
    <AdminLoginForm
      role="INSTITUTION_ADMIN"
      title="Welcome back"
      description="Sign in to manage your institution"
      footer={
        <div className="text-center text-sm text-slate-600">
          <p>
            Need to register your institution?{" "}
            <Link
              href="/admin/school-admin/register"
              className="font-medium text-emerald-700 hover:text-emerald-800"
            >
              Request onboarding
            </Link>
          </p>
          <p className="mt-2">
            Already have an activation link?{" "}
            <Link
              href="/admin/school-admin/activate"
              className="font-medium text-emerald-700 hover:text-emerald-800"
            >
              Activate account
            </Link>
          </p>
        </div>
      }
    />
  );
}
