const express = require('express');
const router = express.Router();
const Location = require('../models/Location');

router.get('/', async (req, res) => {
  try {
    const { level, parent_id, limit = '500', page = '1' } = req.query;
    const query = {};
    if (level) query.level = level;
    if (parent_id) query.parent_id = parent_id;

    const skip = Math.max((parseInt(page) - 1) * parseInt(limit), 0);
    const [items, total] = await Promise.all([
      Location.find(query).sort({ name_ar: 1 }).skip(skip).limit(parseInt(limit)),
      Location.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: items.map(l => ({
        id: l._id,
        parent_id: l.parent_id,
        level: l.level,
        code: l.code,
        name_ar: l.name_ar,
        name_en: l.name_en,
        slug: l.slug
      })),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching locations',
      error: error.message
    });
  }
});

module.exports = router;
