const AutomationRule = require('../models/AutomationRule');
const Notification = require('../../../models/Notification');
const MessageThread = require('../../messaging/models/MessageThread');
const Message = require('../../../models/Message');
const NotificationTemplate = require('../../notifications/models/NotificationTemplate');
const Interview = require('../../interviews/models/Interview');
const JobApplication = require('../../club/models/JobApplication');
const logger = require('../../../utils/logger');

class AutomationEngine {
  /**
   * Trigger automation rules for an event
   */
  async trigger(event, data, publisherId) {
    const startTime = Date.now();
    
    try {
      logger.info(`Triggering automation for event: ${event}, publisher: ${publisherId}`);

      // Find active rules for this event and publisher
      const rules = await AutomationRule.findActiveRulesForEvent(event, publisherId);

      if (rules.length === 0) {
        logger.debug(`No active automation rules found for event: ${event}`);
        return { executed: 0, success: 0, failed: 0 };
      }

      logger.info(`Found ${rules.length} active rules for event: ${event}`);

      let executed = 0;
      let success = 0;
      let failed = 0;

      for (const rule of rules) {
        try {
          // Check if rule is throttled
          if (rule.isThrottled()) {
            logger.debug(`Rule ${rule._id} is throttled, skipping`);
            continue;
          }

          // Check if conditions match
          if (!rule.matchesConditions(data)) {
            logger.debug(`Rule ${rule._id} conditions not matched, skipping`);
            continue;
          }

          executed++;

          // Execute rule actions
          const result = await this.executeRule(rule, data);

          if (result.success) {
            success++;
            rule.recordExecution(true, data, null, result.actionsExecuted, Date.now() - startTime);
          } else {
            failed++;
            rule.recordExecution(false, data, result.error, result.actionsExecuted, Date.now() - startTime);
          }

          await rule.save();
        } catch (error) {
          failed++;
          logger.error(`Error executing rule ${rule._id}:`, error);
          rule.recordExecution(false, data, error.message, 0, Date.now() - startTime);
          await rule.save();
        }
      }

      logger.info(`Automation complete: executed=${executed}, success=${success}, failed=${failed}`);

      return { executed, success, failed };
    } catch (error) {
      logger.error(`Error in automation trigger:`, error);
      throw error;
    }
  }

  /**
   * Execute a single automation rule
   */
  async executeRule(rule, data) {
    try {
      logger.info(`Executing rule: ${rule.name} (${rule._id})`);

      const results = [];
      let actionsExecuted = 0;

      // Sort actions by order
      const sortedActions = rule.actions
        .filter(action => action.enabled)
        .sort((a, b) => a.order - b.order);

      for (const action of sortedActions) {
        try {
          const result = await this.executeAction(action, data, rule);
          results.push(result);
          actionsExecuted++;
        } catch (error) {
          logger.error(`Error executing action ${action.type}:`, error);
          results.push({ success: false, error: error.message });
        }
      }

      const allSuccess = results.every(r => r.success);

      return {
        success: allSuccess,
        actionsExecuted,
        error: allSuccess ? null : 'Some actions failed',
        results,
      };
    } catch (error) {
      logger.error(`Error executing rule:`, error);
      return {
        success: false,
        actionsExecuted: 0,
        error: error.message,
      };
    }
  }

  /**
   * Execute a single action
   */
  async executeAction(action, data, rule) {
    logger.debug(`Executing action: ${action.type}`);

    switch (action.type) {
      case 'SEND_NOTIFICATION':
        return await this.actionSendNotification(action.config, data, rule);

      case 'CREATE_THREAD':
        return await this.actionCreateThread(action.config, data, rule);

      case 'SEND_MESSAGE':
        return await this.actionSendMessage(action.config, data, rule);

      case 'SEND_EMAIL':
        return await this.actionSendEmail(action.config, data, rule);

      case 'SCHEDULE_INTERVIEW':
        return await this.actionScheduleInterview(action.config, data, rule);

      case 'ASSIGN_TO_STAGE':
        return await this.actionAssignToStage(action.config, data, rule);

      case 'ADD_TAG':
        return await this.actionAddTag(action.config, data, rule);

      case 'UPDATE_FIELD':
        return await this.actionUpdateField(action.config, data, rule);

      case 'WEBHOOK':
        return await this.actionWebhook(action.config, data, rule);

      default:
        logger.warn(`Unknown action type: ${action.type}`);
        return { success: false, error: 'Unknown action type' };
    }
  }

