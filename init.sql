-- Initial Database Setup for CV System
-- This script is run when PostgreSQL container starts

-- Create database if not exists (optional, usually done by Docker)
-- CREATE DATABASE sportsplatform_cv;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create templates
INSERT INTO "Template" (id, name, "displayName", description, category, format, version, "defaultTheme", "isActive", "createdAt", "updatedAt", sections) VALUES
('awesome-cv', 'AwesomeCV', 'Awesome CV', 'Professional and modern CV template based on LaTeX', 'modern', 'latex', '1.0.0', 'blue', true, NOW(), NOW(), '["personalInfo", "summary", "experience", "education", "skills"]'),
('modern-cv', 'ModernCV', 'Modern CV', 'Clean and contemporary resume template', 'modern', 'latex', '1.0.0', 'blue', true, NOW(), NOW(), '["personalInfo", "summary", "experience", "education", "skills"]'),
('classic', 'ClassicResume', 'Classic Resume', 'Traditional and timeless resume layout', 'classic', 'html', '1.0.0', 'gray', true, NOW(), NOW(), '["personalInfo", "summary", "experience", "education", "skills"]'),
('minimal', 'Minimal', 'Minimal', 'Minimalist resume with focus on content', 'minimal', 'html', '1.0.0', 'black', true, NOW(), NOW(), '["personalInfo", "summary", "experience", "education", "skills"]'),
('creative', 'Creative', 'Creative CV', 'Creative and unique resume layout', 'creative', 'html', '1.0.0', 'blue', true, NOW(), NOW(), '["personalInfo", "summary", "experience", "education", "skills"]'),
('simple', 'SimpleResume', 'Simple Resume', 'Simple and straightforward resume template', 'classic', 'html', '1.0.0', 'gray', true, NOW(), NOW(), '["personalInfo", "experience", "education", "skills"]'),
('elegant', 'Elegant', 'Elegant CV', 'Sophisticated and elegant resume layout', 'modern', 'latex', '1.0.0', 'blue', true, NOW(), NOW(), '["personalInfo", "summary", "experience", "education", "skills"]'),
('tech', 'TechResume', 'Tech Resume', 'Resume template optimized for tech professionals', 'modern', 'html', '1.0.0', 'blue', true, NOW(), NOW(), '["personalInfo", "summary", "experience", "education", "skills", "projects"]'),
('executive', 'ExecutiveCV', 'Executive CV', 'Professional executive resume template', 'classic', 'latex', '1.0.0', 'gray', true, NOW(), NOW(), '["personalInfo", "summary", "experience", "education", "skills"]');

-- Create color schemes
INSERT INTO "ColorScheme" (id, name, "displayName", primary, secondary, accent, background, text, "lightGray", "darkGray", "isActive", "createdAt") VALUES
('blue', 'Blue', 'Blue Scheme', '#1E40AF', '#3B82F6', '#60A5FA', '#FFFFFF', '#1F2937', '#F3F4F6', '#6B7280', true, NOW()),
('red', 'Red', 'Red Scheme', '#991B1B', '#DC2626', '#F87171', '#FFFFFF', '#1F2937', '#F3F4F6', '#6B7280', true, NOW()),
('green', 'Green', 'Green Scheme', '#15803D', '#22C55E', '#84CC16', '#FFFFFF', '#1F2937', '#F3F4F6', '#6B7280', true, NOW()),
('purple', 'Purple', 'Purple Scheme', '#6B21A8', '#A855F7', '#D8B4FE', '#FFFFFF', '#1F2937', '#F3F4F6', '#6B7280', true, NOW()),
('gray', 'Gray', 'Gray Scheme', '#374151', '#6B7280', '#9CA3AF', '#FFFFFF', '#111827', '#F3F4F6', '#4B5563', true, NOW()),
('black', 'Black', 'Black Scheme', '#000000', '#1F2937', '#404040', '#FFFFFF', '#000000', '#F3F4F6', '#1F2937', true, NOW()),
('teal', 'Teal', 'Teal Scheme', '#0D9488', '#14B8A6', '#2DD4BF', '#FFFFFF', '#1F2937', '#F3F4F6', '#6B7280', true, NOW()),
('orange', 'Orange', 'Orange Scheme', '#EA580C', '#F97316', '#FDBA74', '#FFFFFF', '#1F2937', '#F3F4F6', '#6B7280', true, NOW());

