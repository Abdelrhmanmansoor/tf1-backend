const { Meeting, Document, Task } = require('../models/admin');
const Message = require('../models/Message');
const User = require('../modules/shared/models/User');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const clubId = req.user.clubId || req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayMeetings,
      pendingDocuments,
      unreadMessages,
      tasksToday,
      scheduledEvents
    ] = await Promise.all([
      Meeting.countDocuments({
        clubId,
        date: { $gte: today, $lt: tomorrow },
        isDeleted: { $ne: true }
      }),
      Document.countDocuments({
        clubId,
        status: 'pending',
        isDeleted: { $ne: true }
      }),
      Message.countDocuments({
        receiver: userId,
        isRead: false
      }),
      Task.countDocuments({
        assignedTo: userId,
        dueDate: { $gte: today, $lt: tomorrow },
        status: { $ne: 'completed' },
        isDeleted: { $ne: true }
      }),
      Meeting.countDocuments({
        clubId,
        date: { $gte: new Date() },
        status: 'scheduled',
        isDeleted: { $ne: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          todayMeetings,
          pendingDocuments,
          unreadMessages,
          upcomingCalls: 0,
          tasksToday,
          scheduledEvents
        }
      }
    });
  } catch (error) {
    console.error('Secretary dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Error fetching dashboard data',
        messageAr: 'خطأ في جلب بيانات لوحة التحكم'
      }
    });
  }
};

exports.getCalendar = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { startDate, endDate } = req.query;

    const query = { clubId, isDeleted: { $ne: true } };
    if (startDate) query.date = { $gte: new Date(startDate) };
    if (endDate) query.date = { ...query.date, $lte: new Date(endDate) };

    const meetings = await Meeting.find(query)
      .sort({ date: 1, time: 1 });

    res.json({
      success: true,
      data: { meetings }
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_CALENDAR_ERROR',
        message: 'Error fetching calendar',
        messageAr: 'خطأ في جلب التقويم'
      }
    });
  }
};

exports.getMeetings = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { status } = req.query;

    const query = { clubId, isDeleted: { $ne: true } };
    if (status) query.status = status;

    const meetings = await Meeting.find(query)
      .populate('organizer', 'firstName lastName')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: { meetings }
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_MEETINGS_ERROR',
        message: 'Error fetching meetings',
        messageAr: 'خطأ في جلب الاجتماعات'
      }
    });
  }
};

exports.createMeeting = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const meetingData = {
      ...req.body,
      clubId,
      organizer: req.user._id,
      organizerName: `${req.user.firstName} ${req.user.lastName}`,
      createdBy: req.user._id
    };

    const meeting = await Meeting.create(meetingData);

    res.status(201).json({
      success: true,
      data: meeting,
      message: 'Meeting created successfully',
      messageAr: 'تم إنشاء الاجتماع بنجاح'
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_MEETING_ERROR',
        message: 'Error creating meeting',
        messageAr: 'خطأ في إنشاء الاجتماع'
      }
    });
  }
};

exports.getMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('organizer', 'firstName lastName email')
      .populate('attendees.userId', 'firstName lastName email');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
          messageAr: 'الاجتماع غير موجود'
        }
      });
    }

    res.json({
      success: true,
      data: meeting
    });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_MEETING_ERROR',
        message: 'Error fetching meeting',
        messageAr: 'خطأ في جلب الاجتماع'
      }
    });
  }
};

exports.updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
          messageAr: 'الاجتماع غير موجود'
        }
      });
    }

    res.json({
      success: true,
      data: meeting,
      message: 'Meeting updated successfully',
      messageAr: 'تم تحديث الاجتماع بنجاح'
    });
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_MEETING_ERROR',
        message: 'Error updating meeting',
        messageAr: 'خطأ في تحديث الاجتماع'
      }
    });
  }
};

