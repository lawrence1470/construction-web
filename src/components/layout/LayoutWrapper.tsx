'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <div className="min-h-screen bg-[#e8e9f3] flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
