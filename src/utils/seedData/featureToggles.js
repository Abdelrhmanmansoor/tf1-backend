/**
 * Seed Feature Toggles
 * Run: node src/utils/seedData/featureToggles.js
 */

const mongoose = require('mongoose');
const FeatureToggle = require('../../modules/admin-features/models/FeatureToggle');
require('dotenv').config();

const features = [
  {
    feature: 'interview_automation',
    name: 'Interview Automation',
    nameAr: 'أتمتة المقابلات',
    description: 'Automated interview scheduling with reminders and notifications',
    descriptionAr: 'جدولة المقابلات التلقائية مع التذكيرات والإشعارات',
    icon: '📅',
    color: '#4CAF50',
    category: 'interviews',
    isEnabled: true,
    isGlobalFeature: false,
    isBetaFeature: false,
    isPaidFeature: true,
    requiredTier: 'basic',
    config: {
      maxInterviewsPerMonth: 50,
      autoRemindersEnabled: true,
      onlineMeetingEnabled: true,
      onsiteMeetingEnabled: true,
    },
    defaultConfig: {
      maxInterviewsPerMonth: 10,
      autoRemindersEnabled: true,
      onlineMeetingEnabled: true,
      onsiteMeetingEnabled: false,
    },
    documentation: {
      setupInstructions: 'Enable this feature to automatically schedule interviews and send reminders.',
      setupInstructionsAr: 'فعّل هذه الميزة لجدولة المقابلات تلقائياً وإرسال التذكيرات.',
      apiEndpoints: [
        'POST /api/v1/publisher/interviews',
        'GET /api/v1/publisher/interviews',
        'PATCH /api/v1/publisher/interviews/:id',
      ],
      learnMoreUrl: 'https://docs.sportx.com/interview-automation',
    },
  },
  
  {
    feature: 'advanced_notifications',
    name: 'Advanced Notifications',
    nameAr: 'إشعارات متقدمة',
    description: 'Multi-channel notifications including Email, SMS, and WhatsApp',
    descriptionAr: 'إشعارات متعددة القنوات تشمل البريد الإلكتروني والرسائل القصيرة وواتساب',
    icon: '🔔',
    color: '#2196F3',
    category: 'notifications',
    isEnabled: true,
    isGlobalFeature: false,
    isBetaFeature: false,
    isPaidFeature: true,
    requiredTier: 'pro',
    config: {
      emailEnabled: true,
      smsEnabled: true,
      whatsappEnabled: true,
      pushEnabled: true,
      smsCreditsPerMonth: 500,
      emailLimit: 10000,
    },
    defaultConfig: {
      emailEnabled: true,
      smsEnabled: false,
      whatsappEnabled: false,
      pushEnabled: false,
      smsCreditsPerMonth: 0,
      emailLimit: 1000,
    },
    documentation: {
      setupInstructions: 'Configure your SMTP, SMS, and WhatsApp settings to enable multi-channel notifications.',
      setupInstructionsAr: 'قم بتكوين إعدادات SMTP والرسائل القصيرة وواتساب لتفعيل الإشعارات متعددة القنوات.',
      apiEndpoints: [
        'POST /api/v1/publisher/notifications/trigger',
        'GET /api/v1/publisher/notification-preferences',
      ],
    },
  },
  
  {
    feature: 'messaging_system',
    name: 'Messaging System',
    nameAr: 'نظام المراسلة',
    description: 'Real-time messaging with applicants and candidates',
    descriptionAr: 'مراسلة فورية مع المتقدمين والمرشحين',
    icon: '💬',
    color: '#9C27B0',
    category: 'messaging',
    isEnabled: true,
    isGlobalFeature: true,
    isBetaFeature: false,
    isPaidFeature: false,
    requiredTier: 'free',
    config: {
      maxThreads: 1000,
      attachmentsEnabled: true,
      maxAttachmentSize: 10485760, // 10MB
      typingIndicatorEnabled: true,
      readReceiptsEnabled: true,
    },
    defaultConfig: {
      maxThreads: 100,
      attachmentsEnabled: true,
      maxAttachmentSize: 5242880, // 5MB
      typingIndicatorEnabled: true,
      readReceiptsEnabled: true,
    },
    documentation: {
      setupInstructions: 'Start messaging with applicants directly from the application page.',
      setupInstructionsAr: 'ابدأ المراسلة مع المتقدمين مباشرة من صفحة الطلب.',
      apiEndpoints: [
        'GET /api/v1/publisher/messages/threads',
        'POST /api/v1/publisher/messages/threads/:id/messages',
      ],
    },
  },
  
  {
    feature: 'automation_rules',
    name: 'Automation Rules',
    nameAr: 'قواعد الأتمتة',
    description: 'Create custom automation workflows for your recruitment process',
    descriptionAr: 'أنشئ سير عمل أتمتة مخصص لعملية التوظيف الخاصة بك',
    icon: '🤖',
    color: '#FF9800',
    category: 'automation',
    isEnabled: true,
    isGlobalFeature: false,
    isBetaFeature: false,
    isPaidFeature: true,
    requiredTier: 'pro',
    config: {
      maxRules: 50,
      maxActionsPerRule: 10,
      maxConditionsPerRule: 5,
      customWebhooksEnabled: true,
    },
    defaultConfig: {
      maxRules: 5,
      maxActionsPerRule: 3,
      maxConditionsPerRule: 2,
      customWebhooksEnabled: false,
    },
    dependencies: [
      { feature: 'messaging_system', required: false },
      { feature: 'advanced_notifications', required: false },
    ],
    documentation: {
      setupInstructions: 'Create automation rules to streamline your recruitment workflow.',
      setupInstructionsAr: 'أنشئ قواعد أتمتة لتبسيط سير عمل التوظيف الخاص بك.',
      apiEndpoints: [
        'GET /api/v1/publisher/automations',
        'POST /api/v1/publisher/automations',
        'POST /api/v1/publisher/automations/test',
      ],
    },
  },
  
  {
    feature: 'advanced_analytics',
    name: 'Advanced Analytics',
    nameAr: 'تحليلات متقدمة',
    description: 'Detailed insights and metrics for your recruitment pipeline',
    descriptionAr: 'رؤى ومقاييس تفصيلية لعملية التوظيف الخاصة بك',
    icon: '📊',
    color: '#00BCD4',
    category: 'analytics',
    isEnabled: true,
    isGlobalFeature: false,
    isBetaFeature: false,
    isPaidFeature: true,
    requiredTier: 'pro',
    config: {
      customReportsEnabled: true,
      exportEnabled: true,
      realTimeAnalytics: true,
      historicalDataMonths: 12,
    },
    defaultConfig: {
      customReportsEnabled: false,
      exportEnabled: false,
      realTimeAnalytics: false,
      historicalDataMonths: 3,
    },
    documentation: {
      setupInstructions: 'Access detailed analytics dashboard to track your recruitment metrics.',
      setupInstructionsAr: 'الوصول إلى لوحة التحليلات التفصيلية لتتبع مقاييس التوظيف الخاصة بك.',
    },
  },
  
  {
    feature: 'api_access',
    name: 'API Access',
    nameAr: 'الوصول إلى API',
    description: 'Full API access for custom integrations',
    descriptionAr: 'وصول كامل إلى API للتكاملات المخصصة',
    icon: '🔌',
    color: '#607D8B',
    category: 'integrations',
    isEnabled: true,
    isGlobalFeature: false,
    isBetaFeature: false,
    isPaidFeature: true,
    requiredTier: 'enterprise',
    config: {
      rateLimitPerHour: 10000,
      webhooksEnabled: true,
      apiKeyRotationEnabled: true,
    },
    defaultConfig: {
      rateLimitPerHour: 100,
      webhooksEnabled: false,
      apiKeyRotationEnabled: false,
    },
  },
  
  {
    feature: 'custom_templates',
    name: 'Custom Templates',
    nameAr: 'قوالب مخصصة',
    description: 'Create and customize email and message templates',
    descriptionAr: 'أنشئ وخصص قوالب البريد الإلكتروني والرسائل',
    icon: '📝',
    color: '#E91E63',
    category: 'templates',
    isEnabled: true,
    isGlobalFeature: false,
    isBetaFeature: false,
    isPaidFeature: true,
    requiredTier: 'basic',
    config: {
      maxTemplates: 50,
      customVariablesEnabled: true,
      htmlTemplatesEnabled: true,
    },
    defaultConfig: {
      maxTemplates: 10,
      customVariablesEnabled: false,
      htmlTemplatesEnabled: false,
    },
  },
  
  {
    feature: 'team_collaboration',
    name: 'Team Collaboration',
    nameAr: 'تعاون الفريق',
    description: 'Collaborate with team members on recruitment',
    descriptionAr: 'تعاون مع أعضاء الفريق في التوظيف',
    icon: '👥',
    color: '#3F51B5',
    category: 'ui',
    isEnabled: true,
    isGlobalFeature: false,
    isBetaFeature: true,
    isPaidFeature: true,
    requiredTier: 'pro',
    config: {
      maxTeamMembers: 20,
      roleBasedPermissions: true,
      activityLog: true,
    },
    defaultConfig: {
      maxTeamMembers: 3,
      roleBasedPermissions: false,
      activityLog: false,
    },
  },
];

async function seedFeatures() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing features
    await FeatureToggle.deleteMany({});
    console.log('🗑️  Cleared existing features');

    // Insert new features
    const result = await FeatureToggle.insertMany(features);
    console.log(`✅ Seeded ${result.length} feature toggles`);

    console.log('\n📋 Features created:');
    result.forEach(feature => {
      console.log(`   - ${feature.feature}: ${feature.name} [${feature.requiredTier}] ${feature.isEnabled ? '🟢' : '🔴'}`);
    });

    console.log('\n📊 Summary:');
    console.log(`   Total: ${result.length}`);
    console.log(`   Enabled: ${result.filter(f => f.isEnabled).length}`);
    console.log(`   Free: ${result.filter(f => f.requiredTier === 'free').length}`);
    console.log(`   Basic: ${result.filter(f => f.requiredTier === 'basic').length}`);
    console.log(`   Pro: ${result.filter(f => f.requiredTier === 'pro').length}`);
    console.log(`   Enterprise: ${result.filter(f => f.requiredTier === 'enterprise').length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding features:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedFeatures();
}

module.exports = { features, seedFeatures };
