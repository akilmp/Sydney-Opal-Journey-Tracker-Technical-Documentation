import React from 'react';
import { useQuery } from '@tanstack/react-query';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['summary'],
    queryFn: () => fetch('/api/stats/summary').then((res) => res.json()),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {data && (
        <div>
          <p>Trips: {data.trips}</p>
          <p>Distance: {data.distance}</p>
          <p>Fare: {data.fare}</p>
        </div>
      )}
    </div>
  );
}
