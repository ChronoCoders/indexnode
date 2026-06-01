import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has("auth_present");
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

export async function requireGuest(): Promise<void> {
  if (await isAuthenticated()) {
    redirect("/dashboard");
  }
}
