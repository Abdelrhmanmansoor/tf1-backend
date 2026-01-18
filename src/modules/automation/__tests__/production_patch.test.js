const mongoose = require('mongoose');

// MOCKS MUST BE AT THE TOP
jest.mock('../../../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

jest.mock('../models/AutomationProcessedEvent', () => ({
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
}));

jest.mock('../models/AutomationRule', () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../shared/models/User', () => {
    const mockQuery = {
        lean: jest.fn().mockResolvedValue({ companyName: 'Test' })
    };
    return {
        findById: jest.fn().mockReturnValue(mockQuery)
    };
});

jest.mock('../../club/models/Job', () => ({
    find: jest.fn(),
    save: jest.fn(),
}));

const automationEngine = require('../services/automationEngine');
const AutomationQueue = require('../services/automationQueue');
const automationIntegration = require('../../job-publisher/integrations/automationIntegration');

jest.setTimeout(15000);

describe('Automation System Production Patch', () => {
    beforeAll(async () => {
        // No connection needed
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('1. Recursion Guard', () => {
        it('should block execution if depth > 3', async () => {
            const result = await automationEngine.trigger('TEST_EVENT', {}, 'publisherId', {
                depth: 4
            });

            expect(result.error).toBe('Recursion limit');
            expect(result.executed).toBe(0);
        });
    });

    describe('2. Idempotency', () => {
        it('should generate unique eventId if missing', async () => {
            const spy = jest.spyOn(AutomationQueue, 'add');
            await automationIntegration.trigger('TEST', {}, new mongoose.Types.ObjectId());
            const callArgs = spy.mock.calls[0];
            expect(callArgs[3].eventId).toBeDefined();
        });
    });

    describe('3. Queue Service', () => {
        it('should run inline (setImmediate) if Redis is missing', async () => {
            AutomationQueue.queue = null;
            AutomationQueue.isRedisAvailable = false;
            const spyEngine = jest.spyOn(automationEngine, 'trigger').mockResolvedValue({});

            await new Promise(resolve => {
                AutomationQueue.add('TEST', {}, new mongoose.Types.ObjectId()).then(() => {
                    setTimeout(() => {
                        expect(spyEngine).toHaveBeenCalled();
                        resolve();
                    }, 50);
                });
            });
        });
    });

    describe('4. Automation Scheduler', () => {
        it('should correctly filter jobs closing within 24 hours', async () => {
            const Job = require('../../club/models/Job');
            const AutomationScheduler = require('../services/automationScheduler');

            const mockJob = {
                _id: new mongoose.Types.ObjectId(),
                title: 'Test Job',
                automationFlags: { deadlineTriggered: false },
                save: jest.fn().mockResolvedValue(true)
            };

            Job.find.mockResolvedValue([mockJob]);

            jest.spyOn(automationIntegration, 'onJobApproachingDeadline').mockResolvedValue(true);

            const result = await AutomationScheduler.checkUpcomingDeadlines();

            expect(result.count).toBe(1);
            expect(mockJob.automationFlags.deadlineTriggered).toBe(true);
            expect(mockJob.save).toHaveBeenCalled();
        });
    });

    describe('5. Integration Hooks', () => {
        const validPubId = new mongoose.Types.ObjectId();
        const validAppId = new mongoose.Types.ObjectId();
        const validJobId = new mongoose.Types.ObjectId();

        it('should trigger INTERVIEW_CANCELLED', async () => {
            const spyQueue = jest.spyOn(AutomationQueue, 'add').mockResolvedValue(true);

            await automationIntegration.onInterviewCancelled({
                _id: validAppId,
                publisherId: validPubId,
                jobId: { title: 'J' },
                applicantId: { firstName: 'A', lastName: 'B' }
            }, 'No longer available');

            expect(spyQueue).toHaveBeenCalledWith(
                'INTERVIEW_CANCELLED',
                expect.objectContaining({ cancellationReason: 'No longer available' }),
                validPubId,
                expect.any(Object)
            );
        });

        it('should trigger APPLICATION_UPDATED via afterApplicationUpdate', async () => {
            const logger = require('../../../utils/logger');
            const spyInteg = jest.spyOn(automationIntegration, 'trigger').mockResolvedValue(true);

            const mockApp = {
                _id: validAppId,
                status: 'new',
                publisherId: validPubId,
                jobId: { _id: validJobId, title: 'J' },
                applicantId: { _id: validAppId, firstName: 'A', lastName: 'B' },
                populate: jest.fn().mockResolvedValue(true)
            };

            await automationIntegration.afterApplicationUpdate(mockApp, 'new');

            // If it failed, logger.error would be called
            if (logger.error.mock.calls.length > 0) {
                console.log('Logger Error:', logger.error.mock.calls[0]);
            }

            expect(logger.error).not.toHaveBeenCalled();
            expect(spyInteg).toHaveBeenCalledWith(
                'APPLICATION_UPDATED',
                expect.any(Object),
                validPubId,
                expect.any(Object)
            );
        });
    });
});
