// Quick Test Script for Job Publisher System
// Run with: node test-job-publisher.js

const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

// Test Bearer Token (replace with real token)
const TOKEN = 'your_jwt_token_here';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Test functions
const tests = {
  // 1. Create Profile
  async createProfile() {
    console.log('\n📝 Test 1: Creating Job Publisher Profile...');
    try {
      const response = await api.post('/job-publisher/profile/create', {
        companyName: 'Tech Solutions Co.',
        industryType: 'technology',
        companySize: '51-200',
        websiteUrl: 'https://techsolutions.com',
        businessRegistrationNumber: '1234567890',
        nationalAddress: {
          buildingNumber: '123',
          additionalNumber: '456',
          zipCode: '12345',
          city: 'الرياض'
        },
        representativeName: 'محمد أحمد',
        representativeTitle: 'hr_manager',
        representativePhone: '+966501234567',
        representativeEmail: 'hr@techsolutions.com',
        companyDescription: 'نحن متخصصون في حلول التكنولوجيا...',
        companyValues: ['الابتكار', 'الجودة']
      });
      console.log('✅ Profile Created:', response.data.profile.companyName);
      return response.data.profile._id;
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }
  },

  // 2. Get Profile
  async getProfile() {
    console.log('\n📖 Test 2: Fetching Job Publisher Profile...');
    try {
      const response = await api.get('/job-publisher/profile');
      console.log('✅ Profile Retrieved:', {
        company: response.data.profile.companyName,
        complete: response.data.profile.isProfileComplete,
        status: response.data.profile.profileVerificationStatus
      });
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }
  },

  // 3. Get Applications
  async getApplications() {
    console.log('\n📋 Test 3: Fetching All Applications...');
    try {
      const response = await api.get('/job-publisher/applications');
      console.log('✅ Applications Retrieved:', {
        total: response.data.statistics.totalApplications,
        new: response.data.statistics.new,
        underReview: response.data.statistics.under_review,
        interviewed: response.data.statistics.interviewed,
        offered: response.data.statistics.offered,
        rejected: response.data.statistics.rejected
      });
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }
  },

  // 4. Get Dashboard Stats
  async getDashboardStats() {
    console.log('\n📊 Test 4: Fetching Dashboard Statistics...');
    try {
      const response = await api.get('/job-publisher/dashboard/stats');
      console.log('✅ Statistics Retrieved:', {
        jobs: response.data.statistics.jobs,
        applications: response.data.statistics.applications
      });
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }
  },

  // 5. Get Notifications
  async getNotifications() {
    console.log('\n🔔 Test 5: Fetching Notifications...');
    try {
      const response = await api.get('/notifications?limit=10');
      console.log('✅ Notifications Retrieved:', {
        total: response.data.notifications.length,
        unread: response.data.unreadCount,
        types: response.data.notifications.map(n => n.type)
      });
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }
  },

  // 6. Update Application Status
  async updateApplicationStatus(applicationId) {
    console.log('\n🔄 Test 6: Updating Application Status...');
    try {
      const response = await api.put(
        `/job-publisher/applications/${applicationId}/status`,
        {
          status: 'under_review',
          message: 'شكراً على تطبيقك! جاري مراجعة ملفك الآن.'
        }
      );
      console.log('✅ Status Updated:', {
        applicationId: response.data.application._id,
        newStatus: response.data.application.status
      });
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }
  },

  // 7. Start Conversation
  async startConversation(applicationId) {
    console.log('\n💬 Test 7: Starting Conversation...');
    try {
      const response = await api.post(
        `/messages/conversation/${applicationId}`,
        { subject: 'مناقشة الوظيفة' }
      );
      console.log('✅ Conversation Started:', {
        conversationId: response.data.conversation._id,
        participants: response.data.conversation.participants.length
      });
      return response.data.conversation._id;
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }
  },

  // 8. Send Message
  async sendMessage(conversationId) {
    console.log('\n📧 Test 8: Sending Message...');
    try {
      const response = await api.post('/messages/send', {
        conversationId,
        content: 'مرحباً! تم اختيارك للمقابلة الشخصية. يرجى تأكيد موعد المقابلة.'
      });
      console.log('✅ Message Sent:', {
        messageId: response.data.message._id,
        content: response.data.message.content.substring(0, 50) + '...'
      });
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }
  },

  // 9. Mark Notification as Read
  async markNotificationAsRead(notificationId) {
    console.log('\n✓ Test 9: Marking Notification as Read...');
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      console.log('✅ Notification Marked as Read:', {
        notificationId: response.data.notification._id,
        isRead: response.data.notification.isRead
      });
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }
  }
};

// Run all tests
async function runTests() {
  console.log('🚀 Starting Job Publisher System Tests...\n');
  console.log('='.repeat(60));

  try {
    await tests.createProfile();
    await tests.getProfile();
    await tests.getDashboardStats();
    await tests.getApplications();
    await tests.getNotifications();
    
    // If you have specific IDs:
    // const applicationId = 'your_app_id_here';
    // await tests.updateApplicationStatus(applicationId);
    // const conversationId = await tests.startConversation(applicationId);
    // if (conversationId) await tests.sendMessage(conversationId);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!\n');
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Export for use in other modules
module.exports = { api, tests };

// Run if executed directly
if (require.main === module) {
  runTests();
}
