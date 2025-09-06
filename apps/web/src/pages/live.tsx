import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function LivePage() {
  const [stopId, setStopId] = useState('');
  const query = useQuery({
    queryKey: ['departures', stopId],
    queryFn: () => fetch(`/api/live/departures?stopId=${stopId}`).then((res) => res.json()),
    enabled: !!stopId,
  });

  return (
    <div>
      <h1>Live Departures</h1>
      <input value={stopId} onChange={(e) => setStopId(e.target.value)} placeholder="Stop ID" />
      <button onClick={() => query.refetch()} disabled={!stopId}>
        Load
      </button>
      {query.data && <pre>{JSON.stringify(query.data.departures, null, 2)}</pre>}
    </div>
  );
}
