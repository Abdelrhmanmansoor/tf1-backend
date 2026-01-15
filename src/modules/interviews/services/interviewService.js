const Interview = require('../models/Interview');
const MessageThread = require('../../messaging/models/MessageThread');
const Message = require('../../../models/Message');
const logger = require('../../../utils/logger');

class InterviewService {
  /**
   * Create interview with full automation
   */
  async createInterviewWithAutomation(interviewData, publisherId) {
    try {
      // Create interview
      const interview = await Interview.create({
        ...interviewData,
        createdBy: publisherId,
      });

      // Schedule reminders
      interview.scheduleReminders();
      await interview.save();

      // Create or find message thread
      const thread = await this.createOrFindMessageThread(interview);
      interview.messageThreadId = thread._id;
      await interview.save();

      // Send auto message to thread
      await this.sendInterviewAutoMessage(interview, thread);

      return { interview, thread };
    } catch (error) {
      logger.error('Error creating interview with automation:', error);
      throw error;
    }
  }

  /**
   * Create or find message thread for interview
   */
  async createOrFindMessageThread(interview) {
    try {
      const thread = await MessageThread.findOrCreateForApplication(
        interview.applicationId,
        interview.jobId,
        interview.applicantId,
        interview.publisherId
      );

      // Update thread to interview type
      thread.type = 'interview';
      thread.interviewId = interview._id;
      await thread.save();

      return thread;
    } catch (error) {
      logger.error('Error creating message thread:', error);
      throw error;
    }
  }

  /**
   * Send auto message to thread when interview is scheduled
   */
  async sendInterviewAutoMessage(interview, thread) {
    try {
      const Message = require('../../../models/Message');

      // Generate message content based on interview type
      let content, contentAr;

      if (interview.type === 'online') {
        content = this.generateOnlineInterviewMessage(interview, 'en');
        contentAr = this.generateOnlineInterviewMessage(interview, 'ar');
      } else {
        content = this.generateOnsiteInterviewMessage(interview, 'en');
        contentAr = this.generateOnsiteInterviewMessage(interview, 'ar');
      }

      // Create system message
      const message = await Message.create({
        conversationId: thread._id,
        senderId: interview.publisherId,
        senderRole: 'system',
        messageType: 'system',
        content,
        contentAr,
        systemMessageType: 'interview_scheduled',
        sentAt: new Date(),
      });

      // Update thread last message
      thread.updateLastMessage({
        content,
        contentAr,
        senderId: interview.publisherId,
        sentAt: new Date(),
        type: 'system',
      });
      await thread.save();

      return message;
    } catch (error) {
      logger.error('Error sending auto message:', error);
      throw error;
    }
  }

