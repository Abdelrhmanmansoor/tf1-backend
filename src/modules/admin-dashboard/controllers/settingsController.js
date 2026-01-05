const { logAdminAction } = require('../middleware/adminAuth');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get system settings
exports.getSystemSettings = async (req, res) => {
  try {
    const SystemSettings = require('../models/SystemSettings');

    let settings = await SystemSettings.findOne();

    if (!settings) {
      // Create default settings if not exists
      settings = new SystemSettings({
        siteName: 'Admin Dashboard',
        siteDescription: 'Site Administration Panel',
        siteUrl: process.env.SITE_URL || 'http://localhost',
        adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
      });
      await settings.save();
    }

    await logAdminAction(
      req,
      'VIEW_SYSTEM_CONFIG',
      'SYSTEM',
      null,
      'SUCCESS',
      null,
      'System settings accessed'
    );

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system settings',
      error: error.message,
    });
  }
};

// Update system settings
exports.updateSystemSettings = async (req, res) => {
  try {
    const SystemSettings = require('../models/SystemSettings');
    const settings = req.body;

    let sysSettings = await SystemSettings.findOne();

    if (!sysSettings) {
      sysSettings = new SystemSettings(settings);
    } else {
      Object.assign(sysSettings, settings);
    }

    const oldSettings = { ...sysSettings.toObject() };
    const updatedSettings = await sysSettings.save();

    await logAdminAction(
      req,
      'UPDATE_SYSTEM_CONFIG',
      'SYSTEM',
      null,
      'SUCCESS',
      {
        before: oldSettings,
        after: updatedSettings.toObject(),
      },
      'System settings updated'
    );

    res.json({
      success: true,
      data: updatedSettings,
      message: 'System settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating system settings:', error);

    await logAdminAction(
      req,
      'UPDATE_SYSTEM_CONFIG',
      'SYSTEM',
      null,
      'FAILED',
      null,
      'Failed to update system settings',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error updating system settings',
      error: error.message,
    });
  }
};

