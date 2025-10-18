const apiBase = '/api'; // server routes: /api/fetch-transcript and /api/generate-summary

document.addEventListener('DOMContentLoaded', () => {
  // element-safe attachments
  const fetchBtn = document.getElementById('fetch-transcript');
  const genBtn = document.getElementById('generate-summary');
  const saveBtn = document.getElementById('save-summary');

  if (fetchBtn) {
    fetchBtn.addEventListener('click', async () => {
      const videoUrl = document.getElementById('video-url').value;
      const res = await fetch(`${apiBase}/fetch-transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: videoUrl })
      });
      const data = await res.json();
      document.getElementById('transcript').value = data.transcript || '';
    });
  }

  if (genBtn) {
    genBtn.addEventListener('click', async () => {
      const transcript = document.getElementById('transcript').value;
      const res = await fetch(`${apiBase}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });
      const data = await res.json();
      document.getElementById('summary').value = data.summary || '';
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const summary = document.getElementById('summary').value;
      const summaries = JSON.parse(localStorage.getItem('summaries')) || [];
      summaries.push(summary);
      localStorage.setItem('summaries', JSON.stringify(summaries));
      alert('Summary saved successfully!');
    });
  }

  // existing submitBtn handler (if used)
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleSubmit);
  }
});