/**
 * Seed Notification Templates
 * Run: node src/utils/seedData/notificationTemplates.js
 */

const mongoose = require('mongoose');
const NotificationTemplate = require('../../modules/notifications/models/NotificationTemplate');
require('dotenv').config();

const templates = [
  {
    key: 'interview_scheduled',
    name: 'Interview Scheduled',
    nameAr: 'تم جدولة مقابلة',
    category: 'interview',
    trigger: 'INTERVIEW_SCHEDULED',
    channels: {
      inApp: {
        enabled: true,
        title: 'Interview Invitation - {{jobTitle}}',
        titleAr: 'دعوة مقابلة - {{jobTitle}}',
        body: 'Congratulations {{applicantName}}! You have been invited for an interview.',
        bodyAr: 'تهانينا {{applicantName}}! تم دعوتك لإجراء مقابلة.',
        actionUrl: '/interviews/{{interviewId}}',
        priority: 'high',
      },
      email: {
        enabled: true,
        subject: 'Interview Invitation - {{jobTitle}}',
        subjectAr: 'دعوة مقابلة - {{jobTitle}}',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Interview Invitation</h2>
            <p>Dear {{applicantName}},</p>
            <p>Congratulations! We are pleased to invite you for an interview for the <strong>{{jobTitle}}</strong> position at {{companyName}}.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Interview Details:</h3>
              <p><strong>📅 Date:</strong> {{interviewDate}}</p>
              <p><strong>🕐 Time:</strong> {{interviewTime}} ({{timezone}})</p>
              <p><strong>⏱️ Duration:</strong> {{duration}} minutes</p>
              <p><strong>🔗 Join Link:</strong> <a href="{{meetingUrl}}">{{meetingUrl}}</a></p>
            </div>
            
            <p>{{instructions}}</p>
            
            <p>We look forward to meeting you!</p>
            
            <p>Best regards,<br>{{companyName}}</p>
          </div>
        `,
        textTemplate: `
Interview Invitation

Dear {{applicantName}},

Congratulations! We are pleased to invite you for an interview for the {{jobTitle}} position.

Interview Details:
- Date: {{interviewDate}}
- Time: {{interviewTime}} ({{timezone}})
- Duration: {{duration}} minutes
- Join Link: {{meetingUrl}}

{{instructions}}

We look forward to meeting you!

Best regards,
{{companyName}}
        `,
        fromName: 'SportX Platform',
        fromNameAr: 'منصة SportX',
      },
      sms: {
        enabled: true,
        template: 'Interview scheduled for {{jobTitle}} on {{interviewDate}} at {{interviewTime}}. Link: {{meetingUrl}}',
        templateAr: 'تم جدولة مقابلة لوظيفة {{jobTitle}} بتاريخ {{interviewDate}} في {{interviewTime}}',
      },
    },
    variables: [
      { key: 'applicantName', label: 'Applicant Name', type: 'string', required: true },
      { key: 'jobTitle', label: 'Job Title', type: 'string', required: true },
      { key: 'companyName', label: 'Company Name', type: 'string', required: true },
      { key: 'interviewDate', label: 'Interview Date', type: 'date', required: true },
      { key: 'interviewTime', label: 'Interview Time', type: 'string', required: true },
      { key: 'timezone', label: 'Timezone', type: 'string', required: true },
      { key: 'duration', label: 'Duration', type: 'number', required: true },
      { key: 'meetingUrl', label: 'Meeting URL', type: 'url', required: false },
      { key: 'instructions', label: 'Instructions', type: 'string', required: false },
      { key: 'interviewId', label: 'Interview ID', type: 'string', required: true },
    ],
    isActive: true,
    isSystemTemplate: true,
    isCustomizable: true,
  },
  
  {
    key: 'interview_rescheduled',
    name: 'Interview Rescheduled',
    nameAr: 'تم إعادة جدولة المقابلة',
    category: 'interview',
    trigger: 'INTERVIEW_RESCHEDULED',
    channels: {
      inApp: {
        enabled: true,
        title: 'Interview Rescheduled - {{jobTitle}}',
        titleAr: 'تم إعادة جدولة المقابلة - {{jobTitle}}',
        body: 'Your interview has been rescheduled to {{interviewDate}} at {{interviewTime}}',
        bodyAr: 'تم إعادة جدولة مقابلتك إلى {{interviewDate}} في {{interviewTime}}',
        actionUrl: '/interviews/{{interviewId}}',
        priority: 'high',
      },
      email: {
        enabled: true,
        subject: 'Interview Rescheduled - {{jobTitle}}',
        subjectAr: 'تم إعادة جدولة المقابلة - {{jobTitle}}',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Interview Rescheduled</h2>
            <p>Dear {{applicantName}},</p>
            <p>Your interview for <strong>{{jobTitle}}</strong> has been rescheduled.</p>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>New Interview Details:</h3>
              <p><strong>📅 Date:</strong> {{interviewDate}}</p>
              <p><strong>🕐 Time:</strong> {{interviewTime}} ({{timezone}})</p>
              <p><strong>🔗 Join Link:</strong> <a href="{{meetingUrl}}">{{meetingUrl}}</a></p>
            </div>
            
            <p>We apologize for any inconvenience this may cause.</p>
            
            <p>Best regards,<br>{{companyName}}</p>
          </div>
        `,
      },
      sms: {
        enabled: true,
        template: 'Interview rescheduled to {{interviewDate}} at {{interviewTime}}. Link: {{meetingUrl}}',
      },
    },
    variables: [
      { key: 'applicantName', label: 'Applicant Name', type: 'string', required: true },
      { key: 'jobTitle', label: 'Job Title', type: 'string', required: true },
      { key: 'companyName', label: 'Company Name', type: 'string', required: true },
      { key: 'interviewDate', label: 'New Interview Date', type: 'date', required: true },
      { key: 'interviewTime', label: 'New Interview Time', type: 'string', required: true },
      { key: 'timezone', label: 'Timezone', type: 'string', required: true },
      { key: 'meetingUrl', label: 'Meeting URL', type: 'url', required: false },
      { key: 'interviewId', label: 'Interview ID', type: 'string', required: true },
    ],
    isActive: true,
    isSystemTemplate: true,
    isCustomizable: true,
  },
  
  {
    key: 'interview_cancelled',
    name: 'Interview Cancelled',
    nameAr: 'تم إلغاء المقابلة',
    category: 'interview',
    trigger: 'INTERVIEW_CANCELLED',
    channels: {
      inApp: {
        enabled: true,
        title: 'Interview Cancelled - {{jobTitle}}',
        titleAr: 'تم إلغاء المقابلة - {{jobTitle}}',
        body: 'Your interview for {{jobTitle}} has been cancelled.',
        bodyAr: 'تم إلغاء مقابلتك لوظيفة {{jobTitle}}',
        actionUrl: '/applications/{{applicationId}}',
        priority: 'normal',
      },
      email: {
        enabled: true,
        subject: 'Interview Cancelled - {{jobTitle}}',
        subjectAr: 'تم إلغاء المقابلة - {{jobTitle}}',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Interview Cancelled</h2>
            <p>Dear {{applicantName}},</p>
            <p>We regret to inform you that your interview for <strong>{{jobTitle}}</strong> has been cancelled.</p>
            <p><strong>Reason:</strong> {{cancellationReason}}</p>
            <p>We apologize for any inconvenience this may cause.</p>
            <p>Best regards,<br>{{companyName}}</p>
          </div>
        `,
      },
    },
    variables: [
      { key: 'applicantName', label: 'Applicant Name', type: 'string', required: true },
      { key: 'jobTitle', label: 'Job Title', type: 'string', required: true },
      { key: 'companyName', label: 'Company Name', type: 'string', required: true },
      { key: 'cancellationReason', label: 'Cancellation Reason', type: 'string', required: false },
      { key: 'applicationId', label: 'Application ID', type: 'string', required: true },
    ],
    isActive: true,
    isSystemTemplate: true,
    isCustomizable: true,
  },
  
  {
    key: 'interview_reminder',
    name: 'Interview Reminder',
    nameAr: 'تذكير بالمقابلة',
    category: 'interview',
    trigger: 'INTERVIEW_REMINDER',
    channels: {
      inApp: {
        enabled: true,
        title: 'Interview Reminder - {{jobTitle}}',
        titleAr: 'تذكير بالمقابلة - {{jobTitle}}',
        body: 'Your interview is in {{timeUntilInterview}}',
        bodyAr: 'مقابلتك بعد {{timeUntilInterview}}',
        actionUrl: '/interviews/{{interviewId}}',
        priority: 'high',
      },
      email: {
        enabled: true,
        subject: 'Interview Reminder - {{jobTitle}}',
        subjectAr: 'تذكير بالمقابلة - {{jobTitle}}',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Interview Reminder</h2>
            <p>Dear {{applicantName}},</p>
            <p>This is a reminder that your interview for <strong>{{jobTitle}}</strong> is coming up soon.</p>
            
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Interview in {{timeUntilInterview}}</h3>
              <p><strong>📅 Date:</strong> {{interviewDate}}</p>
              <p><strong>🕐 Time:</strong> {{interviewTime}} ({{timezone}})</p>
              <p><strong>🔗 Join Link:</strong> <a href="{{meetingUrl}}">{{meetingUrl}}</a></p>
            </div>
            
            <p>Please make sure you're ready and have a stable internet connection.</p>
            
            <p>Best regards,<br>{{companyName}}</p>
          </div>
        `,
      },
      sms: {
        enabled: true,
        template: 'Reminder: Interview for {{jobTitle}} in {{timeUntilInterview}}. Link: {{meetingUrl}}',
      },
      push: {
        enabled: true,
        title: 'Interview Reminder',
        titleAr: 'تذكير بالمقابلة',
        body: 'Your interview for {{jobTitle}} is in {{timeUntilInterview}}',
        bodyAr: 'مقابلتك لوظيفة {{jobTitle}} بعد {{timeUntilInterview}}',
        icon: 'interview',
        sound: 'default',
      },
    },
    variables: [
      { key: 'applicantName', label: 'Applicant Name', type: 'string', required: true },
      { key: 'jobTitle', label: 'Job Title', type: 'string', required: true },
      { key: 'companyName', label: 'Company Name', type: 'string', required: true },
      { key: 'interviewDate', label: 'Interview Date', type: 'date', required: true },
      { key: 'interviewTime', label: 'Interview Time', type: 'string', required: true },
      { key: 'timezone', label: 'Timezone', type: 'string', required: true },
      { key: 'meetingUrl', label: 'Meeting URL', type: 'url', required: false },
      { key: 'timeUntilInterview', label: 'Time Until Interview', type: 'string', required: true },
      { key: 'interviewId', label: 'Interview ID', type: 'string', required: true },
    ],
    isActive: true,
    isSystemTemplate: true,
    isCustomizable: false,
  },
  
  {
    key: 'application_stage_changed',
    name: 'Application Stage Changed',
    nameAr: 'تغيرت حالة الطلب',
    category: 'application',
    trigger: 'APPLICATION_STAGE_CHANGED',
    channels: {
      inApp: {
        enabled: true,
        title: 'Application Update - {{jobTitle}}',
        titleAr: 'تحديث الطلب - {{jobTitle}}',
        body: 'Your application status has been updated to {{newStatus}}',
        bodyAr: 'تم تحديث حالة طلبك إلى {{newStatus}}',
        actionUrl: '/applications/{{applicationId}}',
        priority: 'normal',
      },
      email: {
        enabled: true,
        subject: 'Application Status Update - {{jobTitle}}',
        subjectAr: 'تحديث حالة الطلب - {{jobTitle}}',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Application Status Update</h2>
            <p>Dear {{applicantName}},</p>
            <p>Your application for <strong>{{jobTitle}}</strong> has been updated.</p>
            
            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>New Status:</strong> {{newStatus}}</p>
              <p>{{additionalMessage}}</p>
            </div>
            
            <p>You can view your application status in your dashboard.</p>
            
            <p>Best regards,<br>{{companyName}}</p>
          </div>
        `,
      },
    },
    variables: [
      { key: 'applicantName', label: 'Applicant Name', type: 'string', required: true },
      { key: 'jobTitle', label: 'Job Title', type: 'string', required: true },
      { key: 'companyName', label: 'Company Name', type: 'string', required: true },
      { key: 'oldStatus', label: 'Old Status', type: 'string', required: false },
      { key: 'newStatus', label: 'New Status', type: 'string', required: true },
      { key: 'additionalMessage', label: 'Additional Message', type: 'string', required: false },
      { key: 'applicationId', label: 'Application ID', type: 'string', required: true },
    ],
    isActive: true,
    isSystemTemplate: true,
    isCustomizable: true,
  },
];

async function seedTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing templates
    await NotificationTemplate.deleteMany({ isSystemTemplate: true });
    console.log('🗑️  Cleared existing system templates');

    // Insert new templates
    const result = await NotificationTemplate.insertMany(templates);
    console.log(`✅ Seeded ${result.length} notification templates`);

    console.log('\n📋 Templates created:');
    result.forEach(template => {
      console.log(`   - ${template.key}: ${template.name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedTemplates();
}

module.exports = { templates, seedTemplates };
