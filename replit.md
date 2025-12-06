# SportX Platform - Full Stack Sports Platform

## Overview
SportX Platform is a comprehensive "LinkedIn for Sports" platform designed for the Middle East, specifically Saudi Arabia. It facilitates connections between players, coaches, clubs, and specialists (physiotherapists, nutritionists, fitness trainers, sports psychologists). The platform features robust user management with 11 distinct roles, a sophisticated Leader/Team Dashboard system for enterprise-grade management, and a granular Role-Based Access Control (RBAC) permission system. Key capabilities include a Match Hub for organizing and joining sports matches, a Jobs System for sports-related employment, and extensive site customization through a new Site Settings System. The platform aims to be a central hub for the sports community in the region.

## User Preferences
I prefer clear and concise explanations. When suggesting code changes, please provide examples and explain the rationale. I value iterative development and prefer to be consulted before major architectural decisions or significant code refactoring. Focus on maintaining a clean and modular codebase. Do not make changes to files or folders unless explicitly requested or if they are directly related to the task at hand.

## System Architecture
The SportX Platform is built as a full-stack application with a clear separation of concerns.

**UI/UX Decisions:**
- The frontend is developed using React with Vite for a fast development experience.
- Saudi Arabia's regional data (13 regions, cities, and neighborhoods) is deeply integrated into the UI for location-based filtering and profile creation.
- Profile forms are primarily dropdown-only to ensure data consistency and ease of input, minimizing free-text fields.
- The UI adapts dynamically based on user permissions, especially within the dual Leader/Team Dashboard system.
- Comprehensive site customization is available via the Site Settings System, allowing leaders to manage branding (logos, colors, typography), content (pages, announcements, banners, email templates), configuration (contact info, social media, feature toggles, SEO, navigation, localization), and security.

**Technical Implementations:**
- **Authentication System:** Supports 11 distinct user roles, JWT-based access and refresh tokens, and strict password policies. Features automatic token refresh.
- **Leader/Team Dashboard System:** Provides a dual-dashboard architecture. The Leader Dashboard offers full administrative control, including team management, audit log access, and global settings configuration. The Team Dashboard provides role-based limited access with dynamic navigation and activity tracking.
- **RBAC Permission System:** Implements granular, permission-by-permission control categorized by modules like Dashboard, Users, Jobs, Matches, Content, Settings, Reports, and System.
- **Audit Logging System:** Tracks all user actions, including IP, user-agent, previous/new values for changes, and severity levels, ensuring a comprehensive action history.
- **Match Hub:** Allows authenticated users to create, join, or browse public matches with advanced filtering capabilities (region, city, sport, level, date). Real-time updates for player counts and notifications for organizers.
- **Jobs System:** Enables browsing job listings, applying with resume uploads, receiving application notifications, and automatic email confirmations upon application submission.
- **Real-time Notifications:** Implemented using Socket.io for instant updates across the platform.
- **Email Service:** Automated email notifications on job application submission with HTML templates in Arabic, featuring applicant details, job info, and action links.

**System Design Choices:**
- **Backend:** Node.js with Express.js for RESTful APIs. MongoDB with Mongoose for data persistence.
- **Security:** Enhanced with Helmet for HTTP headers, express-rate-limit for API flood prevention, NoSQL injection prevention, request sanitization, and a robust RBAC system with audit logging.
- **Modularity:** The project structure is organized into `config`, `models`, `controllers`, `routes`, and `middleware` for clear separation of concerns and maintainability.
- **Data:** Extensive use of static JSON data (`saudiRegions.json`) for regional and sports-specific dropdown options.

## External Dependencies

**Backend:**
- **Node.js**: Server-side JavaScript runtime.
- **Express.js**: Web application framework for Node.js.
- **MongoDB**: NoSQL database.
- **Mongoose**: MongoDB object data modeling (ODM) library.
- **Socket.io**: Library for real-time, bidirectional, event-based communication.
- **jsonwebtoken (JWT)**: For secure authentication and authorization.
- **bcrypt**: For password hashing.
- **helmet**: Helps secure Express apps by setting various HTTP headers.
- **cors**: Middleware for enabling Cross-Origin Resource Sharing.
- **express-rate-limit**: Basic rate-limiting middleware for Express.
- **nodemailer**: Email sending service for transactional emails (application confirmations).

**Frontend:**
- **React**: JavaScript library for building user interfaces.
- **Vite**: Next-generation frontend tooling with middleware security for blocking sensitive paths (.git, .env, etc).
- **React Router**: For declarative routing in React applications.
- **Axios**: Promise-based HTTP client for the browser and Node.js.
- **Socket.io Client**: Client-side library for Socket.io.

## Recent Changes (December 6, 2025)
1. **Fixed Registration Code Validation** - Made registration code optional for regular users (player, coach, specialist, age-group-supervisor, secretary). Only required for administrative roles (club, admin, leader, sports-director, executive-director).
2. **Implemented Email Service** - Added `sendApplicationEmail()` to `src/utils/email.js` with automatic email notifications upon job application submission using existing SMTP configuration.
3. **Enhanced Job Application Flow** - Updated `applyToJob` controller to send HTML-formatted confirmation emails in Arabic and English with full application details.
4. **Frontend Security** - Added Vite middleware to block access to sensitive directories (.git, .env, node_modules).
5. **Club Dashboard** - Displays applicant names correctly and shows all applicant inputs (fullName, email, phone, sports experience, cover letter, resume).
6. **Email Integration** - Application emails now use the same proven SMTP transporter as verification emails, ensuring reliable delivery on production.