exports.deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
          messageAr: 'الاجتماع غير موجود'
        }
      });
    }

    res.json({
      success: true,
      message: 'Meeting deleted successfully',
      messageAr: 'تم حذف الاجتماع بنجاح'
    });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_MEETING_ERROR',
        message: 'Error deleting meeting',
        messageAr: 'خطأ في حذف الاجتماع'
      }
    });
  }
};

exports.sendMeetingInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const { attendeeIds, message, messageAr } = req.body;

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
          messageAr: 'الاجتماع غير موجود'
        }
      });
    }

    const users = await User.find({ _id: { $in: attendeeIds } });
    
    for (const user of users) {
      const existingAttendee = meeting.attendees.find(
        a => a.userId?.toString() === user._id.toString()
      );
      
      if (!existingAttendee) {
        meeting.attendees.push({
          userId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          status: 'pending'
        });
      }
    }

    await meeting.save();

    res.json({
      success: true,
      message: 'Invitations sent successfully',
      messageAr: 'تم إرسال الدعوات بنجاح'
    });
  } catch (error) {
    console.error('Send meeting invite error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEND_INVITE_ERROR',
        message: 'Error sending invitations',
        messageAr: 'خطأ في إرسال الدعوات'
      }
    });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { type, status, category } = req.query;

    const query = { clubId, isDeleted: { $ne: true } };
    if (type) query.type = type;
    if (status) query.status = status;
    if (category) query.category = category;

    const documents = await Document.find(query)
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { documents }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_DOCUMENTS_ERROR',
        message: 'Error fetching documents',
        messageAr: 'خطأ في جلب المستندات'
      }
    });
  }
};

exports.createDocument = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const documentData = {
      ...req.body,
      clubId,
      createdBy: req.user._id
    };

    const document = await Document.create(documentData);

    res.status(201).json({
      success: true,
      data: document,
      message: 'Document created successfully',
      messageAr: 'تم إنشاء المستند بنجاح'
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_DOCUMENT_ERROR',
        message: 'Error creating document',
        messageAr: 'خطأ في إنشاء المستند'
      }
    });
  }
};

exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          messageAr: 'المستند غير موجود'
        }
      });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_DOCUMENT_ERROR',
        message: 'Error fetching document',
        messageAr: 'خطأ في جلب المستند'
      }
    });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          messageAr: 'المستند غير موجود'
        }
      });
    }

    res.json({
      success: true,
      data: document,
      message: 'Document updated successfully',
      messageAr: 'تم تحديث المستند بنجاح'
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_DOCUMENT_ERROR',
        message: 'Error updating document',
        messageAr: 'خطأ في تحديث المستند'
      }
    });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          messageAr: 'المستند غير موجود'
        }
      });
    }

    res.json({
      success: true,
      message: 'Document deleted successfully',
      messageAr: 'تم حذف المستند بنجاح'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_DOCUMENT_ERROR',
        message: 'Error deleting document',
        messageAr: 'خطأ في حذف المستند'
      }
    });
  }
};

exports.submitDocument = async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { status: 'pending' },
      { new: true }
    );

    res.json({
      success: true,
      data: document,
      message: 'Document submitted for approval',
      messageAr: 'تم تقديم المستند للموافقة'
    });
  } catch (error) {
    console.error('Submit document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SUBMIT_DOCUMENT_ERROR',
        message: 'Error submitting document',
        messageAr: 'خطأ في تقديم المستند'
      }
    });
  }
};

exports.approveDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          messageAr: 'المستند غير موجود'
        }
      });
    }

    document.status = 'approved';
    document.approvalWorkflow.push({
      approver: req.user._id,
      approverName: `${req.user.firstName} ${req.user.lastName}`,
      status: 'approved',
      date: new Date()
    });

    await document.save();

    res.json({
      success: true,
      data: document,
      message: 'Document approved',
      messageAr: 'تم اعتماد المستند'
    });
  } catch (error) {
    console.error('Approve document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'APPROVE_DOCUMENT_ERROR',
        message: 'Error approving document',
        messageAr: 'خطأ في اعتماد المستند'
      }
    });
  }
};

