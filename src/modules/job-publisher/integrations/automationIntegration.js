/**
 * Integration layer between Job Publisher module and Automation System
 * This file contains hooks and helpers to trigger automation when application status changes
 */

const automationEngine = require('../../automation/services/automationEngine');
const MessageThread = require('../../messaging/models/MessageThread');
const logger = require('../../../utils/logger');

/**
 * Hook: Application status changed
 * Trigger automation when application moves to different stages
 */
async function onApplicationStatusChanged(application, oldStatus, newStatus) {
  try {
    logger.info(`Application ${application._id} status changed from ${oldStatus} to ${newStatus}`);

    // Prepare automation data
    const automationData = await prepareApplicationData(application);
    automationData.oldStatus = oldStatus;
    automationData.newStatus = newStatus;

    // Trigger automation
    await automationEngine.trigger(
      'APPLICATION_STAGE_CHANGED',
      automationData,
      application.publisherId || application.jobId.publishedBy
    );

    // If moving to interview stage, auto-open messaging
    if (newStatus === 'interview') {
      await autoOpenMessagingThread(application);
    }

    logger.info(`Automation triggered for application ${application._id}`);
  } catch (error) {
    logger.error('Error in onApplicationStatusChanged hook:', error);
    // Don't throw error - automation failure shouldn't block application update
  }
}

/**
 * Hook: Application submitted
 * Trigger automation when new application is submitted
 */
async function onApplicationSubmitted(application) {
  try {
    logger.info(`New application ${application._id} submitted`);

    const automationData = await prepareApplicationData(application);

    // Trigger automation
    await automationEngine.trigger(
      'APPLICATION_SUBMITTED',
      automationData,
      application.publisherId || application.jobId.publishedBy
    );

    logger.info(`Automation triggered for new application ${application._id}`);
  } catch (error) {
    logger.error('Error in onApplicationSubmitted hook:', error);
  }
}

/**
 * Hook: Interview scheduled
 * Trigger automation when interview is scheduled
 */
async function onInterviewScheduled(interview) {
  try {
    logger.info(`Interview ${interview._id} scheduled`);

    const automationData = await prepareInterviewData(interview);

    // Trigger automation
    await automationEngine.trigger(
      'INTERVIEW_SCHEDULED',
      automationData,
      interview.publisherId
    );

    logger.info(`Automation triggered for interview ${interview._id}`);
  } catch (error) {
    logger.error('Error in onInterviewScheduled hook:', error);
  }
}

/**
 * Hook: Interview completed
 * Trigger automation when interview is completed
 */
async function onInterviewCompleted(interview) {
  try {
    logger.info(`Interview ${interview._id} completed`);

    const automationData = await prepareInterviewData(interview);

    // Trigger automation
    await automationEngine.trigger(
      'INTERVIEW_COMPLETED',
      automationData,
      interview.publisherId
    );

    logger.info(`Automation triggered for completed interview ${interview._id}`);
  } catch (error) {
    logger.error('Error in onInterviewCompleted hook:', error);
  }
}

/**
 * Helper: Auto-open messaging thread when moving to interview stage
 */
async function autoOpenMessagingThread(application) {
  try {
    // Create or find message thread
    const thread = await MessageThread.findOrCreateForApplication(
      application._id,
      application.jobId,
      application.applicantId,
      application.publisherId || application.jobId.publishedBy
    );

    logger.info(`Messaging thread ${thread._id} opened for application ${application._id}`);

    return thread;
  } catch (error) {
    logger.error('Error auto-opening messaging thread:', error);
    throw error;
  }
}

/**
 * Helper: Prepare application data for automation
 */
async function prepareApplicationData(application) {
  const Job = require('../../club/models/Job');
  const User = require('../../shared/models/User');

  // Populate if needed
  if (!application.jobId.title) {
    await application.populate('jobId');
  }
  if (!application.applicantId.firstName) {
    await application.populate('applicantId');
  }

  const publisher = await User.findById(
    application.publisherId || application.jobId.publishedBy
  ).lean();

  return {
    applicationId: application._id,
    jobId: application.jobId._id,
    applicantId: application.applicantId._id,
    publisherId: publisher._id,
    status: application.status,
    applicationDate: application.createdAt,
    jobTitle: application.jobId.title,
    jobTitleAr: application.jobId.titleAr,
    applicantName: `${application.applicantId.firstName} ${application.applicantId.lastName}`,
    applicantEmail: application.applicantId.email,
    companyName: publisher.companyName || `${publisher.firstName} ${publisher.lastName}`,
    entityType: 'job_application',
    entityId: application._id,
  };
}

/**
 * Helper: Prepare interview data for automation
 */
async function prepareInterviewData(interview) {
  const Job = require('../../club/models/Job');
  const User = require('../../shared/models/User');

  const [job, applicant, publisher] = await Promise.all([
    Job.findById(interview.jobId).lean(),
    User.findById(interview.applicantId).lean(),
    User.findById(interview.publisherId).lean(),
  ]);

  return {
    interviewId: interview._id,
    jobId: interview.jobId,
    applicationId: interview.applicationId,
    applicantId: interview.applicantId,
    publisherId: interview.publisherId,
    interviewType: interview.type,
    scheduledAt: interview.scheduledAt,
    status: interview.status,
    jobTitle: job.title,
    jobTitleAr: job.titleAr,
    applicantName: `${applicant.firstName} ${applicant.lastName}`,
    applicantEmail: applicant.email,
    companyName: publisher.companyName || `${publisher.firstName} ${publisher.lastName}`,
    meetingUrl: interview.meetingUrl,
    location: interview.location,
    entityType: 'interview',
    entityId: interview._id,
  };
}

/**
 * Middleware: Add automation hooks to application update
 * Use this middleware in application controller
 */
function withAutomationHooks(handler) {
  return async (req, res, next) => {
    try {
      // Store original status before update
      const application = await require('../../club/models/JobApplication').findById(
        req.params.id || req.body.applicationId
      );

      if (application) {
        req.oldApplicationStatus = application.status;
      }

      // Call original handler
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Post-update hook: Trigger automation after application update
 */
async function afterApplicationUpdate(application, oldStatus) {
  if (oldStatus && oldStatus !== application.status) {
    await onApplicationStatusChanged(application, oldStatus, application.status);
  }
}

module.exports = {
  onApplicationStatusChanged,
  onApplicationSubmitted,
  onInterviewScheduled,
  onInterviewCompleted,
  autoOpenMessagingThread,
  prepareApplicationData,
  prepareInterviewData,
  withAutomationHooks,
  afterApplicationUpdate,
};
