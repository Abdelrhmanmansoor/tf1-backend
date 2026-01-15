const Notification = require('../../../models/Notification');
const NotificationTemplate = require('../../notifications/models/NotificationTemplate');
const DeliveryLog = require('../../notifications/models/DeliveryLog');
const logger = require('../../../utils/logger');
const emailService = require('../../../utils/emailService');

class InterviewNotificationService {
  /**
   * Send interview invitation notification
   */
  async sendInterviewInvitation(interview) {
    try {
      const template = await NotificationTemplate.getByKey('interview_scheduled');

      if (!template) {
        logger.warn('Interview invitation template not found');
        return this.sendBasicInvitation(interview);
      }

      const variables = this.prepareInterviewVariables(interview);

      // Send in-app notification
      await this.sendInAppNotification(interview, template, variables);

      // Send email notification
      await this.sendEmailNotification(interview, template, variables);

      // Send SMS notification (if enabled)
      if (interview.applicantData?.phone) {
        await this.sendSMSNotification(interview, template, variables);
      }

      logger.info(`Interview invitation sent for interview ${interview._id}`);
    } catch (error) {
      logger.error('Error sending interview invitation:', error);
      throw error;
    }
  }

  /**
   * Send interview rescheduled notification
   */
  async sendInterviewRescheduled(interview) {
    try {
      const template = await NotificationTemplate.getByKey('interview_rescheduled');

      if (!template) {
        return this.sendBasicReschedule(interview);
      }

      const variables = this.prepareInterviewVariables(interview);

      await this.sendInAppNotification(interview, template, variables);
      await this.sendEmailNotification(interview, template, variables);

      logger.info(`Reschedule notification sent for interview ${interview._id}`);
    } catch (error) {
      logger.error('Error sending reschedule notification:', error);
      throw error;
    }
  }

  /**
   * Send interview cancelled notification
   */
  async sendInterviewCancelled(interview) {
    try {
      const template = await NotificationTemplate.getByKey('interview_cancelled');

      if (!template) {
        return this.sendBasicCancellation(interview);
      }

      const variables = this.prepareInterviewVariables(interview);
      variables.cancellationReason = interview.cancellationReason || 'No reason provided';

      await this.sendInAppNotification(interview, template, variables);
      await this.sendEmailNotification(interview, template, variables);

      logger.info(`Cancellation notification sent for interview ${interview._id}`);
    } catch (error) {
      logger.error('Error sending cancellation notification:', error);
      throw error;
    }
  }

  /**
   * Send interview reminder
   */
  async sendInterviewReminder(interview, reminderType = '24h') {
    try {
      const template = await NotificationTemplate.getByKey('interview_reminder');

      if (!template) {
        return this.sendBasicReminder(interview);
      }

      const variables = this.prepareInterviewVariables(interview);
      variables.reminderType = reminderType;
      variables.timeUntilInterview = this.calculateTimeUntil(interview.scheduledAt);

      await this.sendInAppNotification(interview, template, variables);

      // Only send email for 24h reminder
      if (reminderType === '24h') {
        await this.sendEmailNotification(interview, template, variables);
      }

      // Send push for 1h and 15min reminders
      if (reminderType === '1h' || reminderType === '15min') {
        await this.sendPushNotification(interview, template, variables);
      }

      logger.info(`Reminder sent for interview ${interview._id} (${reminderType})`);
    } catch (error) {
      logger.error('Error sending reminder:', error);
      throw error;
    }
  }

  /**
   * Notify publisher of no-show
   */
  async notifyPublisherNoShow(interview) {
    try {
      await Notification.createNotification({
        userId: interview.publisherId,
        userRole: 'job-publisher',
        type: 'interview_no_show',
        title: 'Candidate No-Show',
        titleAr: 'المرشح لم يحضر',
        message: `${interview.applicantData.name} did not attend the scheduled interview for ${interview.jobData.title}`,
        messageAr: `${interview.applicantData.name} لم يحضر المقابلة المجدولة لوظيفة ${interview.jobData.titleAr || interview.jobData.title}`,
        relatedTo: {
          entityType: 'interview',
          entityId: interview._id,
        },
        jobId: interview.jobId,
        applicationId: interview.applicationId,
        priority: 'normal',
      });

      logger.info(`No-show notification sent for interview ${interview._id}`);
    } catch (error) {
      logger.error('Error sending no-show notification:', error);
      throw error;
    }
  }

