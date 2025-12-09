'use client';

import React, { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileHeader from './MobileHeader';
import MobileDrawer from './MobileDrawer';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className="h-screen bg-[var(--bg-primary)] overflow-hidden transition-colors duration-300">
      {/* Desktop Layout */}
      <div className="hidden md:flex h-screen">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <Header />
          <main className="flex-1 p-6 overflow-x-hidden overflow-y-auto">{children}</main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex flex-col md:hidden h-screen">
        <MobileHeader onMenuOpen={openDrawer} />
        <main className="flex-1 p-4 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={drawerOpen} onClose={closeDrawer} />
    </div>
  );
}
