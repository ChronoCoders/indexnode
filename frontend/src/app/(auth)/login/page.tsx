import { requireGuest } from "@/lib/auth";
import LoginForm from "@/components/auth/login-form";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  await requireGuest();
  return <LoginForm />;
}
