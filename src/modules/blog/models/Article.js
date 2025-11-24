const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
  {
    // === BASIC INFO ===
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title must not exceed 200 characters'],
      index: true,
    },
    titleAr: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },

    // === CONTENT ===
    content: {
      type: String,
      required: [true, 'Article content is required'],
      minlength: [100, 'Content must be at least 100 characters'],
    },
    contentAr: {
      type: String,
    },
    excerpt: {
      type: String,
      maxlength: [500, 'Excerpt must not exceed 500 characters'],
    },
    excerptAr: {
      type: String,
      maxlength: [500],
    },

    // === METADATA ===
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'sports_news',
        'training_tips',
        'nutrition',
        'injury_prevention',
        'player_spotlight',
        'coaching',
        'recruitment',
        'event_coverage',
        'other',
      ],
      default: 'other',
      index: true,
    },
    categoryAr: {
      type: String,
    },
    tags: [
      {
        type: String,
        lowercase: true,
      },
    ],

    // === IMAGES ===
    coverImage: {
      url: String,
      publicId: String,
    },
    thumbnail: {
      url: String,
    },

    // === PUBLISHING ===
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
    },

    // === ENGAGEMENT ===
    views: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        likedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        name: String,
        text: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // === FEATURED ===
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    featuredUntil: {
      type: Date,
    },

    // === SOFT DELETE ===
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },

    // === SEOو ===
    seoTitle: String,
    seoDescription: String,
    seoKeywords: [String],
  },
  {
    timestamps: true,
  }
);

// Generate slug from title
articleSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Increment views
articleSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Add like
articleSchema.methods.addLike = function(userId) {
  const alreadyLiked = this.likes.some(like => like.userId.toString() === userId.toString());
  if (!alreadyLiked) {
    this.likes.push({ userId });
  }
  return this.save();
};

// Remove like
articleSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.userId.toString() !== userId.toString());
  return this.save();
};

// Get published articles
articleSchema.statics.getPublished = function(filters = {}) {
  return this.find({
    isPublished: true,
    isDeleted: false,
    status: 'published',
    ...filters,
  })
    .sort({ publishedAt: -1 })
    .populate('author', 'firstName lastName profilePicture');
};

// Search articles
articleSchema.statics.search = function(query) {
  return this.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { content: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
    ],
    isPublished: true,
    isDeleted: false,
  });
};

module.exports = mongoose.model('Article', articleSchema);
