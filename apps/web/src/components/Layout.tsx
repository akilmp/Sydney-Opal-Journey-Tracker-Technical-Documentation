import React from 'react';
import Nav from './Nav';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Nav />
      <main>{children}</main>
    </div>
  );
}
