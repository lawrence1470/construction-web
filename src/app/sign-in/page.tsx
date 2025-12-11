"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn.email({
        email,
        password,
        fetchOptions: {
          onSuccess: () => {
            router.push(callbackUrl);
            router.refresh();
          },
          onError: (ctx) => {
            setError(ctx.error.message || "Sign in failed");
            setLoading(false);
          },
        },
      });
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e8e9f3] dark:bg-[var(--bg-primary)] flex items-center justify-center p-6 transition-colors">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-0 bg-white dark:bg-[var(--bg-card)] rounded-3xl overflow-hidden shadow-xl dark:shadow-black/20">
        {/* Left side - Form */}
        <div className="p-12 lg:p-16 flex flex-col justify-center">
          <div className="mb-12">
            <Link href="/" className="flex items-center gap-3 mb-8 w-fit hover:opacity-80 transition-opacity">
              <div className="w-12 h-12 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white rounded-full"></div>
              </div>
              <span className="text-gray-800 dark:text-[var(--text-primary)] text-lg font-medium">BuildTrack Pro</span>
            </Link>
            <h1 className="text-2xl font-medium text-gray-800 dark:text-[var(--text-primary)] mb-3">Welcome back</h1>
            <p className="text-gray-500 dark:text-[var(--text-secondary)]">Sign in to continue to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm text-gray-700 dark:text-[var(--text-secondary)] mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Mail className="w-5 h-5 text-gray-400 dark:text-[var(--text-muted)]" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@company.com"
                  className="w-full pl-12 pr-4 py-4 bg-[#f5f5f9] dark:bg-[var(--bg-input)] text-gray-900 dark:text-[var(--text-primary)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-[var(--accent-purple)] transition-all placeholder:text-gray-500 dark:placeholder:text-[var(--text-muted)]"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-gray-700 dark:text-[var(--text-secondary)] mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Lock className="w-5 h-5 text-gray-400 dark:text-[var(--text-muted)]" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-4 bg-[#f5f5f9] dark:bg-[var(--bg-input)] text-gray-900 dark:text-[var(--text-primary)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-[var(--accent-purple)] transition-all placeholder:text-gray-500 dark:placeholder:text-[var(--text-muted)]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[var(--text-muted)] hover:text-gray-600 dark:hover:text-[var(--text-secondary)]"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 dark:border-[var(--border-color)] text-gray-800 dark:text-[var(--accent-purple)] focus:ring-gray-800 dark:focus:ring-[var(--accent-purple)] dark:bg-[var(--bg-input)]"
                />
                <span className="text-sm text-gray-600 dark:text-[var(--text-secondary)]">Remember me</span>
              </label>
              <a href="#" className="text-sm text-gray-800 dark:text-[var(--accent-purple)] hover:underline">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full h-14 bg-gray-800 text-white text-base rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 group cursor-pointer"
            >
              Sign in
              {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-[var(--text-secondary)]">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="text-gray-800 dark:text-[var(--accent-purple)] hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Right side - Image */}
        <div className="relative hidden lg:block">
          <Image
            src="/images/auth-construction.jpg"
            alt="Construction site"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent flex items-end p-8">
            <div>
              <h2 className="text-white text-xl font-medium mb-2">Manage Your Projects</h2>
              <p className="text-white/80">
                Track construction schedules, monitor progress, and collaborate with your team in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignInLoading() {
  return (
    <div className="min-h-screen bg-[#e8e9f3] dark:bg-[var(--bg-primary)] flex items-center justify-center transition-colors">
      <div className="animate-pulse text-gray-500 dark:text-[var(--text-secondary)]">Loading...</div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInForm />
    </Suspense>
  );
}
