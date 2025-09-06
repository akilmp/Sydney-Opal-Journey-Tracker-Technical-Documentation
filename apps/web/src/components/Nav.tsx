import Link from 'next/link';
import React from 'react';

export default function Nav() {
  return (
    <nav>
      <ul>
        <li><Link href="/onboarding">Onboarding</Link></li>
        <li><Link href="/uploads">Uploads</Link></li>
        <li><Link href="/dashboard">Dashboard</Link></li>
        <li><Link href="/live">Live Departures</Link></li>
      </ul>
    </nav>
  );
}
