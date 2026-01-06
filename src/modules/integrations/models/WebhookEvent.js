const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema(
  {
    source: { type: String, required: true },
    type: { type: String, required: true },
    payload: { type: Object, required: true },
    signature: { type: String },
    idempotencyKey: { type: String },
    status: { type: String, default: 'received' },
    receivedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    collection: 'webhook_events'
  }
);

webhookEventSchema.index({ source: 1, type: 1, receivedAt: -1 });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
