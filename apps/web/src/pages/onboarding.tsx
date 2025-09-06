import React from 'react';
import { useQuery } from '@tanstack/react-query';

export default function OnboardingPage() {
  const { data } = useQuery({
    queryKey: ['summary'],
    queryFn: () => fetch('/api/stats/summary').then((res) => res.json()),
  });

  return (
    <div>
      <h1>Onboarding</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
