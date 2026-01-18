const Queue = require('bull');
const logger = require('../../../utils/logger');
const automationIntegration = require('../../job-publisher/integrations/automationIntegration');
const Job = require('../../club/models/Job');

class AutomationScheduler {
    constructor() {
        this.schedulerQueue = null;
        this.isRedisAvailable = false;
        this.initialize();
    }

    initialize() {
        if (process.env.REDIS_URL) {
            try {
                this.schedulerQueue = new Queue('automation-scheduler', process.env.REDIS_URL);
                this.isRedisAvailable = true;
                this.setupWorker();
                this.scheduleJobs();
                logger.info('✅ Automation Scheduler initialized');
            } catch (error) {
                logger.error('❌ Failed to initialize Automation Scheduler:', error);
            }
        } else {
            logger.warn('⚠️  Redis not available. Automation Scheduler (Cron) will not run.');
            // Note: We could use setInterval as a fallback, but for production, Redis is expected.
            this.setupIntervalFallback();
        }
    }

    setupWorker() {
        if (!this.schedulerQueue) return;

        this.schedulerQueue.process('check-deadlines', async (job) => {
            logger.info('⏲️  Running deadline check job...');
            return await this.checkUpcomingDeadlines();
        });
    }

    async scheduleJobs() {
        if (!this.schedulerQueue) return;

        // Run every hour
        await this.schedulerQueue.add('check-deadlines', {}, {
            repeat: { cron: '0 * * * *' }, // Every hour
            removeOnComplete: true
        });

        logger.info('📅 Scheduled: check-deadlines (Hourly)');
    }

    setupIntervalFallback() {
        // Fallback for dev environments without Redis
        logger.info('🕒 Setting up interval fallback for Automation Scheduler (every hour)');
        setInterval(async () => {
            try {
                logger.info('⏲️  Running deadline check (Interval Fallback)...');
                await this.checkUpcomingDeadlines();
            } catch (error) {
                logger.error('Error in deadline check fallback:', error);
            }
        }, 1000 * 60 * 60); // 1 hour

        // Run once on startup after a delay
        setTimeout(() => this.checkUpcomingDeadlines().catch(e => logger.error(e)), 5000);
    }

    /**
     * Core logic: Find jobs closing within 24 hours
     */
    async checkUpcomingDeadlines() {
        try {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));

            // Find jobs:
            // 1. Logic: Deadline is tomorrow (less than 24h away)
            // 2. Status is active
            // 3. deadlineTriggered is false
            const upcomingJobs = await Job.find({
                status: 'active',
                isDeleted: false,
                applicationDeadline: {
                    $gt: now,
                    $lt: tomorrow
                },
                'automationFlags.deadlineTriggered': { $ne: true }
            });

            if (upcomingJobs.length === 0) {
                logger.debug('No upcoming deadlines found.');
                return { count: 0 };
            }

            logger.info(`Found ${upcomingJobs.length} jobs with approaching deadlines.`);

            for (const job of upcomingJobs) {
                try {
                    await automationIntegration.onJobApproachingDeadline(job);

                    // Mark as triggered
                    job.automationFlags.deadlineTriggered = true;
                    await job.save();

                    logger.info(`🔔 Deadline trigger sent for job: ${job.title} (${job._id})`);
                } catch (triggerError) {
                    logger.error(`Error triggering deadline for job ${job._id}:`, triggerError);
                }
            }

            return { count: upcomingJobs.length };
        } catch (error) {
            logger.error('Error in checkUpcomingDeadlines:', error);
            throw error;
        }
    }
}

module.exports = new AutomationScheduler();
