"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User } from "lucide-react";
import { signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
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
      const result = await signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Sign up failed");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
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
            <h1 className="text-2xl font-medium text-gray-800 dark:text-[var(--text-primary)] mb-3">Create account</h1>
            <p className="text-gray-500 dark:text-[var(--text-secondary)]">Get started with your project management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm text-gray-700 dark:text-[var(--text-secondary)] mb-2">
                Full name
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <User className="w-5 h-5 text-gray-400 dark:text-[var(--text-muted)]" />
                </div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-4 bg-[#f5f5f9] dark:bg-[var(--bg-input)] text-gray-900 dark:text-[var(--text-primary)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-[var(--accent-purple)] transition-all placeholder:text-gray-500 dark:placeholder:text-[var(--text-muted)]"
                  required
                />
              </div>
            </div>

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
                  placeholder="Min 8 characters"
                  className="w-full pl-12 pr-12 py-4 bg-[#f5f5f9] dark:bg-[var(--bg-input)] text-gray-900 dark:text-[var(--text-primary)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-[var(--accent-purple)] transition-all placeholder:text-gray-500 dark:placeholder:text-[var(--text-muted)]"
                  required
                  minLength={8}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 dark:bg-[var(--accent-purple)] text-white py-4 rounded-full hover:bg-gray-700 dark:hover:bg-[var(--accent-purple)]/90 transition-colors flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Creating account..." : "Create account"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-[var(--text-secondary)]">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-gray-800 dark:text-[var(--accent-purple)] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Right side - Image */}
        <div className="relative hidden lg:block">
          <Image
            src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=1000&fit=crop"
            alt="Construction site"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent flex items-end p-8">
            <div>
              <h2 className="text-white text-xl font-medium mb-2">Start Building Today</h2>
              <p className="text-white/80">
                Join thousands of construction professionals managing their projects with BuildTrack Pro.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
