"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, HardHat, Calendar, Users } from "lucide-react";
import { useSession } from "@/lib/auth-client";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-[#e8e9f3] dark:bg-[var(--bg-primary)] transition-colors">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white rounded-full"></div>
            </div>
            <span className="text-gray-800 dark:text-[var(--text-primary)] text-lg font-medium">BuildTrack Pro</span>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <Link
                href="/dashboard"
                className="bg-gray-800 dark:bg-[var(--accent-purple)] text-white px-6 py-2.5 rounded-full hover:bg-gray-700 dark:hover:bg-[var(--accent-purple)]/90 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-gray-600 dark:text-[var(--text-secondary)] hover:text-gray-800 dark:hover:text-[var(--text-primary)] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="bg-gray-800 dark:bg-[var(--accent-purple)] text-white px-6 py-2.5 rounded-full hover:bg-gray-700 dark:hover:bg-[var(--accent-purple)]/90 transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-white dark:bg-[var(--bg-card)] px-4 py-2 rounded-full shadow-sm dark:shadow-black/20">
              <HardHat className="w-4 h-4 text-gray-600 dark:text-[var(--text-secondary)]" />
              <span className="text-sm text-gray-600 dark:text-[var(--text-secondary)]">Built for construction teams</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-medium text-gray-800 dark:text-[var(--text-primary)] leading-tight">
              Manage projects with{" "}
              <span className="text-gray-500 dark:text-[var(--text-secondary)]">confidence</span>
            </h1>

            <p className="text-xl text-gray-500 dark:text-[var(--text-secondary)] max-w-lg">
              Track schedules, coordinate teams, and deliver projects on time.
              The modern way to manage construction.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/sign-up"
                className="bg-gray-800 dark:bg-[var(--accent-purple)] text-white px-8 py-4 rounded-full hover:bg-gray-700 dark:hover:bg-[var(--accent-purple)]/90 transition-colors flex items-center justify-center gap-2 group"
              >
                Start free trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/sign-in"
                className="bg-white dark:bg-[var(--bg-card)] text-gray-800 dark:text-[var(--text-primary)] px-8 py-4 rounded-full hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center border border-gray-200 dark:border-[var(--border-color)]"
              >
                View demo
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-12 pt-8">
              <div>
                <div className="text-3xl font-medium text-gray-800 dark:text-[var(--text-primary)]">500+</div>
                <div className="text-gray-500 dark:text-[var(--text-secondary)]">Projects managed</div>
              </div>
              <div>
                <div className="text-3xl font-medium text-gray-800 dark:text-[var(--text-primary)]">98%</div>
                <div className="text-gray-500 dark:text-[var(--text-secondary)]">On-time delivery</div>
              </div>
              <div>
                <div className="text-3xl font-medium text-gray-800 dark:text-[var(--text-primary)]">24/7</div>
                <div className="text-gray-500 dark:text-[var(--text-secondary)]">Team support</div>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative">
            <div className="relative h-[500px] lg:h-[600px] rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=1000&fit=crop"
                alt="Construction site aerial view"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent" />
            </div>

            {/* Floating Cards */}
            <div className="absolute -left-8 top-1/4 bg-white dark:bg-[var(--bg-card)] p-4 rounded-2xl shadow-xl dark:shadow-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-[var(--text-primary)]">Timeline</div>
                  <div className="text-xs text-gray-500 dark:text-[var(--text-secondary)]">On schedule</div>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 bottom-1/4 bg-white dark:bg-[var(--bg-card)] p-4 rounded-2xl shadow-xl dark:shadow-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-[var(--text-primary)]">12 Active</div>
                  <div className="text-xs text-gray-500 dark:text-[var(--text-secondary)]">Team members</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
