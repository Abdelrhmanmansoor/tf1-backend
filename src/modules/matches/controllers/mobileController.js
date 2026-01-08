const mobileService = require('../services/mobileService');
const { asyncHandler } = require('../utils/errorHandler');

class MobileController {
  /**
   * Register device for push notifications
   */
  registerDevice = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { device_token, platform } = req.body;

    if (!device_token || !platform) {
      return res.status(400).json({
        success: false,
        message: 'device_token and platform are required'
      });
    }

    const device = await mobileService.registerDevice(userId, device_token, platform);

    res.status(200).json({
      success: true,
      message: 'Device registered successfully',
      data: device
    });
  });

  /**
   * Get mobile dashboard
   */
  getDashboard = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const dashboard = await mobileService.getMobileDashboard(userId);

    res.status(200).json({
      success: true,
      data: dashboard
    });
  });

  /**
   * Get mobile-optimized match
   */
  getMatch = asyncHandler(async (req, res) => {
    const { matchId } = req.params;
    const match = await mobileService.getMobileMatch(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.status(200).json({
      success: true,
      data: match
    });
  });

  /**
   * Track app event
   */
  trackEvent = asyncHandler(async (req, res) => {
    const userId = req.matchUser?._id;
    const { event, data } = req.body;

    if (!event) {
      return res.status(400).json({
        success: false,
        message: 'event name is required'
      });
    }

    await mobileService.trackAppEvent(userId, event, data);

    res.status(200).json({
      success: true,
      message: 'Event tracked'
    });
  });

  /**
   * Get app configuration
   */
  getConfig = asyncHandler(async (req, res) => {
    const config = await mobileService.getAppConfig();

    res.status(200).json({
      success: true,
      data: config
    });
  });
}

module.exports = new MobileController();


