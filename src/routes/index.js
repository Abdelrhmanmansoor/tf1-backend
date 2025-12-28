const express = require('express');
const authRoutes = require('../modules/auth/routes/auth.routes');
const playerRoutes = require('../modules/player/routes/player.routes');
const coachRoutes = require('../modules/coach/routes/coach.routes');
const clubRoutes = require('../modules/club/routes/club.routes');
const specialistRoutes = require('../modules/specialist/routes/specialist.routes');
const matchesRoutes = require('../modules/matches/routes');
const messageRoutes = require('./messages');
const searchRoutes = require('./search');
const notificationRoutes = require('./notifications');
const reviewRoutes = require('./reviews');
const globalRoutes = require('./global');
const jobsRoutes = require('./jobs');
const cvRoutes = require('../modules/cv/routes/cvRoutes');
const sportsAdminRoutes = require('./sportsAdmin');
const teamDashboardRoutes = require('./teamDashboard');
const clubApplicationsRoutes = require('./clubApplications');
const ownerRoutes = require('./owner');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/players', playerRoutes);
router.use('/coaches', coachRoutes);
router.use('/clubs', clubRoutes);
router.use('/specialists', specialistRoutes);
router.use('/matches', matchesRoutes);
router.use('/messages', messageRoutes);
router.use('/search', searchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reviews', reviewRoutes);
router.use('/global', globalRoutes);
router.use('/cv', cvRoutes);
router.use('/jobs', jobsRoutes);
router.use('/sports-admin', sportsAdminRoutes);
router.use('/team', teamDashboardRoutes);
router.use('/club/applications', clubApplicationsRoutes);
router.use('/clubs/applications', clubApplicationsRoutes); // Alias for club applications
router.use('/applications', jobsRoutes); // For /applications/my-applications endpoint

// Platform Owner System (Isolated)
router.use('/platform-control', ownerRoutes);

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TF1 Sports Platform API',
    version: process.env.API_VERSION || 'v1',
    timestamp: new Date().toISOString(),
    endpoints: {
      userEndpoints: {
        auth: '/auth',
        players: '/players',
        coaches: '/coaches',
        clubs: '/clubs',
        specialists: '/specialists',
        messages: '/messages',
        search: '/search',
        notifications: '/notifications',
        reviews: '/reviews',
        global: '/global',
        jobs: '/jobs',
        matches: '/matches',
        profile: '/profile'
      },
      administrativeEndpoints: {
        description: 'Separate leadership control panel - not for regular users',
        descriptionAr: 'لوحة تحكم القيادة المنفصلة - ليست للمستخدمين العاديين',
        sportsAdmin: '/sports-admin',
        team: '/team',
        settings: '/settings',
        administrativeOfficer: '/administrative-officer'
      },
      adminEndpoints: {
        admin: '/admin',
        administrator: '/administrator',
        ageGroupSupervisor: '/age-group-supervisor',
        sportsDirector: '/sports-director',
        executiveDirector: '/executive-director',
        secretary: '/secretary'
      },
      system: {
        health: '/health',
        settingsPublic: '/settings/public'
      }
    },
    features: [
      'Role-based authentication (Player, Coach, Club, Specialist)',
      'Email verification system',
      'Password reset functionality',
      'JWT-based session management',
      'Player profile management',
      'Coach profile management',
      'Coach availability & scheduling',
      'Earnings tracking & financial reports',
      'Club profile & facility management',
      'Team management & roster organization',
      'Event scheduling & attendance tracking',
      'Job posting & recruitment system',
      'Member management with role-based permissions',
      'Facility booking & reservation system',
      'Specialist profile management (Physiotherapy, Nutrition, Fitness, Psychology)',
      'Consultation booking & session management',
      'Client health tracking & progress monitoring',
      'Program creation & assignment system',
      'Advanced search and discovery',
      'Real-time messaging with Socket.io',
      'Group chats and direct conversations',
      'Message reactions and read receipts',
      'Typing indicators and online status',
      'File sharing and media attachments',
      'Global search across all entities',
      'Advanced filtering and sorting',
      'Autocomplete suggestions',
      'Search history tracking',
      'Saved searches with notifications',
      'Trending searches',
      'Real-time notification system',
      'Multi-channel notifications (in-app, email, push, SMS)',
      'Customizable notification preferences',
      'Quiet hours for notifications',
      'Priority-based notification delivery',
      'Notification grouping and categorization',
      'Comprehensive review & rating system',
      'Detailed ratings (professionalism, communication, expertise, punctuality, value)',
      'Review responses from service providers',
      'Helpful/not helpful voting on reviews',
      'Review moderation & reporting system',
      'Automatic rating statistics calculation',
      'File upload & media management (images, videos, documents)',
      'Media library with storage tracking',
      'Location services & geocoding',
      'Multilingual support (English & Arabic)',
      'User blocking system',
      'Content reporting & moderation',
      'Profile analytics & insights',
    ],
  });
});

module.exports = router;