  /**
   * Action: Send Notification
   */
  async actionSendNotification(config, data, rule) {
    try {
      const { templateKey, recipientId, priority, customData } = config;

      const template = await NotificationTemplate.getByKey(templateKey);

      if (!template) {
        throw new Error(`Template not found: ${templateKey}`);
      }

      const variables = this.prepareVariables(customData || {}, data);
      const rendered = template.render('inApp', variables);

      const resolvedRecipientId =
        recipientId || data.applicantId || data.userId || rule.publisherId;

      const resolvedUserRole =
        data.userRole ||
        (String(resolvedRecipientId) === String(rule.publisherId)
          ? 'job-publisher'
          : 'applicant');

      await Notification.createNotification({
        userId: resolvedRecipientId,
        userRole: resolvedUserRole,
        type: template.key,
        title: rendered.title,
        message: rendered.body,
        actionUrl: rendered.actionUrl,
        priority: priority || rendered.priority,
        relatedTo: {
          entityType: data.entityType || 'job_application',
          entityId: data.applicationId || data.entityId,
        },
        jobId: data.jobId,
        applicationId: data.applicationId,
      });

      logger.info(`Notification sent via automation rule ${rule._id}`);

      return { success: true };
    } catch (error) {
      logger.error('Action SEND_NOTIFICATION failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Action: Create Message Thread
   */
  async actionCreateThread(config, data, rule) {
    try {
      const { applicationId, jobId, applicantId, publisherId } = data;

      // Check if thread already exists
      let thread = await MessageThread.findOne({ applicationId });

      if (!thread) {
        thread = await MessageThread.findOrCreateForApplication(
          applicationId,
          jobId,
          applicantId,
          publisherId
        );

        logger.info(`Thread created via automation rule ${rule._id}`);
      } else {
        logger.debug(`Thread already exists for application ${applicationId}`);
      }

      return { success: true, threadId: thread._id };
    } catch (error) {
      logger.error('Action CREATE_THREAD failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Action: Send Message
   */
  async actionSendMessage(config, data, rule) {
    try {
      const { messageTemplate, recipientId, senderId } = config;
      const { applicationId, jobId, applicantId, publisherId } = data;

      // Find or create thread
      let thread = await MessageThread.findOne({ applicationId });

      if (!thread) {
        thread = await MessageThread.findOrCreateForApplication(
          applicationId,
          jobId,
          applicantId,
          publisherId
        );
      }

      // Prepare message content
      const variables = this.prepareVariables({}, data);
      const content = this.replaceVariables(messageTemplate, variables);

      // Create message
      const message = await Message.create({
        conversationId: thread._id,
        senderId: senderId || publisherId,
        senderRole: 'system',
        messageType: 'system',
        content,
        systemMessageType: 'automation',
      });

      // Update thread last message
      thread.updateLastMessage({
        content,
        senderId: senderId || publisherId,
        sentAt: new Date(),
        type: 'system',
      });
      await thread.save();

      logger.info(`Message sent via automation rule ${rule._id}`);

      // Emit real-time notification
      if (global.io) {
        global.io.to(`user_${applicantId}`).emit('new_message', {
          threadId: thread._id,
          message,
        });
      }

      return { success: true, messageId: message._id };
    } catch (error) {
      logger.error('Action SEND_MESSAGE failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Action: Send Email
   */
  async actionSendEmail(config, data, rule) {
    try {
      const { subject, body, recipientEmail } = config;

      const variables = this.prepareVariables({}, data);
      const emailSubject = this.replaceVariables(subject, variables);
      const emailBody = this.replaceVariables(body, variables);

      const emailService = require('../../../utils/emailService');

      await emailService.send({
        to: recipientEmail || data.applicantEmail,
        subject: emailSubject,
        html: emailBody,
      });

      logger.info(`Email sent via automation rule ${rule._id}`);

      return { success: true };
    } catch (error) {
      logger.error('Action SEND_EMAIL failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Action: Schedule Interview
   */
  async actionScheduleInterview(config, data, rule) {
    try {
      const { type, duration, autoScheduleDays } = config;

      // Auto-schedule interview X days from now
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + (autoScheduleDays || 3));

      const interviewData = {
        jobId: data.jobId,
        applicationId: data.applicationId,
        applicantId: data.applicantId,
        publisherId: data.publisherId,
        type: type || 'online',
        scheduledAt: scheduledDate,
        duration: duration || 60,
        status: 'scheduled',
        createdBy: rule.publisherId,
      };

      if (type === 'online') {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const token = Interview.generateMeetingToken();
        interviewData.meetingToken = token;
        interviewData.meetingUrl = `${baseUrl}/interview/${token}`;
        interviewData.meetingPlatform = 'internal';
      }

      const interview = await Interview.create(interviewData);

      logger.info(`Interview scheduled via automation rule ${rule._id}`);

      return { success: true, interviewId: interview._id };
    } catch (error) {
      logger.error('Action SCHEDULE_INTERVIEW failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Action: Assign to Stage
   */
  async actionAssignToStage(config, data, rule) {
    try {
      const { stage } = config;
      const { applicationId } = data;

      const application = await JobApplication.findById(applicationId);

      if (!application) {
        throw new Error('Application not found');
      }

      application.status = stage;
      await application.save();

      logger.info(`Application ${applicationId} moved to ${stage} via automation rule ${rule._id}`);

      return { success: true };
    } catch (error) {
      logger.error('Action ASSIGN_TO_STAGE failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Action: Add Tag
   */
  async actionAddTag(config, data, rule) {
    try {
      const { tag } = config;
      const { applicationId } = data;

      const application = await JobApplication.findById(applicationId);

      if (!application) {
        throw new Error('Application not found');
      }

      if (!application.tags) {
        application.tags = [];
      }

      if (!application.tags.includes(tag)) {
        application.tags.push(tag);
        await application.save();
      }

      logger.info(`Tag '${tag}' added to application ${applicationId} via automation rule ${rule._id}`);

      return { success: true };
    } catch (error) {
      logger.error('Action ADD_TAG failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Action: Update Field
   */
  async actionUpdateField(config, data, rule) {
    try {
      const { model, field, value } = config;
      const { applicationId, jobId } = data;

      let document;

      if (model === 'JobApplication') {
        document = await JobApplication.findById(applicationId);
      } else if (model === 'Job') {
        document = await require('../../club/models/Job').findById(jobId);
      }

      if (!document) {
        throw new Error(`${model} not found`);
      }

      document[field] = value;
      await document.save();

      logger.info(`Field '${field}' updated via automation rule ${rule._id}`);

      return { success: true };
    } catch (error) {
      logger.error('Action UPDATE_FIELD failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Action: Webhook
   */
  async actionWebhook(config, data, rule) {
    try {
      const { url, method, headers, body } = config;

      const axios = require('axios');

      const variables = this.prepareVariables({}, data);
      const webhookBody = JSON.parse(this.replaceVariables(JSON.stringify(body || {}), variables));

      await axios({
        method: method || 'POST',
        url,
        headers: headers || { 'Content-Type': 'application/json' },
        data: webhookBody,
      });

      logger.info(`Webhook called via automation rule ${rule._id}`);

      return { success: true };
    } catch (error) {
      logger.error('Action WEBHOOK failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Prepare variables for template replacement
   */
  prepareVariables(customData, data) {
    return {
      ...customData,
      applicantName: data.applicantName || 'Candidate',
      jobTitle: data.jobTitle || 'Job',
      companyName: data.companyName || 'Company',
      status: data.status || data.newStatus || '',
      oldStatus: data.oldStatus || '',
      newStatus: data.newStatus || '',
      applicationDate: data.applicationDate || new Date().toLocaleDateString(),
      ...data,
    };
  }

  /**
   * Replace variables in template string
   */
  replaceVariables(template, variables) {
    if (!template) return '';

    let result = template;

    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });

    // Remove unreplaced variables
    result = result.replace(/{{[^}]+}}/g, '');

    return result;
  }

  /**
   * Test automation rule (dry run)
   */
  async testRule(ruleId, testData) {
    try {
      const rule = await AutomationRule.findById(ruleId);

      if (!rule) {
        throw new Error('Rule not found');
      }

      // Test conditions
      const conditionsMatch = rule.matchesConditions(testData);

      if (!conditionsMatch) {
        return {
          success: false,
          message: 'Conditions do not match test data',
          conditionsMatch: false,
        };
      }

      // Test execution (without saving)
      const result = await this.executeRule(rule, testData);

      return {
        success: true,
        message: 'Test completed successfully',
        conditionsMatch: true,
        executionResult: result,
      };
    } catch (error) {
      logger.error('Error testing rule:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

module.exports = new AutomationEngine();
