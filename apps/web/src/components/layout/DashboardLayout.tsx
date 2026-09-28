import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export const DashboardLayout: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Header onOpenMenu={() => setIsDrawerOpen(true)} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-y-auto max-h-[calc(100vh-4rem)] pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <MobileNav isDrawerOpen={isDrawerOpen} setIsDrawerOpen={setIsDrawerOpen} />
    </div>
  );
};
