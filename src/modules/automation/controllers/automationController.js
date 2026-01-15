const AutomationRule = require('../models/AutomationRule');
const automationEngine = require('../services/automationEngine');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');

/**
 * @route   GET /api/v1/publisher/automations/rules
 * @desc    Get automation rules for publisher
 * @access  Private (Publisher)
 */
exports.getRules = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { page = 1, limit = 20, isActive, category } = req.query;

  const query = {
    publisherId,
    isTemplate: false,
  };

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (category) {
    query['trigger.event'] = new RegExp(category, 'i');
  }

  const rules = await AutomationRule.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  const total = await AutomationRule.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      rules,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * @route   GET /api/v1/publisher/automations/rules/:id
 * @desc    Get single automation rule
 * @access  Private (Publisher)
 */
exports.getRule = catchAsync(async (req, res) => {
  const { id } = req.params;
  const publisherId = req.user._id;

  const rule = await AutomationRule.findOne({
    _id: id,
    publisherId,
  });

  if (!rule) {
    throw new AppError('Automation rule not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      rule,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/automations/rules
 * @desc    Create automation rule
 * @access  Private (Publisher)
 */
exports.createRule = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const ruleData = req.body;

  const rule = await AutomationRule.create({
    ...ruleData,
    publisherId,
    createdBy: publisherId,
  });

  logger.info(`Automation rule ${rule._id} created by publisher ${publisherId}`);

  res.status(201).json({
    success: true,
    message: 'Automation rule created successfully',
    data: {
      rule,
    },
  });
});

/**
 * @route   PATCH /api/v1/publisher/automations/rules/:id
 * @desc    Update automation rule
 * @access  Private (Publisher)
 */
exports.updateRule = catchAsync(async (req, res) => {
  const { id } = req.params;
  const publisherId = req.user._id;
  const updateData = req.body;

  const rule = await AutomationRule.findOne({
    _id: id,
    publisherId,
  });

  if (!rule) {
    throw new AppError('Automation rule not found', 404);
  }

  // Update allowed fields
  const allowedFields = [
    'name',
    'nameAr',
    'description',
    'descriptionAr',
    'trigger',
    'actions',
    'priority',
    'limits',
  ];

  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      rule[field] = updateData[field];
    }
  });

  rule.updatedBy = publisherId;
  await rule.save();

  logger.info(`Automation rule ${id} updated by publisher ${publisherId}`);

  res.status(200).json({
    success: true,
    message: 'Automation rule updated successfully',
    data: {
      rule,
    },
  });
});

/**
 * @route   DELETE /api/v1/publisher/automations/rules/:id
 * @desc    Delete automation rule
 * @access  Private (Publisher)
 */
exports.deleteRule = catchAsync(async (req, res) => {
  const { id } = req.params;
  const publisherId = req.user._id;

  const rule = await AutomationRule.findOne({
    _id: id,
    publisherId,
  });

  if (!rule) {
    throw new AppError('Automation rule not found', 404);
  }

  await rule.deleteOne();

  logger.info(`Automation rule ${id} deleted by publisher ${publisherId}`);

  res.status(200).json({
    success: true,
    message: 'Automation rule deleted successfully',
  });
});

/**
 * @route   POST /api/v1/publisher/automations/rules/:id/toggle
 * @desc    Toggle automation rule active status
 * @access  Private (Publisher)
 */
exports.toggleRule = catchAsync(async (req, res) => {
  const { id } = req.params;
  const publisherId = req.user._id;

  const rule = await AutomationRule.findOne({
    _id: id,
    publisherId,
  });

  if (!rule) {
    throw new AppError('Automation rule not found', 404);
  }

  rule.toggle();
  await rule.save();

  logger.info(
    `Automation rule ${id} ${rule.isActive ? 'enabled' : 'disabled'} by publisher ${publisherId}`
  );

  res.status(200).json({
    success: true,
    message: `Automation rule ${rule.isActive ? 'enabled' : 'disabled'} successfully`,
    data: {
      rule,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/automations/test
 * @desc    Test automation rule (dry run)
 * @access  Private (Publisher)
 */
exports.testRule = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { ruleId, testData } = req.body;

  if (!ruleId) {
    throw new AppError('Rule ID is required', 400);
  }

  if (!testData) {
    throw new AppError('Test data is required', 400);
  }

  // Verify rule belongs to publisher
  const rule = await AutomationRule.findOne({
    _id: ruleId,
    publisherId,
  });

  if (!rule) {
    throw new AppError('Automation rule not found', 404);
  }

  const result = await automationEngine.testRule(ruleId, testData);

  res.status(200).json({
    success: true,
    message: 'Test completed',
    data: result,
  });
});

/**
 * @route   GET /api/v1/publisher/automations/logs
 * @desc    Get automation execution logs
 * @access  Private (Publisher)
 */
exports.getLogs = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { page = 1, limit = 50, ruleId } = req.query;

  const query = {
    publisherId,
  };

  if (ruleId) {
    query._id = ruleId;
  }

  const rules = await AutomationRule.find(query)
    .select('name recentLogs executionCount successCount failureCount')
    .lean();

  // Flatten recent logs from all rules
  const allLogs = [];
  rules.forEach(rule => {
    if (rule.recentLogs && rule.recentLogs.length > 0) {
      rule.recentLogs.forEach(log => {
        allLogs.push({
          ...log,
          ruleName: rule.name,
          ruleId: rule._id,
        });
      });
    }
  });

  // Sort by execution time
  allLogs.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

  // Paginate
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedLogs = allLogs.slice(startIndex, endIndex);

  res.status(200).json({
    success: true,
    data: {
      logs: paginatedLogs,
      pagination: {
        total: allLogs.length,
        page: parseInt(page),
        pages: Math.ceil(allLogs.length / limit),
      },
    },
  });
});

/**
 * @route   GET /api/v1/publisher/automations/templates
 * @desc    Get system automation templates
 * @access  Private (Publisher)
 */
exports.getTemplates = catchAsync(async (req, res) => {
  const templates = await AutomationRule.getTemplates();

  res.status(200).json({
    success: true,
    data: {
      templates,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/automations/templates/:id/clone
 * @desc    Clone system template for publisher
 * @access  Private (Publisher)
 */
exports.cloneTemplate = catchAsync(async (req, res) => {
  const { id } = req.params;
  const publisherId = req.user._id;

  const template = await AutomationRule.findOne({
    _id: id,
    isTemplate: true,
  });

  if (!template) {
    throw new AppError('Template not found', 404);
  }

  const clonedRule = await template.cloneForPublisher(publisherId);

  logger.info(`Template ${id} cloned for publisher ${publisherId}`);

  res.status(201).json({
    success: true,
    message: 'Template cloned successfully',
    data: {
      rule: clonedRule,
    },
  });
});

/**
 * @route   GET /api/v1/publisher/automations/statistics
 * @desc    Get automation statistics for publisher
 * @access  Private (Publisher)
 */
exports.getStatistics = catchAsync(async (req, res) => {
  const publisherId = req.user._id;

  const stats = await AutomationRule.getStatistics(publisherId);

  // Calculate success rate
  if (stats.totalExecutions > 0) {
    stats.successRate = ((stats.totalSuccesses / stats.totalExecutions) * 100).toFixed(2);
  } else {
    stats.successRate = 0;
  }

  res.status(200).json({
    success: true,
    data: {
      statistics: stats,
    },
  });
});

module.exports = exports;
