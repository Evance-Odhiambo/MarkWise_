import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

export default function InstitutionAdminLoginPage() {
  return (
    <AdminLoginForm
      role="INSTITUTION_ADMIN"
      title="Institution admin sign in"
      description="Manage your institution's academic structure, staff, and students."
      footer={<p className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">Your account is created after institution onboarding approval.</p>}
    />
  );
}