// client-side helper — calls your server route which in turn calls OpenRouter (keeps API key on server)
async function generateSummaryClient(transcript) {
  const res = await fetch('/api/generate-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error('Summary request failed: ' + errText);
  }
  const data = await res.json();
  return data.summary;
}

window.generateSummaryClient = generateSummaryClient;