import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  // Show the Google button only when OAuth is configured.
  return <LoginForm googleEnabled={!!process.env.AUTH_GOOGLE_ID} />;
}
