import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

interface ParseResponse {
  uploadId: string;
  rowsParsed: number;
  warnings: { index: number; message: string }[];
}

export default function UploadsPage() {
  const [file, setFile] = useState<File | null>(null);
  const mutation = useMutation<ParseResponse, unknown, File>({
    mutationFn: async (file: File) => {
      const res = await fetch('/api/opal/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mime: file.type }),
      });
      const { uploadId, url } = await res.json();

      await fetch(url, {
        method: 'PUT',
        headers: { 'content-type': file.type },
        body: file,
      });

      const type = file.name.toLowerCase().endsWith('.html') ? 'html' : 'csv';
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
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button onClick={() => file && mutation.mutate(file)} disabled={!file || mutation.isLoading}>
        Upload
      </button>
      {mutation.data && (
        <div>
          <p>Rows parsed: {mutation.data.rowsParsed}</p>
          {mutation.data.warnings.length > 0 && (
            <div>
              <h2>Warnings</h2>
              <ul>
                {mutation.data.warnings.map((w) => (
                  <li key={w.index}>
                    {w.index}: {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
