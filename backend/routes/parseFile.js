const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, cb) {
    const fileName = (file.originalname || '').toLowerCase();
    const allowedExtensions = fileName.endsWith('.pdf') || fileName.endsWith('.docx');
    const allowedMimeTypes = file.mimetype === 'application/pdf' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (allowedExtensions || allowedMimeTypes) {
      return cb(null, true);
    }

    return cb(new Error('Only PDF and DOCX files are supported.'));
  },
});

function wordCount(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

router.post('/api/parse-file', (req, res) => {
  upload.single('file')(req, res, async (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File must be 5MB or smaller.' });
      }

      return res.status(400).json({ error: error.message || 'Unable to process this file.' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Please upload a PDF or DOCX file.' });
    }

    const fileName = (file.originalname || '').toLowerCase();

    try {
      if (fileName.endsWith('.pdf')) {
        const result = await pdfParse(file.buffer);
        const text = (result.text || '').trim();

        if (text.length < 50) {
          return res.status(400).json({ error: 'This PDF appears to be image-based. Please paste the text manually.' });
        }

        return res.json({ text, wordCount: wordCount(text) });
      }

      if (fileName.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        const text = (result.value || '').trim();
        return res.json({ text, wordCount: wordCount(text) });
      }

      return res.status(400).json({ error: 'Only PDF and DOCX files are supported.' });
    } catch (fileError) {
      return res.status(400).json({ error: 'Unable to read this file.' });
    }
  });
});

module.exports = router;