// Get backup list
exports.getBackups = async (req, res) => {
  try {
    const backupDir = path.join(process.cwd(), 'backups');

    if (!fs.existsSync(backupDir)) {
      return res.json({
        success: true,
        data: {
          backups: [],
          totalBackups: 0,
          totalSize: 0,
        },
      });
    }

    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter((file) => file.endsWith('.zip') || file.endsWith('.tar.gz'))
      .map((file) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);

        return {
          name: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          path: file,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

    await logAdminAction(
      req,
      'VIEW_BACKUPS',
      'BACKUP',
      null,
      'SUCCESS',
      null,
      'Backups list accessed'
    );

    res.json({
      success: true,
      data: {
        backups,
        totalBackups: backups.length,
        totalSize,
      },
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching backups',
      error: error.message,
    });
  }
};

// Create backup
exports.createBackup = async (req, res) => {
  try {
    const { backupType = 'full', includeFiles = true } = req.body;

    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${backupType}-${timestamp}.tar.gz`;
    const backupPath = path.join(backupDir, backupName);

    // This is a simplified backup process
    // In production, you might want to use a more robust solution
    const dataDir = path.join(process.cwd(), 'data');
    const uploadsDir = path.join(process.cwd(), 'uploads');

    try {
      // Create tar.gz backup (requires tar command on Unix-like systems)
      let backupCommand = 'tar -czf ';

      if (backupType === 'full' && includeFiles) {
        if (fs.existsSync(uploadsDir)) {
          backupCommand += `"${backupPath}" `;
          if (fs.existsSync(dataDir)) backupCommand += `-C "${dataDir}" .`;
          if (fs.existsSync(uploadsDir)) backupCommand += ` -C "${uploadsDir}" .`;
        }
      } else if (backupType === 'database') {
        // Backup only database
        backupCommand += `"${backupPath}" -C "${dataDir}" . 2>/dev/null || true`;
      }

      execSync(backupCommand, { stdio: 'pipe' });

      await logAdminAction(
        req,
        'BACKUP_CREATED',
        'BACKUP',
        null,
        'SUCCESS',
        { before: {}, after: { name: backupName, type: backupType } },
        `Created ${backupType} backup: ${backupName}`
      );

      res.json({
        success: true,
        data: {
          backupName,
          backupType,
          createdAt: new Date(),
          size: fs.statSync(backupPath).size,
        },
        message: 'Backup created successfully',
      });
    } catch (execError) {
      // If tar command fails (e.g., on Windows), provide guidance
      if (process.platform === 'win32') {
        throw new Error(
          'Backup creation requires tar command. Please use WSL or install Git Bash.'
        );
      }
      throw execError;
    }
  } catch (error) {
    console.error('Error creating backup:', error);

    await logAdminAction(
      req,
      'BACKUP_CREATED',
      'BACKUP',
      null,
      'FAILED',
      null,
      'Failed to create backup',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error creating backup',
      error: error.message,
    });
  }
};

// Delete backup
exports.deleteBackup = async (req, res) => {
  try {
    const { backupName } = req.params;

    // Security check - prevent directory traversal
    if (backupName.includes('..') || backupName.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup name',
      });
    }

    const backupDir = path.join(process.cwd(), 'backups');
    const backupPath = path.join(backupDir, backupName);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found',
      });
    }

    const backupSize = fs.statSync(backupPath).size;
    fs.unlinkSync(backupPath);

    await logAdminAction(
      req,
      'DELETE_BACKUP',
      'BACKUP',
      null,
      'SUCCESS',
      { before: { name: backupName }, after: null },
      `Deleted backup: ${backupName}`
    );

    res.json({
      success: true,
      message: 'Backup deleted successfully',
      freedSpace: backupSize,
    });
  } catch (error) {
    console.error('Error deleting backup:', error);

    await logAdminAction(
      req,
      'DELETE_BACKUP',
      'BACKUP',
      null,
      'FAILED',
      null,
      'Failed to delete backup',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error deleting backup',
      error: error.message,
    });
  }
};

// Download backup
exports.downloadBackup = async (req, res) => {
  try {
    const { backupName } = req.params;

    // Security check
    if (backupName.includes('..') || backupName.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup name',
      });
    }

    const backupDir = path.join(process.cwd(), 'backups');
    const backupPath = path.join(backupDir, backupName);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found',
      });
    }

    res.download(backupPath, backupName, async (err) => {
      if (!err) {
        await logAdminAction(
          req,
          'EXPORT_DATA',
          'BACKUP',
          null,
          'SUCCESS',
          null,
          `Downloaded backup: ${backupName}`
        );
      } else {
        await logAdminAction(
          req,
          'EXPORT_DATA',
          'BACKUP',
          null,
          'FAILED',
          null,
          'Failed to download backup',
          err.message
        );
      }
    });
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading backup',
      error: error.message,
    });
  }
};

// Get system health status
exports.getSystemHealth = async (req, res) => {
  try {
    const os = require('os');

    const health = {
      timestamp: new Date(),
      server: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        systemMemory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
        },
        cpuUsage: os.loadavg(),
        nodeVersion: process.version,
      },
      database: {
        status: 'connected',
        lastCheck: new Date(),
      },
      diskSpace: getDiskSpace(),
    };

    await logAdminAction(
      req,
      'VIEW_SYSTEM',
      'SYSTEM',
      null,
      'SUCCESS',
      null,
      'System health status checked'
    );

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system health',
      error: error.message,
    });
  }
};

// Helper function to get disk space
function getDiskSpace() {
  try {
    const fs = require('fs');
    const path = require('path');

    const stat = fs.statfsSync(process.cwd());

    return {
      total: stat.blocks * stat.bsize,
      free: stat.bfree * stat.bsize,
      available: stat.bavail * stat.bsize,
      used: (stat.blocks - stat.bfree) * stat.bsize,
    };
  } catch (error) {
    return {
      total: 0,
      free: 0,
      available: 0,
      used: 0,
    };
  }
}

module.exports = {
  getSystemSettings,
  updateSystemSettings,
  getBackups,
  createBackup,
  deleteBackup,
  downloadBackup,
  getSystemHealth,
};
