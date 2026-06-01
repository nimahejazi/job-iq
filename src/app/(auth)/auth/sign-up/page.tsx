import { AuthForm } from "@/app/(auth)/auth/_components/auth-form";
import { signUpWithPassword } from "@/lib/auth/actions";

export default function SignUpPage() {
  return <AuthForm action={signUpWithPassword} mode="sign-up" />;
}
