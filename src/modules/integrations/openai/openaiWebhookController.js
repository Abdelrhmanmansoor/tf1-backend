const crypto = require('crypto');
const WebhookEvent = require('../models/WebhookEvent');

function extractSignature(req) {
  return (
    req.headers['openai-signature'] ||
    req.headers['x-openai-signature'] ||
    req.headers['svix-signature'] ||
    req.headers['webhook-signature'] ||
    ''
  );
}

function verifySignature(secret, body, signatureHeader) {
  if (!secret) return false;
  const data = typeof body === 'string' ? body : JSON.stringify(body || {});
  const hmacHex = crypto.createHmac('sha256', secret).update(data).digest('hex');
  const hmacB64 = crypto.createHmac('sha256', secret).update(data).digest('base64');
  if (signatureHeader.includes(hmacHex)) return true;
  if (signatureHeader.includes(hmacB64)) return true;
  const parts = signatureHeader.split(',');
  for (const p of parts) {
    const s = p.split('=')[1];
    if (s && (s === hmacHex || s === hmacB64)) return true;
  }
  return false;
}

exports.handle = async (req, res) => {
  try {
    const secret = process.env.OPENAI_WEBHOOK_SECRET || '';
    if (secret) {
      const sig =
        req.headers['openai-signature'] ||
        req.headers['x-openai-signature'] ||
        req.headers['svix-signature'] ||
        '';
      const ok = verifySignature(secret, req.body || {}, sig);
      if (!ok) {
        return res.status(401).json({ success: false });
      }
    }
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};
