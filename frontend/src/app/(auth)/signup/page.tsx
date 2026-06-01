import { requireGuest } from "@/lib/auth";
import SignupForm from "@/components/auth/signup-form";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  await requireGuest();
  return <SignupForm />;
}
