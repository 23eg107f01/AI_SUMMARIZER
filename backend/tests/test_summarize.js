const fetch = require('node-fetch');

async function run() {
  try {
    const health = await fetch('http://localhost:3001/health').then((r) => r.json());
    console.log('Health:', health);

    const payload = {
      text: 'Artificial intelligence helps summarize documents quickly and accurately. This is a short test document for the summarizer.',
      length: 'Short',
      format: 'Paragraph',
      tone: 'Neutral',
    };

    const res = await fetch('http://localhost:3001/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await res.text();
    console.log('Summarize response (raw):');
    console.log(body);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

run();