  /**
   * Send in-app notification
   */
  async sendInAppNotification(interview, template, variables) {
    try {
      const rendered = template.render('inApp', variables);

      if (!rendered) return;

      const notification = await Notification.createNotification({
        userId: interview.applicantId,
        userRole: 'applicant',
        type: template.key.replace(/_/g, '_'),
        title: rendered.title,
        titleAr: rendered.title, // Should use template.render with 'ar' language
        message: rendered.body,
        messageAr: rendered.body,
        relatedTo: {
          entityType: 'interview',
          entityId: interview._id,
        },
        actionUrl: `/interviews/${interview._id}`,
        jobId: interview.jobId,
        applicationId: interview.applicationId,
        priority: rendered.priority || 'high',
        channels: {
          inApp: true,
        },
      });

      // Emit real-time notification via Socket.io
      this.emitRealtimeNotification(interview.applicantId, notification);

      template.recordUsage();
      template.recordDelivery('sent');
      await template.save();

      return notification;
    } catch (error) {
      logger.error('Error sending in-app notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(interview, template, variables) {
    try {
      const rendered = template.render('email', variables);

      if (!rendered || !interview.applicantData?.email) return;

      const deliveryLog = await DeliveryLog.create({
        notificationId: null, // Can be linked if needed
        userId: interview.applicantId,
        channel: 'email',
        recipient: {
          email: interview.applicantData.email,
        },
        status: 'queued',
        content: {
          subject: rendered.subject,
          body: rendered.text,
          htmlBody: rendered.html,
        },
        provider: 'internal',
      });

      // Send email using email service
      try {
        await emailService.send({
          to: interview.applicantData.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });

        deliveryLog.markAsSent('email-sent-' + Date.now());
        template.recordDelivery('delivered');
      } catch (emailError) {
        deliveryLog.markAsFailed(emailError.message);
        template.recordDelivery('failed');
      }

      await deliveryLog.save();
      await template.save();

      return deliveryLog;
    } catch (error) {
      logger.error('Error sending email notification:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(interview, template, variables) {
    try {
      const rendered = template.render('sms', variables);

      if (!rendered || !interview.applicantData?.phone) return;

      const deliveryLog = await DeliveryLog.create({
        userId: interview.applicantId,
        channel: 'sms',
        recipient: {
          phone: interview.applicantData.phone,
        },
        status: 'queued',
        content: {
          body: rendered.text,
        },
        provider: 'twilio',
      });

      // SMS integration would go here (Twilio, etc.)
      // For now, just log it
      logger.info(`SMS notification queued for ${interview.applicantData.phone}`);

      deliveryLog.markAsSent('sms-queued-' + Date.now());
      await deliveryLog.save();

      template.recordDelivery('sent');
      await template.save();

      return deliveryLog;
    } catch (error) {
      logger.error('Error sending SMS notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(interview, template, variables) {
    try {
      const rendered = template.render('push', variables);

      if (!rendered) return;

      const deliveryLog = await DeliveryLog.create({
        userId: interview.applicantId,
        channel: 'push',
        status: 'queued',
        content: {
          subject: rendered.title,
          body: rendered.body,
        },
        provider: 'firebase',
      });

      // Push notification integration would go here
      logger.info(`Push notification queued for user ${interview.applicantId}`);

      deliveryLog.markAsSent('push-queued-' + Date.now());
      await deliveryLog.save();

      template.recordDelivery('sent');
      await template.save();

      return deliveryLog;
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Prepare interview variables for template
   */
  prepareInterviewVariables(interview) {
    const date = new Date(interview.scheduledAt);

    return {
      applicantName: interview.applicantData?.name || 'Candidate',
      jobTitle: interview.jobData?.title || 'Job',
      jobTitleAr: interview.jobData?.titleAr || interview.jobData?.title || 'Job',
      companyName: interview.jobData?.companyName || 'Company',
      interviewDate: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      interviewTime: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      timezone: interview.timezone || 'Asia/Riyadh',
      duration: interview.duration || 60,
      meetingUrl: interview.meetingUrl || 'N/A',
      location: interview.location?.address?.fullAddress || 'N/A',
      mapUrl: interview.location?.mapUrl || '',
      instructions: interview.instructionsForApplicant || '',
      instructionsAr: interview.instructionsForApplicantAr || '',
    };
  }

  /**
   * Calculate time until interview
   */
  calculateTimeUntil(scheduledAt) {
    const now = new Date();
    const interviewDate = new Date(scheduledAt);
    const diffMs = interviewDate - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  }

  /**
   * Emit real-time notification via Socket.io
   */
  emitRealtimeNotification(userId, notification) {
    try {
      if (global.io) {
        global.io.to(`user_${userId}`).emit('notification', {
          type: 'new_notification',
          data: notification,
        });
      }
    } catch (error) {
      logger.error('Error emitting real-time notification:', error);
    }
  }

  /**
   * Fallback: Send basic invitation without template
   */
  async sendBasicInvitation(interview) {
    return Notification.createNotification({
      userId: interview.applicantId,
      userRole: 'applicant',
      type: 'interview_scheduled',
      title: 'Interview Invitation',
      titleAr: 'دعوة مقابلة',
      message: `You have been invited for an interview for ${interview.jobData?.title}`,
      messageAr: `تم دعوتك لإجراء مقابلة لوظيفة ${interview.jobData?.titleAr || interview.jobData?.title}`,
      actionUrl: `/interviews/${interview._id}`,
      priority: 'high',
      jobId: interview.jobId,
      applicationId: interview.applicationId,
    });
  }

  /**
   * Fallback: Send basic reschedule notification
   */
  async sendBasicReschedule(interview) {
    return Notification.createNotification({
      userId: interview.applicantId,
      userRole: 'applicant',
      type: 'interview_rescheduled',
      title: 'Interview Rescheduled',
      titleAr: 'تم إعادة جدولة المقابلة',
      message: `Your interview has been rescheduled`,
      messageAr: `تم إعادة جدولة مقابلتك`,
      actionUrl: `/interviews/${interview._id}`,
      priority: 'high',
      jobId: interview.jobId,
      applicationId: interview.applicationId,
    });
  }

  /**
   * Fallback: Send basic cancellation notification
   */
  async sendBasicCancellation(interview) {
    return Notification.createNotification({
      userId: interview.applicantId,
      userRole: 'applicant',
      type: 'interview_cancelled',
      title: 'Interview Cancelled',
      titleAr: 'تم إلغاء المقابلة',
      message: `Your interview has been cancelled`,
      messageAr: `تم إلغاء مقابلتك`,
      actionUrl: `/interviews/${interview._id}`,
      priority: 'normal',
      jobId: interview.jobId,
      applicationId: interview.applicationId,
    });
  }

  /**
   * Fallback: Send basic reminder
   */
  async sendBasicReminder(interview) {
    return Notification.createNotification({
      userId: interview.applicantId,
      userRole: 'applicant',
      type: 'interview_reminder',
      title: 'Interview Reminder',
      titleAr: 'تذكير بالمقابلة',
      message: `Your interview is coming up soon`,
      messageAr: `مقابلتك قريبة`,
      actionUrl: `/interviews/${interview._id}`,
      priority: 'high',
      jobId: interview.jobId,
      applicationId: interview.applicationId,
    });
  }
}

module.exports = new InterviewNotificationService();
