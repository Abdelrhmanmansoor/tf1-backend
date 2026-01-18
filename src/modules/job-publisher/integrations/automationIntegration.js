const AutomationQueue = require('../../automation/services/automationQueue');
const User = require('../../shared/models/User');
const MessageThread = require('../../messaging/models/MessageThread');
const logger = require('../../../utils/logger');
const Job = require('../../club/models/Job');

class AutomationIntegration {
  /**
   * Helper: Trigger automation with Queue support
   */
  async trigger(event, data, publisherId, meta = {}) {
    try {
      await AutomationQueue.add(event, data, publisherId, meta);
    } catch (error) {
      logger.error(`Failed to trigger automation event ${event}:`, error);
    }
  }

  // ==========================================
  // EXISTING HOOKS (UPDATED)
  // ==========================================

  async onApplicationStatusChanged(application, oldStatus, newStatus, meta = {}) {
    try {
      if (oldStatus === newStatus) return;

      const data = await this.prepareApplicationData(application);
      data.oldStatus = oldStatus;
      data.newStatus = newStatus;

      // Trigger: APPLICATION_STAGE_CHANGED
      await this.trigger('APPLICATION_STAGE_CHANGED', data, application.publisherId, meta);

      // Helper: Auto-open messaging thread if interviewed
      if (newStatus === 'interviewed') {
        this.autoOpenMessagingThread(application);
      }
    } catch (error) {
      logger.error('Error in onApplicationStatusChanged automation hook:', error);
    }
  }

  async onApplicationSubmitted(application) {
    try {
      const data = await this.prepareApplicationData(application);
      await this.trigger('APPLICATION_SUBMITTED', data, application.publisherId);
    } catch (error) {
      logger.error('Error in onApplicationSubmitted automation hook:', error);
    }
  }

  async onInterviewScheduled(interview) {
    try {
      const data = await this.prepareInterviewData(interview);
      await this.trigger('INTERVIEW_SCHEDULED', data, interview.publisherId);
    } catch (error) {
      logger.error('Error in onInterviewScheduled automation hook:', error);
    }
  }

  async onInterviewCompleted(interview) {
    try {
      const data = await this.prepareInterviewData(interview);
      await this.trigger('INTERVIEW_COMPLETED', data, interview.publisherId);
    } catch (error) {
      logger.error('Error in onInterviewCompleted automation hook:', error);
    }
  }

  // ==========================================
  // NEW MISSING HOOKS
  // ==========================================

  async onInterviewCancelled(interview, reason) {
    try {
      const data = await this.prepareInterviewData(interview);
      data.cancellationReason = reason;
      await this.trigger('INTERVIEW_CANCELLED', data, interview.publisherId);
    } catch (error) {
      logger.error('Error in onInterviewCancelled automation hook:', error);
    }
  }

  async onMessageReceived(message, thread) {
    try {
      // Only trigger for Publisher if they are a participant
      if (message.senderRole === 'publisher') return; // Don't trigger on own messages

      const publisherParticipant = thread.participants.find(p => p.role === 'publisher');
      if (!publisherParticipant) return;

      const publisherId = publisherParticipant.userId;
      const data = await this.prepareMessageData(message, thread);

      await this.trigger('MESSAGE_RECEIVED', data, publisherId);
    } catch (error) {
      logger.error('Error in onMessageReceived automation hook:', error);
    }
  }

  async onJobPublished(job) {
    try {
      const data = await this.prepareJobData(job);
      await this.trigger('JOB_PUBLISHED', data, job.publishedBy);
    } catch (error) {
      logger.error('Error in onJobPublished automation hook:', error);
    }
  }

  async onApplicationUpdated(application, changes) {
    try {
      const data = await this.prepareApplicationData(application);
      data.changes = changes;
      await this.trigger('APPLICATION_UPDATED', data, application.publisherId);
    } catch (error) {
      logger.error('Error in onApplicationUpdated automation hook:', error);
    }
  }

  async onFeedbackSubmitted(interview, feedback) {
    try {
      const data = await this.prepareInterviewData(interview);
      data.feedback = feedback;
      await this.trigger('FEEDBACK_SUBMITTED', data, interview.publisherId);
    } catch (error) {
      logger.error('Error in onFeedbackSubmitted automation hook:', error);
    }
  }

  // ==========================================
  // DATA PREPARATION HELPERS
  // ==========================================

  async prepareApplicationData(application) {
    // Ensure populated
    if (!application.jobId?.title || !application.applicantId?.firstName) {
      // Just in case populate is needed, though usually controllers populate it
      // Note: checking nested properties safely
      await application.populate('jobId applicantId');
    }

    const publisher = await User.findById(application.publisherId).lean();

    return {
      entityId: application._id, // For idempotency
      applicationId: application._id,
      jobId: application.jobId?._id,
      applicantId: application.applicantId?._id,
      publisherId: application.publisherId,
      status: application.status,
      jobTitle: application.jobId?.title || 'Job',
      applicantName: `${application.applicantId?.firstName} ${application.applicantId?.lastName}`,
      applicantEmail: application.applicantId?.email,
      companyName: publisher ? publisher.companyName : 'Company',
      applicationDate: application.createdAt,
    };
  }

  async prepareInterviewData(interview) {
    if (!interview.jobId?.title || !interview.applicantId?.firstName) {
      await interview.populate('jobId applicantId');
    }

    return {
      entityId: interview._id,
      interviewId: interview._id,
      jobId: interview.jobId?._id,
      applicantId: interview.applicantId?._id,
      jobTitle: interview.jobId?.title,
      applicantName: `${interview.applicantId?.firstName} ${interview.applicantId?.lastName}`,
      applicantEmail: interview.applicantId?.email,
      scheduledAt: interview.scheduledAt,
      type: interview.type,
      meetingUrl: interview.meetingUrl,
      location: interview.location
    };
  }

  async prepareMessageData(message, thread) {
    // Ensure populated
    if (!thread.jobId?.title) await thread.populate('jobId');

    const sender = await User.findById(message.senderId).lean();

    return {
      entityId: message._id,
      messageId: message._id,
      threadId: thread._id,
      content: message.content,
      senderName: sender ? `${sender.firstName} ${sender.lastName}` : 'User',
      jobTitle: thread.jobId?.title || 'Job'
    };
  }

  async prepareJobData(job) {
    return {
      entityId: job._id,
      jobId: job._id,
      jobTitle: job.title,
      status: job.status,
      publishedAt: new Date()
    };
  }

  async autoOpenMessagingThread(application) {
    try {
      await MessageThread.findOrCreateForApplication(
        application._id,
        application.jobId._id,
        application.applicantId._id,
        application.publisherId
      );
    } catch (error) {
      logger.error('Error auto-opening messaging thread:', error);
    }
  }
}

module.exports = new AutomationIntegration();
