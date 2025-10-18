const apiBase = '/api'; // server routes: /api/fetch-transcript and /api/generate-summary

function showStatus(text) {
  const status = document.getElementById('status');
  if (!status) return;
  if (!text) {
    status.innerHTML = '';
    return;
  }
  status.innerHTML = `<span class="spinner" aria-hidden="true"></span><span class="status-text">${text}</span>`;
}

function setDisabledState(disabled) {
  const ids = ['fetchTranscript', 'generateSummary', 'saveSummary'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const fetchBtn = document.getElementById('fetchTranscript');
  const genBtn = document.getElementById('generateSummary');
  const saveBtn = document.getElementById('saveSummary');

  const videoInput = document.getElementById('youtubeLink');
  const transcriptOutput = document.getElementById('transcriptOutput');
  const summaryOutput = document.getElementById('summaryOutput');
  const quizOutput = document.getElementById('quizOutput');

  if (fetchBtn) {
    fetchBtn.addEventListener('click', async () => {
      const videoUrl = videoInput ? videoInput.value.trim() : '';
      if (!videoUrl) {
        alert('Please enter a YouTube URL or video ID');
        return;
      }

      try {
        showStatus('Fetching transcript...');
        setDisabledState(true);

        const res = await fetch(`${apiBase}/fetch-transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: videoUrl })
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const errMsg = data && data.error ? JSON.stringify(data) : res.statusText;
          throw new Error(errMsg);
        }

        transcriptOutput.innerText = data.transcript || '';
        summaryOutput.innerText = '';
        quizOutput.innerText = '';
      } catch (err) {
        console.error('Error fetching transcript:', err);
        alert('Error fetching transcript: ' + (err.message || err));
      } finally {
        showStatus('');
        setDisabledState(false);
      }
    });
  }

  if (genBtn) {
    genBtn.addEventListener('click', async () => {
      const transcript = transcriptOutput ? transcriptOutput.innerText.trim() : '';
      if (!transcript) {
        alert('No transcript available to summarize');
        return;
      }

      try {
        showStatus('Generating summary...');
        setDisabledState(true);

        const res = await fetch(`${apiBase}/generate-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript })
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const errMsg = data && data.error ? JSON.stringify(data) : res.statusText;
          throw new Error(errMsg);
        }

        summaryOutput.innerText = data.summary || '';
      } catch (err) {
        console.error('Error generating summary:', err);
        alert('Error generating summary: ' + (err.message || err));
      } finally {
        showStatus('');
        setDisabledState(false);
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const summary = summaryOutput ? summaryOutput.innerText.trim() : '';
      if (!summary) {
        alert('Nothing to save');
        return;
      }
      const summaries = JSON.parse(localStorage.getItem('summaries') || '[]');
      summaries.push({ summary, savedAt: new Date().toISOString() });
      localStorage.setItem('summaries', JSON.stringify(summaries));
      alert('Summary saved locally');
    });
  }
});