-- Create parser configurations
INSERT INTO "ParserConfig" (id, name, "displayName", description, version, "supportedFormats", "isActive", "minConfidenceScore", "createdAt", "updatedAt", "inputSchema", "outputSchema") VALUES
('json-resume', 'JSONResume', 'JSON Resume Parser', 'Parse JSON Resume standard format', '1.0.0', '["json"]', true, 0.8, NOW(), NOW(), '{}', '{}'),
('yaml-parser', 'YAMLParser', 'YAML Parser', 'Parse YAML formatted resume data', '1.0.0', '["yaml", "yml"]', true, 0.8, NOW(), NOW(), '{}', '{}'),
('linkedin-parser', 'LinkedInParser', 'LinkedIn Parser', 'Parse LinkedIn exported resume data', '1.0.0', '["pdf", "html"]', true, 0.75, NOW(), NOW(), '{}', '{}'),
('csv-parser', 'CSVParser', 'CSV Parser', 'Parse CSV formatted resume data', '1.0.0', '["csv"]', true, 0.7, NOW(), NOW(), '{}', '{}');

-- Create feature flags
INSERT INTO "FeatureFlag" (id, key, description, "isEnabled", "enabledForPercentage", "createdAt", "updatedAt") VALUES
('ff-cv-ai', 'enable_cv_ai_features', 'Enable AI-powered CV features', true, 100, NOW(), NOW()),
('ff-cv-public', 'enable_cv_public_profiles', 'Enable public CV profiles', true, 100, NOW(), NOW()),
('ff-cv-analytics', 'enable_cv_analytics', 'Enable CV analytics and tracking', true, 100, NOW(), NOW()),
('ff-cv-import', 'enable_cv_import', 'Enable CV import functionality', true, 100, NOW(), NOW()),
('ff-cv-versioning', 'enable_cv_versioning', 'Enable CV version control', true, 100, NOW(), NOW());

-- Create system settings
INSERT INTO "SystemSetting" (id, key, value, description, type, "updatedAt") VALUES
('set-max-file-size', 'cv_max_file_size', '10485760', 'Maximum CV file size in bytes (10MB)', 'NUMBER', NOW()),
('set-pdf-timeout', 'pdf_render_timeout', '30000', 'PDF render timeout in milliseconds', 'NUMBER', NOW()),
('set-storage-type', 'storage_type', 'local', 'Storage type: local, s3, cloudinary', 'STRING', NOW()),
('set-log-level', 'log_level', 'info', 'Application log level: debug, info, warn, error', 'STRING', NOW());

-- Create initial user for testing (optional)
INSERT INTO "User" (id, email, name, role, status, "isEmailVerified", "createdAt", "updatedAt") VALUES
('test-user-1', 'testuser@example.com', 'Test User', 'APPLICANT', 'ACTIVE', true, NOW(), NOW());

-- Create a sample CV for testing (optional)
INSERT INTO "CV" (id, "userId", title, slug, template, "templateVersion", "colorScheme", "isPublic", "createdAt", "updatedAt") VALUES
('cv-test-1', 'test-user-1', 'Test Resume', 'test-resume-slug', 'AwesomeCV', '1.0.0', 'blue', false, NOW(), NOW());

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS "idx_cv_title_summary_fulltext" ON "CV" USING GIN (to_tsvector('english', title || ' ' || COALESCE(summary, '')));

COMMIT;
