import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

export default function UploadsPage() {
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');

      // Request a pre-signed URL for the upload
      const uploadRes = await fetch('/api/opal/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mime: file.type }),
      });
      const { uploadId, url } = await uploadRes.json();

      // Upload the file to storage
      await fetch(url, {
        method: 'PUT',
        headers: { 'content-type': file.type },
        body: file,
      });

      // Determine parser type from filename
      const type = file.name.toLowerCase().endsWith('.html') ? 'html' : 'csv';

      // Trigger parsing
      const parseRes = await fetch(`/api/opal/parse/${uploadId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      return parseRes.json();
    },
  });

  return (
    <div>
      <h1>Uploads</h1>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={() => mutation.mutate()} disabled={!file}>
        Upload
      </button>
      {mutation.data && (
        <div>
          <p>Rows parsed: {mutation.data.rowsParsed}</p>
          {mutation.data.warnings?.length > 0 && (
            <ul>
              {mutation.data.warnings.map((w: any, i: number) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
