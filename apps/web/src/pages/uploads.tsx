import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

export default function UploadsPage() {
  const [content, setContent] = useState('');
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/opal/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      return res.json();
    },
  });

  return (
    <div>
      <h1>Uploads</h1>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <button onClick={() => mutation.mutate()}>Upload</button>
      {mutation.data && <pre>{JSON.stringify(mutation.data, null, 2)}</pre>}
    </div>
  );
}
