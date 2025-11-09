const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');

// ===================================
// MAIN SEARCH ENDPOINTS
// ===================================

/**
 * @route   GET /api/v1/search/users
 * @desc    Search users (all roles)
 * @access  Public
 * @query   q, role, sport, location, minRating, verified, etc.
 */
router.get('/users', searchController.searchUsers);

/**
 * @route   GET /api/v1/search/coaches
 * @desc    Search coaches only
 * @access  Public
 * @query   q, sport, specialization, location, minRating, maxPrice, etc.
 */
router.get('/coaches', searchController.searchCoaches);

/**
 * @route   GET /api/v1/search/players
 * @desc    Search players only
 * @access  Public
 * @query   q, sport, position, level, location, ageMin, ageMax
 */
router.get('/players', searchController.searchPlayers);

/**
 * @route   GET /api/v1/search/players/top-rated
 * @desc    Get top rated players (top 3 by default)
 * @access  Public
 * @query   limit (optional, default: 3), sport (optional), minReviews (optional, default: 1)
 */
router.get('/players/top-rated', searchController.getTopRatedPlayers);

/**
 * @route   GET /api/v1/search/specialists
 * @desc    Search specialists only
 * @access  Public
 * @query   q, specialization, sport, location, minRating, language
 */
router.get('/specialists', searchController.searchSpecialists);

/**
 * @route   GET /api/v1/search/clubs
 * @desc    Search clubs
 * @access  Public
 * @query   q, sport, location, verified, organizationType, minRating, hasOpenPositions
 */
router.get('/clubs', searchController.searchClubs);

/**
 * @route   GET /api/v1/search/jobs
 * @desc    Search jobs/opportunities
 * @access  Public
 * @query   q, role, sport, location, jobType, salaryMin, salaryMax, postedWithin
 */
router.get('/jobs', searchController.searchJobs);

/**
 * @route   GET /api/v1/search/jobs/recent
 * @desc    Get recent jobs (last 3 by default)
 * @access  Public
 * @query   limit (optional, default: 3)
 */
router.get('/jobs/recent', searchController.getRecentJobs);

/**
 * @route   GET /api/v1/search/all
 * @desc    Global search (all entities)
 * @access  Public
 * @query   q (required)
 */
router.get('/all', searchController.searchAll);

// ===================================
// AUTOCOMPLETE & SUGGESTIONS
// ===================================

/**
 * @route   GET /api/v1/search/autocomplete
 * @desc    Get autocomplete suggestions
 * @access  Public
 * @query   q (search query)
 */
router.get('/autocomplete', searchController.autocomplete);

/**
 * @route   GET /api/v1/search/trending
 * @desc    Get trending/popular searches
 * @access  Public
 * @query   type (optional), limit
 */
router.get('/trending', searchController.getTrendingSearches);

// ===================================
// SEARCH HISTORY (Requires Auth)
// ===================================

/**
 * @route   GET /api/v1/search/history
 * @desc    Get user's search history
 * @access  Private
 * @query   limit
 */
router.get('/history', authenticate, searchController.getSearchHistory);

/**
 * @route   DELETE /api/v1/search/history
 * @desc    Clear search history
 * @access  Private
 */
router.delete('/history', authenticate, searchController.clearSearchHistory);

// ===================================
// SAVED SEARCHES (Requires Auth)
// ===================================

/**
 * @route   POST /api/v1/search/saved
 * @desc    Save a search
 * @access  Private
 */
router.post('/saved', authenticate, searchController.saveSearch);

/**
 * @route   GET /api/v1/search/saved
 * @desc    Get saved searches
 * @access  Private
 */
router.get('/saved', authenticate, searchController.getSavedSearches);

/**
 * @route   DELETE /api/v1/search/saved/:id
 * @desc    Delete saved search
 * @access  Private
 */
router.delete('/saved/:id', authenticate, searchController.deleteSavedSearch);

module.exports = router;