  /**
   * Generate online interview message
   */
  generateOnlineInterviewMessage(interview, language = 'en') {
    const date = new Date(interview.scheduledAt).toLocaleDateString(
      language === 'ar' ? 'ar-SA' : 'en-US',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    );

    const time = new Date(interview.scheduledAt).toLocaleTimeString(
      language === 'ar' ? 'ar-SA' : 'en-US',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

    if (language === 'ar') {
      return `🎉 تهانينا! تم دعوتك لإجراء مقابلة عبر الإنترنت

📅 التاريخ: ${date}
🕐 الوقت: ${time} (${interview.timezone})
⏱️ المدة: ${interview.duration} دقيقة
🔗 رابط الانضمام: ${interview.meetingUrl}

${interview.instructionsForApplicantAr || 'يرجى الانضمام في الوقت المحدد. حظاً موفقاً!'}

نتطلع للقائك!`;
    }

    return `🎉 Congratulations! You have been invited for an online interview

📅 Date: ${date}
🕐 Time: ${time} (${interview.timezone})
⏱️ Duration: ${interview.duration} minutes
🔗 Join Link: ${interview.meetingUrl}

${interview.instructionsForApplicant || 'Please join at the scheduled time. Good luck!'}

We look forward to meeting you!`;
  }

  /**
   * Generate onsite interview message
   */
  generateOnsiteInterviewMessage(interview, language = 'en') {
    const date = new Date(interview.scheduledAt).toLocaleDateString(
      language === 'ar' ? 'ar-SA' : 'en-US',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    );

    const time = new Date(interview.scheduledAt).toLocaleTimeString(
      language === 'ar' ? 'ar-SA' : 'en-US',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

    const address = interview.location?.address?.fullAddress || 
      `${interview.location?.address?.street}, ${interview.location?.address?.city}`;

    if (language === 'ar') {
      return `🎉 تهانينا! تم دعوتك لإجراء مقابلة شخصية

📅 التاريخ: ${date}
🕐 الوقت: ${time}
⏱️ المدة: ${interview.duration} دقيقة
📍 الموقع: ${address}
🗺️ خريطة الموقع: ${interview.location?.mapUrl || 'غير متوفرة'}

${interview.instructionsForApplicantAr || 'يرجى الوصول قبل 10 دقائق من الموعد. حظاً موفقاً!'}

نتطلع للقائك!`;
    }

    return `🎉 Congratulations! You have been invited for an in-person interview

📅 Date: ${date}
🕐 Time: ${time}
⏱️ Duration: ${interview.duration} minutes
📍 Location: ${address}
🗺️ Map: ${interview.location?.mapUrl || 'N/A'}

${interview.instructionsForApplicant || 'Please arrive 10 minutes early. Good luck!'}

We look forward to meeting you!`;
  }

  /**
   * Process pending reminders (called by cron job)
   */
  async processPendingReminders() {
    try {
      const now = new Date();

      // Find interviews with pending reminders
      const interviews = await Interview.find({
        status: { $in: ['scheduled', 'rescheduled'] },
        'reminders.status': 'pending',
        'reminders.scheduledAt': { $lte: now },
      }).populate('applicantId jobId');

      logger.info(`Processing ${interviews.length} pending reminders`);

      for (const interview of interviews) {
        for (const reminder of interview.reminders) {
          if (
            reminder.status === 'pending' &&
            new Date(reminder.scheduledAt) <= now
          ) {
            try {
              await this.sendReminder(interview, reminder);
              reminder.status = 'sent';
              reminder.sentAt = new Date();
            } catch (error) {
              logger.error(`Failed to send reminder for interview ${interview._id}:`, error);
              reminder.status = 'failed';
            }
          }
        }

        await interview.save();
      }

      return interviews.length;
    } catch (error) {
      logger.error('Error processing reminders:', error);
      throw error;
    }
  }

  /**
   * Send single reminder
   */
  async sendReminder(interview, reminder) {
    const notificationService = require('./interviewNotificationService');
    await notificationService.sendInterviewReminder(interview, reminder.type);
  }

  /**
   * Check for no-shows (called by cron job)
   */
  async checkForNoShows() {
    try {
      const now = new Date();
      const cutoffTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

      const noShows = await Interview.find({
        status: { $in: ['scheduled', 'rescheduled'] },
        scheduledAt: { $lte: cutoffTime },
        applicantJoinedAt: null, // Applicant never joined
      });

      logger.info(`Found ${noShows.length} potential no-shows`);

      for (const interview of noShows) {
        interview.status = 'no-show';
        await interview.save();

        // Notify publisher
        const notificationService = require('./interviewNotificationService');
        await notificationService.notifyPublisherNoShow(interview);
      }

      return noShows.length;
    } catch (error) {
      logger.error('Error checking for no-shows:', error);
      throw error;
    }
  }

  /**
   * Generate Google Maps URL from address
   */
  generateMapUrl(address) {
    const fullAddress = address.fullAddress || 
      `${address.street}, ${address.city}, ${address.country}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  }

  /**
   * Get interview statistics for dashboard
   */
  async getInterviewDashboardStats(publisherId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;

      const matchStage = {
        publisherId: mongoose.Types.ObjectId(publisherId),
      };

      if (startDate || endDate) {
        matchStage.scheduledAt = {};
        if (startDate) matchStage.scheduledAt.$gte = new Date(startDate);
        if (endDate) matchStage.scheduledAt.$lte = new Date(endDate);
      }

      const stats = await Interview.aggregate([
        { $match: matchStage },
        {
          $facet: {
            statusBreakdown: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                },
              },
            ],
            typeBreakdown: [
              {
                $group: {
                  _id: '$type',
                  count: { $sum: 1 },
                },
              },
            ],
            upcomingCount: [
              {
                $match: {
                  scheduledAt: { $gte: new Date() },
                  status: { $in: ['scheduled', 'rescheduled'] },
                },
              },
              { $count: 'count' },
            ],
            completionRate: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  completed: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                  },
                },
              },
              {
                $project: {
                  rate: {
                    $multiply: [{ $divide: ['$completed', '$total'] }, 100],
                  },
                },
              },
            ],
          },
        },
      ]);

      return {
        statusBreakdown: stats[0].statusBreakdown,
        typeBreakdown: stats[0].typeBreakdown,
        upcomingCount: stats[0].upcomingCount[0]?.count || 0,
        completionRate: stats[0].completionRate[0]?.rate || 0,
      };
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }
}

module.exports = new InterviewService();
