const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const router = express.Router();

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function wordCount(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

router.post('/api/extract-url', async (req, res) => {
  const { url } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: 'A URL is required.' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error('Request failed.');
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, style, nav, footer, aside, header, noscript, form, iframe, svg, canvas').remove();
    $('[class*="ad"], [id*="ad"], [class*="promo"], [id*="promo"]').remove();

    const primaryContainer = $('article').first().length ? $('article').first() : $('main').first().length ? $('main').first() : $('body');
    const extractedText = normalizeText(primaryContainer.text() || $('body').text() || '');

    if (!extractedText) {
      throw new Error('Empty content');
    }

    return res.json({ text: extractedText, wordCount: wordCount(extractedText) });
  } catch (error) {
    return res.status(400).json({ error: 'Could not extract text from this URL. Try pasting the text manually.' });
  }
});

module.exports = router;