const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://api.audo.ai/v1';

const authHeader = () => ({ 'x-api-key': process.env.AUDO_AI_API_KEY });

const uploadFile = async (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);
  const form = new FormData();
  form.append('file', blob, path.basename(filePath));

  const { data } = await axios.post(`${BASE_URL}/upload`, form, {
    headers: authHeader(),
  });

  return data.fileId;
};

const submitJob = async (fileId) => {
  const { data } = await axios.post(
    `${BASE_URL}/remove-noise`,
    { input: fileId },
    { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
  );

  return data.jobId;
};

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 60;

const pollUntilDone = async (jobId, onProgress) => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const { data } = await axios.get(
      `${BASE_URL}/remove-noise/${jobId}/status`,
      { headers: authHeader() }
    );

    if (onProgress) onProgress(attempt);

    if (data.state === 'succeeded') return data.downloadPath;
    if (data.state === 'failed') throw new Error(`Audo.ai job failed: ${data.reason || 'error desconocido'}`);
  }

  throw new Error(`Audo.ai job timed out after ${(MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s`);
};

const downloadResult = async (downloadPath, destPath) => {
  const response = await axios.get(`${BASE_URL}/${downloadPath}`, {
    headers: authHeader(),
    responseType: 'stream',
  });

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

module.exports = { uploadFile, submitJob, pollUntilDone, downloadResult };
