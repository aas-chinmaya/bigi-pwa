export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">{children}</div>
    </div>
  );
}
