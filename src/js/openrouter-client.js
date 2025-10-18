// client-side helper that calls your server route /api/generate-summary
async function generateSummaryClient(transcript) {
  const res = await fetch('/api/generate-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript })
  });
  if (!res.ok) throw new Error('Summary request failed');
  const data = await res.json();
  return data.summary;
}
window.generateSummaryClient = generateSummaryClient;