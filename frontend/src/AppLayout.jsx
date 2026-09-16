import React from "react";
import { Outlet } from "react-router";
import Nav from "./shared/Components/Nav.jsx";

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-950 font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Navigation managed at the layout level */}
      <Nav />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default AppLayout;
