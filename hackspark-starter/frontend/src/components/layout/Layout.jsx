import React from 'react';
import { Header } from './Header.jsx';

export const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-rent-50 text-rent-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-5">
        {children}
      </main>
    </div>
  );
};

export default Layout;
