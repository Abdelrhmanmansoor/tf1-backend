const mongoose = require('mongoose');
const automationEngine = require('../services/automationEngine');
const AutomationQueue = require('../services/automationQueue');
const AutomationProcessedEvent = require('../models/AutomationProcessedEvent');
const automationIntegration = require('../../job-publisher/integrations/automationIntegration');

// Mocks
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

jest.mock('../../club/models/Job', () => ({
    find: jest.fn(),
    save: jest.fn(),
}));

describe('Automation System Production Patch', () => {
    beforeAll(async () => {
        // Basic Mongoose mock if needed
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
            await automationIntegration.trigger('TEST', {}, 'pubId');
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
                AutomationQueue.add('TEST', {}, 'pub').then(() => {
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
                _id: 'job123',
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
        it('should trigger INTERVIEW_CANCELLED', async () => {
            const spyQueue = jest.spyOn(AutomationQueue, 'add').mockResolvedValue(true);

            await automationIntegration.onInterviewCancelled({
                _id: 'i1',
                publisherId: 'p1',
                jobId: { title: 'J' },
                applicantId: { firstName: 'A', lastName: 'B' }
            }, 'No longer available');

            expect(spyQueue).toHaveBeenCalledWith(
                'INTERVIEW_CANCELLED',
                expect.objectContaining({ cancellationReason: 'No longer available' }),
                'p1',
                expect.any(Object)
            );
        });

        it('should trigger APPLICATION_UPDATED via afterApplicationUpdate', async () => {
            const spyQueue = jest.spyOn(AutomationQueue, 'add').mockResolvedValue(true);

            const mockApp = {
                _id: 'a1',
                status: 'new',
                publisherId: 'p1',
                jobId: { title: 'J' },
                applicantId: { firstName: 'A', lastName: 'B' },
                populate: jest.fn().mockResolvedValue(true)
            };

            await automationIntegration.afterApplicationUpdate(mockApp, 'new');

            expect(spyQueue).toHaveBeenCalledWith(
                'APPLICATION_UPDATED',
                expect.any(Object),
                'p1',
                expect.any(Object)
            );
        });
    });
});
