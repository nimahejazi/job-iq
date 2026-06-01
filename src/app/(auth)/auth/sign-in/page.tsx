import { AuthForm } from "@/app/(auth)/auth/_components/auth-form";
import { signInWithPassword } from "@/lib/auth/actions";

type SignInPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next } = await searchParams;

  return (
    <AuthForm action={signInWithPassword} mode="sign-in" redirectTo={next} />
  );
}
