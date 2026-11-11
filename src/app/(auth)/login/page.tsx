"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (user) router.replace("/invoices");
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    router.replace("/invoices");
    router.refresh();
  }

  return (
    <Card className="border-0 p-6 shadow-xl sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
          <FileText className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Biginex</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" size="lg" loading={loading}>Sign in</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account? <Link href="/register" className="font-medium text-primary hover:underline">Register</Link>
      </p>
    </Card>
  );
}