exports.rejectDocument = async (req, res) => {
  try {
    const { comments } = req.body;
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          messageAr: 'المستند غير موجود'
        }
      });
    }

    document.status = 'rejected';
    document.approvalWorkflow.push({
      approver: req.user._id,
      approverName: `${req.user.firstName} ${req.user.lastName}`,
      status: 'rejected',
      comments,
      date: new Date()
    });

    await document.save();

    res.json({
      success: true,
      data: document,
      message: 'Document rejected',
      messageAr: 'تم رفض المستند'
    });
  } catch (error) {
    console.error('Reject document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REJECT_DOCUMENT_ERROR',
        message: 'Error rejecting document',
        messageAr: 'خطأ في رفض المستند'
      }
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
      .populate('sender', 'firstName lastName')
      .populate('receiver', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_MESSAGES_ERROR',
        message: 'Error fetching messages',
        messageAr: 'خطأ في جلب الرسائل'
      }
    });
  }
};

exports.createMessage = async (req, res) => {
  try {
    const messageData = {
      ...req.body,
      sender: req.user._id
    };

    const message = await Message.create(messageData);

    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully',
      messageAr: 'تم إرسال الرسالة بنجاح'
    });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_MESSAGE_ERROR',
        message: 'Error sending message',
        messageAr: 'خطأ في إرسال الرسالة'
      }
    });
  }
};

exports.getMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'firstName lastName email')
      .populate('receiver', 'firstName lastName email');

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MESSAGE_NOT_FOUND',
          message: 'Message not found',
          messageAr: 'الرسالة غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_MESSAGE_ERROR',
        message: 'Error fetching message',
        messageAr: 'خطأ في جلب الرسالة'
      }
    });
  }
};

exports.markMessageRead = async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    res.json({
      success: true,
      data: message,
      message: 'Message marked as read',
      messageAr: 'تم تحديد الرسالة كمقروءة'
    });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MARK_READ_ERROR',
        message: 'Error marking message as read',
        messageAr: 'خطأ في تحديد الرسالة كمقروءة'
      }
    });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Message deleted successfully',
      messageAr: 'تم حذف الرسالة بنجاح'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_MESSAGE_ERROR',
        message: 'Error deleting message',
        messageAr: 'خطأ في حذف الرسالة'
      }
    });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const clubId = req.user.clubId || req.user._id;
    const { status, priority } = req.query;

    const query = {
      $or: [{ assignedTo: userId }, { clubId }],
      isDeleted: { $ne: true }
    };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'firstName lastName')
      .populate('assignedBy', 'firstName lastName')
      .sort({ dueDate: 1, priority: 1 });

    res.json({
      success: true,
      data: { tasks }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_TASKS_ERROR',
        message: 'Error fetching tasks',
        messageAr: 'خطأ في جلب المهام'
      }
    });
  }
};

exports.createTask = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const taskData = {
      ...req.body,
      clubId,
      assignedBy: req.user._id,
      assignedByName: `${req.user.firstName} ${req.user.lastName}`,
      createdBy: req.user._id
    };

    const task = await Task.create(taskData);

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully',
      messageAr: 'تم إنشاء المهمة بنجاح'
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_TASK_ERROR',
        message: 'Error creating task',
        messageAr: 'خطأ في إنشاء المهمة'
      }
    });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const updates = { ...req.body };
    
    if (updates.status === 'completed') {
      updates.completedAt = new Date();
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
          messageAr: 'المهمة غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      data: task,
      message: 'Task updated successfully',
      messageAr: 'تم تحديث المهمة بنجاح'
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_TASK_ERROR',
        message: 'Error updating task',
        messageAr: 'خطأ في تحديث المهمة'
      }
    });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
          messageAr: 'المهمة غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully',
      messageAr: 'تم حذف المهمة بنجاح'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_TASK_ERROR',
        message: 'Error deleting task',
        messageAr: 'خطأ في حذف المهمة'
      }
    });
  }
};
