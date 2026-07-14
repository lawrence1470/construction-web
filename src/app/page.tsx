'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSession } from '@/lib/auth-client';
import { motion } from 'framer-motion';

const Logo3D = dynamic(() => import('@/components/ui/Logo3D'), { ssr: false });
import { CaretDown, Play, MagnifyingGlass, Bell, House, ListChecks, Buildings, Gear, FolderOpen, CloudSun, CalendarBlank, MapPin, ClockCounterClockwise, CaretRight, Check, ChartBar, BookOpen, UsersThree } from '@phosphor-icons/react';

const interFont = 'var(--font-inter)';
const instrumentSerifFont = 'var(--font-instrument-serif)';

/* Design tokens */
const t = {
  bg: '#ffffff',
  fg: 'hsl(210 14% 17%)',
  mutedFg: 'hsl(184 5% 55%)',
  secondary: 'hsl(0 0% 96%)',
  secondaryFg: 'hsl(0 0% 9%)',
  accent: 'hsl(239 84% 67%)',
  border: 'hsl(0 0% 90%)',
  shadow: '0 25px 80px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.06)',
};

/* ══════════════════════════════════════════════════════════════
   BLOCK 1 — Nexora Hero (h-screen, no scroll)
   ══════════════════════════════════════════════════════════════ */

/* ── Dashboard Preview (fully coded) ──────────────────────── */

