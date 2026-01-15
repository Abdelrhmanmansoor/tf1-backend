const mongoose = require('mongoose');

const messageThreadSchema = new mongoose.Schema(
  {
    // Thread Type
    type: {
      type: String,
      enum: ['job-application', 'interview', 'general', 'support'],
      required: true,
      default: 'job-application',
    },

    // Participants
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['applicant', 'publisher', 'interviewer', 'admin'],
        },
        name: String,
        avatar: String,
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        lastReadAt: Date,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Related Entities
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobApplication',
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      index: true,
    },

    // Thread Info
    subject: {
      type: String,
      trim: true,
    },
    subjectAr: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'closed'],
      default: 'active',
      index: true,
    },

    // Last Message (for quick access and sorting)
    lastMessage: {
      content: String,
      contentAr: String,
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      senderName: String,
      sentAt: Date,
      type: {
        type: String,
        enum: ['text', 'system', 'template', 'file'],
      },
    },

    // Unread Counts (per participant)
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    // Metadata
    isSystemThread: {
      type: Boolean,
      default: false, // Auto-created by system
    },
    autoMessagesEnabled: {
      type: Boolean,
      default: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    tags: [String],

    // Quick Access Data (denormalized for performance)
    applicantData: {
      name: String,
      email: String,
      phone: String,
      avatar: String,
    },
    jobData: {
      title: String,
      titleAr: String,
      position: String,
      companyName: String,
      status: String,
    },
    publisherData: {
      name: String,
      companyName: String,
      avatar: String,
    },

    // Settings
    settings: {
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      allowAttachments: {
        type: Boolean,
        default: true,
      },
    },

    // Archive/Close Info
    archivedAt: Date,
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    closedAt: Date,
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    closeReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
messageThreadSchema.index({ 'participants.userId': 1, status: 1 });
messageThreadSchema.index({ 'lastMessage.sentAt': -1 });
messageThreadSchema.index({ status: 1, updatedAt: -1 });
messageThreadSchema.index({ applicationId: 1 }, { unique: true, sparse: true });

// Virtuals

messageThreadSchema.virtual('messageCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'threadId',
  count: true,
});

// Statics

