import React from 'react';
import Sidebar from './Sidebar';

export default function MainLayout({ children }: { children:React.ReactNode}) {
  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 overflow-hidden font-sans flex">
      {/* Sidebar - Fixed Left */}
      <Sidebar />

      {/* Main Content Area - Scrollable Right */}
      <main className="flex-1 min-w-0 pt-14 pb-16 lg:pt-0 lg:pb-0 px-4 sm:px-6 lg:px-0 py-6 lg:py-8 overflow-y-auto bg-gradient-to-tr from-[#09090b] via-[#0d111c] to-[#09090b]">
        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}