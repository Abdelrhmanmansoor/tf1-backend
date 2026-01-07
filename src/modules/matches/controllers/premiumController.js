const premiumService = require('../services/premiumService');
const { asyncHandler } = require('../utils/errorHandler');

class PremiumController {
  /**
   * Get premium status
   */
  getStatus = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const status = await premiumService.getPremiumStatus(userId);

    res.status(200).json({
      success: true,
      data: status
    });
  });

  /**
   * Subscribe to premium
   */
  subscribe = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { plan = 'monthly' } = req.body;

    const result = await premiumService.activatePremium(userId, plan);

    res.status(200).json({
      success: true,
      message: 'Premium activated successfully!',
      data: result
    });
  });

  /**
   * Get premium usage stats
   */
  getUsage = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const usage = await premiumService.getPremiumUsage(userId);

    res.status(200).json({
      success: true,
      data: usage
    });
  });

  /**
   * Get available plans
   */
  getPlans = asyncHandler(async (req, res) => {
    const plans = premiumService.PREMIUM_PLANS;

    res.status(200).json({
      success: true,
      data: Object.values(plans)
    });
  });
}

module.exports = new PremiumController();

