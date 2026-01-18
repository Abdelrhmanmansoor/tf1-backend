const Queue = require('bull');
const logger = require('../../../utils/logger');
const automationEngine = require('./automationEngine');

class AutomationQueue {
    constructor() {
        this.queue = null;
        this.isRedisAvailable = false;
        this.initialize();
    }

    initialize() {
        try {
            if (process.env.REDIS_URL) {
                this.queue = new Queue('automation-queue', process.env.REDIS_URL, {
                    defaultJobOptions: {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000, // 2s, 4s, 8s
                        },
                        removeOnComplete: true,
                        removeOnFail: 100, // Keep last 100 failed jobs
                    },
                });

                this.setupWorker();
                this.isRedisAvailable = true;
                logger.info('✅ Automation Queue initialized with Redis');
            } else {
                logger.warn('⚠️  Redis not configured. Automation will run in-memory (fallback).');
            }
        } catch (error) {
            logger.error('❌ Failed to initialize Automation Queue:', error);
            this.isRedisAvailable = false;
        }
    }

    setupWorker() {
        if (!this.queue) return;

        this.queue.process(async (job) => {
            const { event, data, publisherId, meta } = job.data;

            try {
                logger.info(`🔄 Processing job ${job.id}: ${event}`);

                // Use direct trigger - engine handles recursion check
                const result = await automationEngine.trigger(event, data, publisherId, meta);

                return result;
            } catch (error) {
                logger.error(`❌ Job ${job.id} failed:`, error);
                throw error;
            }
        });

        this.queue.on('failed', (job, err) => {
            logger.error(`❌ Job ${job.id} failed after attempts:`, err);
        });
    }

    /**
     * Add event to queue
     */
    async add(event, data, publisherId, meta = {}) {
        // Generate eventId if not provided (for tracking)
        if (!meta.eventId) {
            meta.eventId = require('crypto').randomUUID();
        }

        if (this.isRedisAvailable && this.queue) {
            try {
                const job = await this.queue.add({
                    event,
                    data,
                    publisherId,
                    meta
                });
                logger.info(`📥 Event ${event} queued (Job: ${job.id})`);
                return true;
            } catch (error) {
                logger.error('❌ Failed to add to queue, falling back to instant execution:', error);
                // Fallback to in-memory if add fails
            }
        }

        // Fallback: Fire and forget (setImmediate)
        setImmediate(async () => {
            try {
                await automationEngine.trigger(event, data, publisherId, meta);
            } catch (error) {
                logger.error(`❌ In-memory automation failed for ${event}:`, error);
            }
        });

        return true;
    }
}

module.exports = new AutomationQueue();
