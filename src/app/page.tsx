import Link from "next/link";
import { FileText, Wifi, Smartphone, Shield } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="hero-bg min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-bold text-primary">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <FileText className="h-4 w-4" />
          </span>
          Biginex
        </div>
        <div className="flex gap-2">
          <Link className={buttonVariants({ variant: "ghost" })} href="/login">Sign in</Link>
          <Link className={buttonVariants()} href="/register">Get started</Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-20 pt-16 text-center animate-fade-in">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          GST invoices that work{" "}
          <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
            online & offline
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Create invoices, download PDF, install as an app. One product — browser and PWA.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className={buttonVariants({ size: "lg" })} href="/register">Create free account</Link>
          <Link className={buttonVariants({ size: "lg", variant: "outline" })} href="/login">Sign in</Link>
        </div>

        <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
          {[
            { icon: Wifi, t: "Online + offline", d: "Queue invoices when offline; auto-sync when back." },
            { icon: FileText, t: "PDF download", d: "Print-ready tax invoice sheet in one click." },
            { icon: Smartphone, t: "Installable PWA", d: "Add to home screen — works like a native app." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-semibold">{t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
