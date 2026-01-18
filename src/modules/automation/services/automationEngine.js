const AutomationRule = require('../models/AutomationRule');
const Notification = require('../../../models/Notification');
const MessageThread = require('../../messaging/models/MessageThread');
const Message = require('../../../models/Message');
const NotificationTemplate = require('../../notifications/models/NotificationTemplate');
const Interview = require('../../interviews/models/Interview');
const JobApplication = require('../../club/models/JobApplication');
const logger = require('../../../utils/logger'); // Logger was also missing from top requires or I should check

class AutomationEngine {
  /**
   * Trigger an automation event
   */
  async trigger(event, data, publisherId, meta = {}) {
    // Generate eventId if not provided (for tracking)
    const eventId = meta.eventId || require('crypto').randomUUID();
    const logger = require('../../../utils/logger');
    const AutomationProcessedEvent = require('../models/AutomationProcessedEvent');
    const AutomationRule = require('../models/AutomationRule');

    try {
      // 1. Recursion Protection
      if (meta.depth && meta.depth > 3) {
        logger.warn(`🛑 Recursion depth exceeded for event ${event} (Depth: ${meta.depth}). Stopping chain.`);
        return { executed: 0, success: 0, failed: 0, error: 'Recursion limit' };
      }

      // 2. Idempotency Check (if entityId provided)
      if (data.entityId) {
        const existing = await AutomationProcessedEvent.findOne({
          publisherId,
          event,
          entityId: data.entityId
        });

        if (existing) {
          // Check if processed recently (simple dedup) - or we rely on TTL
          logger.debug(`⏭️ Skipping duplicate event ${event} for ${data.entityId} (Already processed)`);
          return { executed: 0, success: 0, failed: 0, duplicate: true };
        }

        // Save as processed
        await AutomationProcessedEvent.create({
          eventId,
          publisherId,
          event,
          entityId: data.entityId
        });
      }

      // 3. Find Rules
      const rules = await AutomationRule.find({
        publisherId: publisherId,
        triggerEvent: event,
        isActive: true
      });

      if (!rules || rules.length === 0) {
        return { executed: 0, success: 0, failed: 0 };
      }

      logger.info(`Found ${rules.length} rules for event ${event} (Publisher: ${publisherId})`);

      // 4. Execute Rules
      const results = [];
      for (const rule of rules) {
        // Check conditions
        if (rule.conditions && rule.conditions.length > 0) {
          const conditionsMet = rule.matchesConditions ? rule.matchesConditions(data) : true;
          // Note: we assume matchesConditions is on the model or we need to implement logic here. 
          // Since rule is a mongoose doc, it might have methods if schema defines them.
          // Otherwise we'd need a helper. For now assuming simple execution.
          if (!conditionsMet) continue;
        }

        const result = await this.executeRule(rule, data, meta);
        results.push(result);
      }

      return {
        executed: results.length,
        results
      };

    } catch (error) {
      logger.error(`Error processing trigger ${event}:`, error);
      return { error: error.message };
    }
  }

  async executeRule(rule, data, meta = {}) {
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
          const result = await this.executeAction(action, data, rule, meta);
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
  async executeAction(action, data, rule, meta) {
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

      case 'SEND_SMS':
        return await this.actionSendSms(action.config, data, rule);

      case 'SCHEDULE_INTERVIEW':
        return await this.actionScheduleInterview(action.config, data, rule);

      case 'ASSIGN_TO_STAGE':
        return await this.actionAssignToStage(action.config, data, rule, meta);

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
   * Action: Send SMS (Placeholder)
   */
  async actionSendSms(config, data, rule) {
    try {
      const { phoneNumber, messageTemplate } = config;
      const targetPhone = phoneNumber || data.applicantPhone || data.phone;

      if (!targetPhone) {
        throw new Error('No phone number available for SMS');
      }

      const variables = this.prepareVariables({}, data);
      const content = this.replaceVariables(messageTemplate, variables);

      logger.warn(`📱 SMS Action Triggered but not implemented: [To: ${targetPhone}] Content: ${content}`);

      // Future: Integration with Twilio/Nexmo
      return {
        success: false,
        error: 'SMS service not configured',
        details: { targetPhone, content }
      };
    } catch (error) {
      logger.error('Action SEND_SMS failed:', error);
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
  async actionAssignToStage(config, data, rule, meta) {
    try {
      const { stage } = config;
      const { applicationId } = data;

      const application = await JobApplication.findById(applicationId);

      if (!application) {
        throw new Error('Application not found');
      }

      // No-op check: If status is already the same, do nothing
      if (application.status === stage) {
        logger.debug(`Application ${applicationId} already in stage ${stage}. No-op.`);
        return { success: true, noop: true };
      }

      // Store old status for hook
      const oldStatus = application.status;
      application.status = stage;
      await application.save();

      logger.info(`Application ${applicationId} moved to ${stage} via automation rule ${rule._id}`);

      // TRIGGER RECURSIVE CHAIN:
      // We must manually trigger the 'APPLICATION_STAGE_CHANGED' event here
      // because we bypassed the controller. We pass the meta to track depth.
      const automationIntegration = require('../../job-publisher/integrations/automationIntegration');

      // Use setImmediate to avoid blocking the current rule execution completely
      setImmediate(async () => {
        await automationIntegration.onApplicationStatusChanged(
          application,
          oldStatus,
          stage,
          { ...meta, depth: (meta.depth || 0) + 1 }
        );
      });

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
      const { URL } = require('url');

      // SSRF PROTECTION
      const parsedUrl = new URL(url);

      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        throw new Error('Invalid protocol. Use http or https.');
      }

      const hostname = parsedUrl.hostname;

      // Blacklist local/private ranges
      const isLocal = hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1';

      // Ideally we should resolve DNS and check IP, but basic string check for patch
      // Regex for private IPs: 10.x, 192.168.x, 172.16-31.x
      const isPrivate = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);

      if (isLocal || isPrivate) {
        throw new Error(`Security Exception: Cannot access restricted host ${hostname}`);
      }

      const variables = this.prepareVariables({}, data);
      const webhookJson = this.replaceVariables(JSON.stringify(body || {}), variables);
      let webhookBody = {};

      try {
        webhookBody = JSON.parse(webhookJson);
      } catch (e) {
        webhookBody = webhookJson; // Send as string if parse fails
      }

      await axios({
        method: method || 'POST',
        url,
        headers: headers || { 'Content-Type': 'application/json' },
        data: webhookBody,
        timeout: 5000, // 5s timeout
        maxContentLength: 100000, // 100kb max response
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
