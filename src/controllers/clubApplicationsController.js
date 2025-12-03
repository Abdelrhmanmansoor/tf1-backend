const JobApplication = require('../modules/club/models/JobApplication');
const Job = require('../modules/club/models/Job');
const User = require('../modules/shared/models/User');
const path = require('path');
const fs = require('fs');

// Get all club applications
exports.getAllApplications = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const userId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { clubId: userId };
    if (status) query.status = status;

    const [applications, total] = await Promise.all([
      JobApplication.find(query)
        .populate('jobId', 'title titleAr')
        .populate('applicantId', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      JobApplication.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        applications,
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// Get applications for specific job
exports.getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [applications, total] = await Promise.all([
      JobApplication.find({ jobId })
        .populate('applicantId', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      JobApplication.countDocuments({ jobId })
    ]);

    res.json({
      success: true,
      data: {
        applications,
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({ success: false, message: 'Error fetching applications' });
  }
};

// Get single application details
exports.getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await JobApplication.findById(applicationId)
      .populate('jobId')
      .populate('applicantId');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Get application details error:', error);
    res.status(500).json({ success: false, message: 'Error fetching application' });
  }
};

// Update application status
exports.updateStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['pending', 'reviewing', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updateData = { status, statusUpdatedAt: new Date() };
    if (rejectionReason) updateData.rejectionReason = rejectionReason;

    const application = await JobApplication.findByIdAndUpdate(
      applicationId,
      updateData,
      { new: true }
    );

    res.json({ success: true, data: application });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
};

// Add admin notes
exports.addNotes = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { adminNotes } = req.body;

    const application = await JobApplication.findByIdAndUpdate(
      applicationId,
      { adminNotes },
      { new: true }
    );

    res.json({ success: true, data: application });
  } catch (error) {
    console.error('Add notes error:', error);
    res.status(500).json({ success: false, message: 'Error adding notes' });
  }
};

// Download resume with correct headers
exports.downloadResume = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await JobApplication.findById(applicationId);
    if (!application || !application.attachments || application.attachments.length === 0) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    const resume = application.attachments[0];
    const filePath = resume.localPath || `uploads/resumes/${resume.fileName}`;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.setHeader('Content-Type', resume.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${resume.originalName}"`);
    res.setHeader('Content-Length', resume.size);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({ success: false, message: 'Error downloading resume' });
  }
};

// Export applications to CSV
exports.exportApplications = async (req, res) => {
  try {
    const { jobId } = req.query;
    const userId = req.user._id;

    const query = { clubId: userId };
    if (jobId) query.jobId = jobId;

    const applications = await JobApplication.find(query)
      .populate('jobId')
      .populate('applicantId')
      .lean();

    let csv = 'Name,Email,WhatsApp,Portfolio,LinkedIn,Status,Applied Date\n';
    
    applications.forEach(app => {
      const name = app.applicantId?.firstName + ' ' + app.applicantId?.lastName;
      const email = app.applicantId?.email;
      const whatsapp = app.whatsapp || '';
      const portfolio = app.portfolio || '';
      const linkedin = app.linkedin || '';
      const status = app.status;
      const date = new Date(app.createdAt).toLocaleDateString();

      csv += `"${name}","${email}","${whatsapp}","${portfolio}","${linkedin}","${status}","${date}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Error exporting applications' });
  }
};