// Get threads for a user
messageThreadSchema.statics.getUserThreads = async function (
  userId,
  options = {}
) {
  const {
    page = 1,
    limit = 20,
    status = 'active',
    type,
    search,
  } = options;

  const query = {
    'participants.userId': userId,
    'participants.isActive': true,
  };

  if (status) {
    query.status = status;
  }

  if (type) {
    query.type = type;
  }

  if (search) {
    query.$or = [
      { subject: new RegExp(search, 'i') },
      { 'applicantData.name': new RegExp(search, 'i') },
      { 'jobData.title': new RegExp(search, 'i') },
    ];
  }

  const threads = await this.find(query)
    .sort({ isPinned: -1, 'lastMessage.sentAt': -1, updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await this.countDocuments(query);

  return {
    threads,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

// Find or create thread for application
messageThreadSchema.statics.findOrCreateForApplication = async function (
  applicationId,
  jobId,
  applicantId,
  publisherId
) {
  // Try to find existing thread
  let thread = await this.findOne({ applicationId });

  if (!thread) {
    // Get application and job data
    const JobApplication = mongoose.model('JobApplication');
    const Job = mongoose.model('Job');
    const User = mongoose.model('User');

    const [application, job, applicant, publisher] = await Promise.all([
      JobApplication.findById(applicationId).lean(),
      Job.findById(jobId).lean(),
      User.findById(applicantId).select('firstName lastName email phone avatar').lean(),
      User.findById(publisherId).select('firstName lastName companyName avatar').lean(),
    ]);

    if (!application || !job) {
      throw new Error('Application or Job not found');
    }

    // Create new thread
    thread = await this.create({
      type: 'job-application',
      applicationId,
      jobId,
      participants: [
        {
          userId: applicantId,
          role: 'applicant',
          name: `${applicant.firstName} ${applicant.lastName}`,
          avatar: applicant.avatar,
        },
        {
          userId: publisherId,
          role: 'publisher',
          name: publisher.companyName || `${publisher.firstName} ${publisher.lastName}`,
          avatar: publisher.avatar,
        },
      ],
      subject: `Application for ${job.title}`,
      subjectAr: job.titleAr ? `طلب التوظيف لوظيفة ${job.titleAr}` : null,
      isSystemThread: true,
      applicantData: {
        name: `${applicant.firstName} ${applicant.lastName}`,
        email: applicant.email,
        phone: applicant.phone,
        avatar: applicant.avatar,
      },
      jobData: {
        title: job.title,
        titleAr: job.titleAr,
        position: job.position || job.title,
        companyName: publisher.companyName,
        status: application.status,
      },
      publisherData: {
        name: publisher.companyName || `${publisher.firstName} ${publisher.lastName}`,
        companyName: publisher.companyName,
        avatar: publisher.avatar,
      },
    });
  }

  return thread;
};

// Get unread count for user
messageThreadSchema.statics.getUnreadCount = async function (userId) {
  const threads = await this.find({
    'participants.userId': userId,
    status: 'active',
  }).lean();

  let totalUnread = 0;
  threads.forEach(thread => {
    const count = thread.unreadCounts?.get(userId.toString()) || 0;
    totalUnread += count;
  });

  return totalUnread;
};

// Methods

// Add participant
messageThreadSchema.methods.addParticipant = function (userId, role, name, avatar) {
  const exists = this.participants.some(
    p => p.userId.toString() === userId.toString()
  );

  if (!exists) {
    this.participants.push({
      userId,
      role,
      name,
      avatar,
      joinedAt: new Date(),
    });
  }

  return this;
};

// Remove participant
messageThreadSchema.methods.removeParticipant = function (userId) {
  const participant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );

  if (participant) {
    participant.isActive = false;
  }

  return this;
};

// Update last message
messageThreadSchema.methods.updateLastMessage = function (message) {
  this.lastMessage = {
    content: message.content,
    contentAr: message.contentAr,
    senderId: message.senderId,
    senderName: message.senderName,
    sentAt: message.sentAt || new Date(),
    type: message.type || 'text',
  };

  // Increment unread count for other participants
  if (message.senderId) {
    this.participants.forEach(participant => {
      if (participant.userId.toString() !== message.senderId.toString()) {
        const userId = participant.userId.toString();
        const currentCount = this.unreadCounts.get(userId) || 0;
        this.unreadCounts.set(userId, currentCount + 1);
      }
    });
  }

  return this;
};

// Mark as read for user
messageThreadSchema.methods.markAsRead = function (userId) {
  const participant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );

  if (participant) {
    participant.lastReadAt = new Date();
  }

  // Reset unread count
  this.unreadCounts.set(userId.toString(), 0);

  return this;
};

// Archive thread
messageThreadSchema.methods.archive = function (userId) {
  this.status = 'archived';
  this.archivedAt = new Date();
  this.archivedBy = userId;
  return this;
};

// Close thread
messageThreadSchema.methods.close = function (userId, reason) {
  this.status = 'closed';
  this.closedAt = new Date();
  this.closedBy = userId;
  this.closeReason = reason;
  return this;
};

// Reopen thread
messageThreadSchema.methods.reopen = function () {
  this.status = 'active';
  this.closedAt = null;
  this.closedBy = null;
  this.archivedAt = null;
  this.archivedBy = null;
  return this;
};

// Toggle pin
messageThreadSchema.methods.togglePin = function () {
  this.isPinned = !this.isPinned;
  return this;
};

// Get unread count for specific user
messageThreadSchema.methods.getUnreadCountForUser = function (userId) {
  return this.unreadCounts.get(userId.toString()) || 0;
};

// Check if user is participant
messageThreadSchema.methods.isParticipant = function (userId) {
  return this.participants.some(
    p =>
      p.userId.toString() === userId.toString() &&
      p.isActive
  );
};

module.exports = mongoose.model('MessageThread', messageThreadSchema);
