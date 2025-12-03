import { AuthForm } from "@/components/auth/auth-form";
import { Tagline } from "@/components/auth/tagline";

export default function AuthPage() {
  return (
    <main
      className="dark grid place-items-center min-h-screen"
      style={{
        backgroundImage:
          'radial-gradient(circle at 15% 50%, oklch(55.1% 0.15 264 / 30%), oklch(0% 0 0 / 0%) 30%),' +
          'radial-gradient(circle at 85% 30%, oklch(48.8% 0.243 264.376 / 25%), oklch(0% 0 0 / 0%) 40%),' +
          'url("/6256878.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 w-[980px] h-[640px] rounded-3xl shadow-2xl overflow-hidden">
        <AuthForm />
        <Tagline />
      </div>
    </main>
  );
}


