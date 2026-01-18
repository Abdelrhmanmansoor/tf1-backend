const mongoose = require('mongoose');

const automationProcessedEventSchema = new mongoose.Schema(
    {
        eventId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        publisherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        event: {
            type: String,
            required: true,
        },
        entityId: {
            type: mongoose.Schema.Types.Mixed,
            index: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 60 * 60 * 24 * 7, // Auto-delete in 7 days
        },
    },
    {
        timestamps: false,
        versionKey: false,
    }
);

automationProcessedEventSchema.index({ publisherId: 1, event: 1, entityId: 1 });

module.exports = mongoose.model('AutomationProcessedEvent', automationProcessedEventSchema);
