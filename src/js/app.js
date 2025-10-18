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
  // element-safe attachments using IDs from index.html
  const fetchBtn = document.getElementById('fetchTranscript');
  const genBtn = document.getElementById('generateSummary');
  const saveBtn = document.getElementById('saveSummary');

  const videoInput = document.getElementById('youtubeLink');
  const transcriptOutput = document.getElementById('transcriptOutput');
  const summaryOutput = document.getElementById('summaryOutput');

  if (fetchBtn) {
    fetchBtn.addEventListener('click', async () => {
      const videoUrl = videoInput ? videoInput.value : '';
      if (!videoUrl) {
        alert('Please enter a YouTube URL');
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

        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || 'Failed to fetch transcript');
        }

        const data = await res.json();
        // adapt depending on server response shape
        transcriptOutput.innerText = data.transcript || (data.items ? JSON.stringify(data.items, null, 2) : '');
      } catch (err) {
        console.error(err);
        alert('Error fetching transcript: ' + (err.message || err));
      } finally {
        showStatus(''); // hide
        setDisabledState(false);
      }
    });
  }

  if (genBtn) {
    genBtn.addEventListener('click', async () => {
      const transcript = transcriptOutput ? transcriptOutput.innerText : '';
      if (!transcript) {
        alert('No transcript to summarize');
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

        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || 'Failed to generate summary');
        }

        const data = await res.json();
        summaryOutput.innerText = data.summary || '';
      } catch (err) {
        console.error(err);
        alert('Error generating summary: ' + (err.message || err));
      } finally {
        showStatus(''); // hide
        setDisabledState(false);
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const summary = summaryOutput ? summaryOutput.innerText : '';
      if (!summary) {
        alert('Nothing to save');
        return;
      }
      const summaries = JSON.parse(localStorage.getItem('summaries')) || [];
      summaries.push({ summary, savedAt: new Date().toISOString() });
      localStorage.setItem('summaries', JSON.stringify(summaries));
      alert('Summary saved successfully!');
    });
  }

  // optional: keep any existing submitBtn behavior
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    // guard in case handleSubmit is not defined
    if (typeof handleSubmit === 'function') {
      submitBtn.addEventListener('click', handleSubmit);
    }
  }
});