function DashboardPreview() {
  const sidebarItems = [
    { label: 'Dashboard', icon: House, active: true },
    { label: 'Timeline', icon: ChartBar, badge: '14' },
    { label: 'Tree', icon: FolderOpen },
    { label: 'Documents', icon: BookOpen, chevron: true },
    { label: 'Team', icon: UsersThree },
    { label: 'Settings', icon: Gear },
  ];

  const projectItems = [
    { label: 'Weather', icon: CloudSun },
    { label: 'Notifications', icon: Bell },
  ];

  const actions = ['New Task', 'Upload File', 'Invite Member', 'Save Snapshot'];

  const scheduleSummary = [
    { name: 'Tasks Due', amount: '14' },
    { name: 'In Progress', amount: '8' },
    { name: 'Completed', amount: '23' },
  ];

  const activity = [
    { date: 'Apr 14', desc: 'Foundation Pour', project: 'Phase 2', status: 'In Progress', statusColor: '#d97706' },
    { date: 'Apr 13', desc: 'Plans Uploaded', project: 'Phase 1', status: 'Complete', statusColor: '#16a34a' },
    { date: 'Apr 12', desc: 'Framing Inspection', project: 'Phase 2', status: 'Scheduled', statusColor: '#2563eb' },
    { date: 'Apr 11', desc: 'RFI Submitted', project: 'Phase 1', status: 'Complete', statusColor: '#16a34a' },
  ];

  const fs = { fontSize: 11, fontFamily: interFont };

  return (
    <div style={{ ...fs, userSelect: 'none', pointerEvents: 'none', display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 12, overflow: 'hidden', background: t.bg, border: `1px solid ${t.border}` }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: t.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>B</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: t.fg }}>TEMERITY</span>
          <CaretDown size={10} style={{ color: t.mutedFg }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.secondary, borderRadius: 6, padding: '4px 10px' }}>
          <MagnifyingGlass size={10} style={{ color: t.mutedFg }} />
          <span style={{ fontSize: 10, color: t.mutedFg }}>Search...</span>
          <span style={{ fontSize: 9, color: t.mutedFg, marginLeft: 12, background: t.bg, borderRadius: 3, padding: '1px 4px', border: `1px solid ${t.border}` }}>⌘K</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 500, color: t.fg, background: t.secondary, borderRadius: 6, padding: '4px 8px' }}>New Task</span>
          <Bell size={12} style={{ color: t.mutedFg }} weight="regular" />
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 8, fontWeight: 600, color: '#fff' }}>PM</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ width: 140, borderRight: `1px solid ${t.border}`, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sidebarItems.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', borderRadius: 6, fontSize: 10, color: item.active ? t.fg : t.mutedFg, fontWeight: item.active ? 500 : 400, background: item.active ? t.secondary : 'transparent' }}>
              <item.icon size={12} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && <span style={{ fontSize: 8, background: t.accent, color: '#fff', borderRadius: 4, padding: '1px 4px' }}>{item.badge}</span>}
              {item.chevron && <CaretRight size={8} style={{ color: t.mutedFg }} />}
            </div>
          ))}
          <div style={{ fontSize: 9, fontWeight: 500, color: t.mutedFg, padding: '10px 6px 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</div>
          {projectItems.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', borderRadius: 6, fontSize: 10, color: t.mutedFg }}>
              <item.icon size={12} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: 12, background: 'rgba(0,0,0,0.015)', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
          {/* Greeting */}
          <p style={{ fontSize: 12, fontWeight: 600, color: t.fg, margin: 0 }}>Welcome, Project Manager</p>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {actions.map((a, i) => (
              <span key={a} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 999, fontWeight: 500, ...(i === 0 ? { background: t.accent, color: '#fff' } : { background: t.bg, color: t.fg, border: `1px solid ${t.border}` }) }}>{a}</span>
            ))}
            <span style={{ fontSize: 10, color: t.mutedFg, marginLeft: 4 }}>Customize</span>
          </div>

          {/* Cards row */}
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Active projects card */}
            <div style={{ flex: '1 1 0', background: t.bg, borderRadius: 8, padding: 10, border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: t.mutedFg }}>Active Projects</span>
                <Check size={10} style={{ color: '#16a34a' }} />
              </div>
              <p style={{ fontSize: 20, fontWeight: 600, color: t.fg, margin: '0 0 4px' }}>
                12<span style={{ fontSize: 12, color: t.mutedFg, marginLeft: 4 }}>total</span>
              </p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 9 }}>
                <span style={{ color: '#16a34a' }}>3 On Track</span>
                <span style={{ color: '#d97706' }}>2 At Risk</span>
                <span style={{ color: '#dc2626' }}>1 Delayed</span>
              </div>
              {/* SVG chart */}
              <svg viewBox="0 0 280 60" style={{ width: '100%', height: 50 }}>
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t.accent} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,45 C30,40 50,35 80,28 C110,20 130,38 160,25 C190,12 210,18 240,8 C260,4 275,6 280,5 L280,60 L0,60 Z" fill="url(#chartFill)" />
                <path d="M0,45 C30,40 50,35 80,28 C110,20 130,38 160,25 C190,12 210,18 240,8 C260,4 275,6 280,5" fill="none" stroke={t.accent} strokeWidth="1.5" />
              </svg>
            </div>

            {/* Schedule summary card */}
            <div style={{ flex: '1 1 0', background: t.bg, borderRadius: 8, padding: 10, border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 500, color: t.fg }}>This Week</span>
                <CalendarBlank size={11} style={{ color: t.mutedFg }} />
              </div>
              {scheduleSummary.map((item) => (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 10 }}>
                  <span style={{ color: t.mutedFg }}>{item.name}</span>
                  <span style={{ fontWeight: 500, color: t.fg }}>{item.amount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div style={{ background: t.bg, borderRadius: 8, padding: 10, border: `1px solid ${t.border}` }}>
            <p style={{ fontSize: 10, fontWeight: 500, color: t.fg, margin: '0 0 6px' }}>Recent Activity</p>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 80px 80px', gap: '4px 8px', fontSize: 10 }}>
              <span style={{ color: t.mutedFg, fontWeight: 500 }}>Date</span>
              <span style={{ color: t.mutedFg, fontWeight: 500 }}>Activity</span>
              <span style={{ color: t.mutedFg, fontWeight: 500, textAlign: 'right' }}>Project</span>
              <span style={{ color: t.mutedFg, fontWeight: 500, textAlign: 'right' }}>Status</span>
              {activity.map((item) => (
                <div key={item.desc} style={{ display: 'contents' }}>
                  <span style={{ color: t.mutedFg }}>{item.date}</span>
                  <span style={{ color: t.fg }}>{item.desc}</span>
                  <span style={{ color: t.mutedFg, textAlign: 'right' }}>{item.project}</span>
                  <span style={{ color: item.statusColor, textAlign: 'right' }}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Nexora Section ───────────────────────────────────────── */

function NexoraSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: t.bg,
        overflow: 'hidden',
        fontFamily: interFont,
        position: 'relative',
      }}
    >
      {/* Background video */}
      <video
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4"
        autoPlay loop muted playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
      />

      {/* ── Navbar ── */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="3" height="18" rx="0.5" fill={t.fg} />
            <rect x="3" y="3" width="18" height="3" rx="0.5" fill={t.fg} />
            <rect x="18" y="3" width="3" height="10" rx="0.5" fill={t.fg} />
            <rect x="10" y="9" width="2.5" height="12" rx="0.5" fill={t.fg} />
          </svg>
          <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: t.fg }}>TEMERITY</span>
        </div>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 32 }}>
          <a href="#features" style={{ fontSize: 14, color: t.mutedFg, textDecoration: 'none', transition: 'color 0.2s' }}>Features</a>
        </div>
        <Link href={isLoggedIn ? '/api/resolve-redirect?redirect=true' : '/sign-in'} style={{ background: t.fg, color: '#fff', padding: '8px 20px', borderRadius: 999, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
          {isLoggedIn ? 'Dashboard' : 'Sign In'}
        </Link>
      </nav>

      {/* ── Hero Content ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1, minHeight: 0 }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, border: `1px solid ${t.border}`, background: t.bg, padding: '6px 16px', fontSize: 14, color: t.mutedFg, fontFamily: interFont }}>
            Built for General Contractors
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            fontFamily: instrumentSerifFont,
            fontSize: 'clamp(3rem, 6vw, 5rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            color: t.fg,
            maxWidth: 576,
            margin: '0 0 0',
            fontWeight: 400,
          }}
        >
          Build On Time,{' '}
          <span style={{ fontStyle: 'italic' }}>Every</span>{' '}
          Time
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 'clamp(16px, 1.3vw, 18px)',
            color: t.mutedFg,
            maxWidth: 650,
            lineHeight: 1.6,
            fontFamily: interFont,
            padding: '0 16px',
          }}
        >
          Schedule, document, and manage your construction projects from one platform — with Gantt charts, file management, and real-time team collaboration.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <Link href={isLoggedIn ? '/api/resolve-redirect?redirect=true' : '/sign-up'} style={{ background: t.fg, color: '#fff', padding: '14px 24px', borderRadius: 999, fontSize: 14, fontWeight: 500, textDecoration: 'none', fontFamily: interFont }}>
            Get Started
          </Link>
          <button
            type="button"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: t.bg,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Play size={16} weight="fill" style={{ color: t.fg }} />
          </button>
        </motion.div>

        {/* Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            marginTop: 32,
            width: '100%',
            maxWidth: 1024,
            padding: '0 16px',
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              padding: 12,
              height: '100%',
              background: 'rgba(255, 255, 255, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: t.shadow,
            }}
          >
            <DashboardPreview />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   BLOCK 2 — Stellar.ai
   ══════════════════════════════════════════════════════════════ */

const stellarTabs = [
  { id: 'schedule', label: 'Schedule', icon: ChartBar },
  { id: 'documents', label: 'Documents', icon: BookOpen },
  { id: 'team', label: 'Team', icon: UsersThree },
  { id: 'track', label: 'Track', icon: ListChecks },
] as const;

type StellarTabId = (typeof stellarTabs)[number]['id'];

function ScheduleOverlay() {
  return (
    <div className="animate-fade-in-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
      <div className="animate-slide-up-overlay" style={{ position: 'absolute', top: '50%', left: '50%', background: '#fff', borderRadius: 16, padding: 32, width: 380, maxWidth: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <p style={{ fontFamily: interFont, fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 4 }}>Gantt Chart Scheduling</p>
        <p style={{ fontFamily: interFont, fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Visualize your project timeline</p>
        <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ width: '25%', height: '100%', background: '#8b5cf6', borderRadius: 2 }} />
        </div>
        {['Define project phases', 'Add tasks & milestones', 'Set dependencies & durations', 'Save schedule version'].map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid #f3f4f6' : undefined }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, fontFamily: interFont, ...(i === 0 ? { background: '#8b5cf6', color: '#fff' } : { background: '#f3f4f6', color: '#9ca3af' }) }}>
              {i === 0 ? <Check size={12} /> : i + 1}
            </div>
            <span style={{ fontFamily: interFont, fontSize: 13, color: i === 0 ? '#111' : '#6b7280' }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentsOverlay() {
  return (
    <div className="animate-fade-in-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
      <div className="animate-slide-up-overlay" style={{ position: 'absolute', top: '50%', left: '50%', background: '#fff', borderRadius: 16, padding: 32, width: 380, maxWidth: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <p style={{ fontFamily: interFont, fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 4 }}>Document Management</p>
        <p style={{ fontFamily: interFont, fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Search and organize project files</p>
        <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ width: '67%', height: '100%', background: '#f59e0b', borderRadius: 2 }} />
        </div>
        {[
          { label: 'Files Uploaded', value: '247' },
          { label: 'Categories', value: '12' },
          { label: 'AI Search', value: 'Active' },
          { label: 'Storage Used', value: '4.2 GB' },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontFamily: interFont, fontSize: 13, color: '#6b7280' }}>{item.label}</span>
            <span style={{ fontFamily: interFont, fontSize: 13, fontWeight: 600, color: '#111' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamOverlay() {
  return (
    <div className="animate-fade-in-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
      <div className="animate-slide-up-overlay" style={{ position: 'absolute', top: '50%', left: '50%', background: '#fff', borderRadius: 16, padding: 32, width: 380, maxWidth: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UsersThree size={14} style={{ color: '#16a34a' }} />
          </div>
          <div>
            <p style={{ fontFamily: interFont, fontSize: 14, fontWeight: 600, color: '#111', margin: 0 }}>Team Collaboration</p>
            <p style={{ fontFamily: interFont, fontSize: 12, color: '#16a34a', margin: 0 }}>Everyone in sync</p>
          </div>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: interFont, fontSize: 24, fontWeight: 700, color: '#111' }}>18 Members</span>
            <span style={{ fontFamily: interFont, fontSize: 12, fontWeight: 500, color: '#16a34a', background: '#dcfce7', borderRadius: 999, padding: '2px 10px', display: 'flex', alignItems: 'center' }}>5 Roles</span>
          </div>
          <div style={{ height: 4, background: '#dcfce7', borderRadius: 2 }}>
            <div style={{ width: '100%', height: '100%', background: '#16a34a', borderRadius: 2 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'Owners', count: 2, color: '#16a34a' },
            { label: 'PMs', count: 5, color: '#2563eb' },
            { label: 'Members', count: 11, color: '#7c3aed' },
          ].map((tt) => (
            <div key={tt.label} style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: '#f9fafb', borderRadius: 8 }}>
              <p style={{ fontFamily: interFont, fontSize: 16, fontWeight: 700, color: tt.color, margin: 0 }}>{tt.count}</p>
              <p style={{ fontFamily: interFont, fontSize: 11, color: '#6b7280', margin: 0 }}>{tt.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrackOverlay() {
  return (
    <div className="animate-fade-in-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
      <div className="animate-slide-up-overlay" style={{ position: 'absolute', top: '50%', left: '50%', background: '#fff', borderRadius: 16, padding: 32, width: 380, maxWidth: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <p style={{ fontFamily: interFont, fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 4 }}>Project Tracking</p>
        <p style={{ fontFamily: interFont, fontSize: 12, color: '#6b7280', marginBottom: 20 }}>Real-time project visibility</p>
        {['Weather data synced for job site', 'Schedule snapshot saved', 'Team notifications active', 'CSI codes classified'].map((item, i) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid #f3f4f6' : undefined }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={11} style={{ color: '#16a34a' }} />
            </div>
            <span style={{ fontFamily: interFont, fontSize: 13, color: '#111' }}>{item}</span>
          </div>
        ))}
        <button type="button" style={{ width: '100%', marginTop: 20, padding: '10px 0', background: '#111', color: '#fff', border: 'none', borderRadius: 999, fontFamily: interFont, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          View Dashboard
        </button>
      </div>
    </div>
  );
}

function StellarSection() {
  const [activeTab, setActiveTab] = useState<StellarTabId>('schedule');

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => {
        const idx = stellarTabs.findIndex((tt) => tt.id === prev);
        return stellarTabs[(idx + 1) % stellarTabs.length]!.id;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="features" style={{ background: '#fff', fontFamily: interFont }}>
      {/* Hero */}
      <div style={{ padding: '96px 24px 128px', maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>
        {/* Heading */}
        <h1 className="animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.3s', fontSize: 'clamp(3rem, 6vw, 80px)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 20, color: '#000' }}>
          Plan. Build. Deliver.
          <br />
          <span style={{ background: 'linear-gradient(to right, #000, #6b7280, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            All in One Platform.
          </span>
        </h1>

        {/* Subheading */}
        <p className="animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.4s', fontSize: 'clamp(16px, 1.5vw, 20px)', color: '#4b5563', maxWidth: 672, margin: '0 auto 32px', lineHeight: 1.6 }}>
          From Gantt chart scheduling to document management and team collaboration — everything your crew needs to keep projects on track.
        </p>

        {/* CTA */}
        <div className="animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.5s', marginBottom: 48 }}>
          <Link href="/sign-up" style={{ display: 'inline-block', background: '#000', color: '#fff', padding: '12px 32px', borderRadius: 999, fontSize: 16, fontWeight: 500, textDecoration: 'none' }}>Get Started</Link>
        </div>

        {/* Tab bar */}
        <div className="animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.6s', display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: 4 }}>
            {stellarTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: interFont, transition: 'all 0.2s', ...(isActive ? { background: '#fff', color: '#000', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { background: 'transparent', color: '#4b5563' }) }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Video + overlay */}
        <div className="animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.7s', position: 'relative', borderRadius: 24, overflow: 'hidden', height: 'clamp(400px, 50vw, 500px)' }}>
          <video
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085844_21a8f4b3-dea5-4ede-be16-d53f6973bb14.mp4"
            autoPlay loop muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {activeTab === 'schedule' && <ScheduleOverlay />}
          {activeTab === 'documents' && <DocumentsOverlay />}
          {activeTab === 'team' && <TeamOverlay />}
          {activeTab === 'track' && <TrackOverlay />}
        </div>

        {/* Tagline */}
        <div className="animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.8s', marginTop: 96, textAlign: 'center' }}>
          <span style={{ fontFamily: interFont, fontSize: 14, fontWeight: 500, color: '#9ca3af' }}>
            Trusted by general contractors and project managers.
          </span>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   BLOCK 3 — 3D Logo
   ══════════════════════════════════════════════════════════════ */

function Logo3DSection() {
  return (
    <section
      style={{
        background: '#fff',
        fontFamily: interFont,
        padding: '96px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 480, height: 360 }}>
        <Logo3D />
      </div>
      <p
        style={{
          fontFamily: instrumentSerifFont,
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          fontWeight: 400,
          color: t.fg,
          margin: '24px 0 8px',
          letterSpacing: '-0.02em',
        }}
      >
        TEMERITY
      </p>
      <p style={{ fontSize: 14, color: t.mutedFg, margin: 0 }}>
        Built for builders.
      </p>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════════════════════════ */

function Footer() {
  const socialLinks = [
    { label: 'X', href: '#', icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
    { label: 'LinkedIn', href: '#', icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg> },
  ];

  const mainLinks = [
    { href: '#features', label: 'Features' },
    { href: '/sign-in', label: 'Sign In' },
    { href: '/sign-up', label: 'Sign Up' },
  ];

  const legalLinks = [
    { href: '#', label: 'Privacy Policy' },
    { href: '#', label: 'Terms of Service' },
  ];

  return (
    <footer style={{ fontFamily: interFont, paddingTop: 64, paddingBottom: 24, background: '#fff' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
        {/* Top: Logo + Social */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="3" height="18" rx="0.5" fill="#111" />
              <rect x="3" y="3" width="18" height="3" rx="0.5" fill="#111" />
              <rect x="18" y="3" width="3" height="10" rx="0.5" fill="#111" />
              <rect x="10" y="9" width="2.5" height="12" rx="0.5" fill="#111" />
            </svg>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>TEMERITY</span>
          </a>
          <div style={{ display: 'flex', gap: 8 }}>
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                aria-label={link.label}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#374151',
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Divider + Links */}
        <div style={{ borderTop: '1px solid #e6e6e6', marginTop: 24, paddingTop: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
            {/* Copyright */}
            <div style={{ fontSize: 14, lineHeight: 1.6, color: '#858e8e', whiteSpace: 'nowrap' }}>
              <div>&copy; {new Date().getFullYear()} TEMERITY</div>
              <div>All rights reserved</div>
            </div>

            {/* Right links */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
              {/* Main links */}
              <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                {mainLinks.map((link) => (
                  <a key={link.label} href={link.href} style={{ fontSize: 14, color: '#111', textDecoration: 'none' }}>
                    {link.label}
                  </a>
                ))}
              </nav>
              {/* Legal links */}
              <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                {legalLinks.map((link) => (
                  <a key={link.label} href={link.href} style={{ fontSize: 14, color: '#858e8e', textDecoration: 'none' }}>
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE EXPORT
   ══════════════════════════════════════════════════════════════ */

export default function Home() {
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  return (
    <div>
      {/* Block 1: Nexora */}
      <NexoraSection isLoggedIn={isLoggedIn} />

      {/* Block 2: Stellar.ai */}
      <StellarSection />

      {/* Block 3: 3D Logo */}
      <Logo3DSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
