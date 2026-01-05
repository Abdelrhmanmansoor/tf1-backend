const { logAdminAction } = require('../middleware/adminAuth');
const axios = require('axios');
const cron = require('node-cron');

class APIIntegrations {
  // Configure automatic backups using cron
  static configureAutoBackups(schedule = '0 2 * * *') {
    // Default: 2 AM daily
    cron.schedule(schedule, async () => {
      try {
        console.log('Starting scheduled backup...');
        await this.createAutomaticBackup();
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    });
  }

  // Create automatic backup
  static async createAutomaticBackup() {
    const fs = require('fs');
    const path = require('path');
    const { execSync } = require('child_process');

    try {
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-auto-${timestamp}.tar.gz`;
      const backupPath = path.join(backupDir, backupName);

      // Create backup (simplified)
      const dataDir = path.join(process.cwd(), 'data');
      if (fs.existsSync(dataDir)) {
        execSync(`tar -czf "${backupPath}" -C "${dataDir}" .`, {
          stdio: 'pipe',
        });
      }

      console.log(`Automatic backup created: ${backupName}`);

      // Delete old backups based on retention policy
      await this.cleanOldBackups();

      return {
        success: true,
        backupName,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error creating automatic backup:', error);
      throw error;
    }
  }

  // Clean old backups based on retention days
  static async cleanOldBackups(retentionDays = 30) {
    const fs = require('fs');
    const path = require('path');

    try {
      const backupDir = path.join(process.cwd(), 'backups');

      if (!fs.existsSync(backupDir)) {
        return;
      }

      const files = fs.readdirSync(backupDir);
      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

      files.forEach((file) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtime.getTime();

        if (fileAge > retentionMs) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old backup: ${file}`);
        }
      });
    } catch (error) {
      console.error('Error cleaning old backups:', error);
    }
  }

  // Sync data to external service (e.g., cloud storage)
  static async syncToExternalService(
    req,
    serviceName,
    config,
    dataToSync
  ) {
    try {
      let endpoint;
      let headers = {
        'Content-Type': 'application/json',
      };

      switch (serviceName) {
        case 'google-drive':
          endpoint = 'https://www.googleapis.com/drive/v3/files';
          headers['Authorization'] = `Bearer ${config.accessToken}`;
          break;

        case 'dropbox':
          endpoint = 'https://content.dropboxapi.com/2/files/upload';
          headers['Authorization'] = `Bearer ${config.accessToken}`;
          headers['Dropbox-API-Arg'] = JSON.stringify({
            path: `/backups/${config.filename}`,
            mode: 'add',
            autorename: true,
            mute: false,
          });
          break;

        case 'aws-s3':
          endpoint = config.endpoint;
          headers['Authorization'] = `AWS4-HMAC-SHA256 ...`;
          break;

        case 'custom-webhook':
          endpoint = config.webhookUrl;
          break;

        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }

      const response = await axios.post(endpoint, dataToSync, { headers });

      await logAdminAction(
        req,
        'API_SYNC',
        'SYSTEM',
        null,
        'SUCCESS',
        {
          before: {},
          after: { service: serviceName, timestamp: new Date() },
        },
        `Data synced to ${serviceName}`
      );

      return {
        success: true,
        service: serviceName,
        response: response.data,
      };
    } catch (error) {
      console.error(`Sync to ${serviceName} failed:`, error);

      await logAdminAction(
        req,
        'API_SYNC',
        'SYSTEM',
        null,
        'FAILED',
        null,
        `Failed to sync to ${serviceName}`,
        error.message
      );

      throw error;
    }
  }

  // Register webhook for events
  static async registerWebhook(req, events, webhookUrl) {
    try {
      const Webhook = require('../models/Webhook');

      const newWebhook = new Webhook({
        url: webhookUrl,
        events,
        isActive: true,
        createdBy: req.admin?.id,
      });

      await newWebhook.save();

      await logAdminAction(
        req,
        'CREATE_SYSTEM_CONFIG',
        'SYSTEM',
        newWebhook._id,
        'SUCCESS',
        null,
        `Registered webhook: ${webhookUrl}`
      );

      return newWebhook;
    } catch (error) {
      console.error('Error registering webhook:', error);
      throw error;
    }
  }

  // Trigger webhook
  static async triggerWebhook(eventType, eventData) {
    try {
      const Webhook = require('../models/Webhook');

      const webhooks = await Webhook.find({
        events: eventType,
        isActive: true,
      });

      const promises = webhooks.map((webhook) =>
        axios.post(webhook.url, {
          event: eventType,
          timestamp: new Date(),
          data: eventData,
        })
          .catch((error) => {
            console.error(`Webhook trigger failed for ${webhook.url}:`, error);
          })
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Error triggering webhooks:', error);
    }
  }

  // Export data in multiple formats
  static async exportData(dataType, format = 'json') {
    try {
      let data;
      const User = require('../../shared/models/User');
      const AdminLog = require('../models/AdminLog');

      switch (dataType) {
        case 'users':
          data = await User.find().lean();
          break;
        case 'logs':
          data = await AdminLog.find().lean();
          break;
        case 'all':
          data = {
            users: await User.find().lean(),
            logs: await AdminLog.find().lean(),
            timestamp: new Date(),
          };
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else if (format === 'csv') {
        return this.convertToCSV(data);
      } else if (format === 'xml') {
        return this.convertToXML(data);
      }

      return data;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // Convert data to CSV
  static convertToCSV(data) {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';

      const headers = Object.keys(data[0]);
      const rows = data.map((item) =>
        headers
          .map((header) => {
            const value = item[header];
            return typeof value === 'string' && value.includes(',')
              ? `"${value}"`
              : value;
          })
          .join(',')
      );

      return [headers.join(','), ...rows].join('\n');
    }

    return '';
  }

  // Convert data to XML
  static convertToXML(data) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<root>\n';

    if (Array.isArray(data)) {
      data.forEach((item) => {
        xml += '  <item>\n';
        Object.entries(item).forEach(([key, value]) => {
          xml += `    <${key}>${
            typeof value === 'object' ? JSON.stringify(value) : value
          }</${key}>\n`;
        });
        xml += '  </item>\n';
      });
    } else {
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          xml += `  <${key}>\n`;
          value.forEach((item) => {
            xml += `    <item>${typeof item === 'object' ? JSON.stringify(item) : item}</item>\n`;
          });
          xml += `  </${key}>\n`;
        } else {
          xml += `  <${key}>${
            typeof value === 'object' ? JSON.stringify(value) : value
          }</${key}>\n`;
        }
      });
    }

    xml += '</root>';
    return xml;
  }

  // Monitor system health periodically
  static startHealthMonitoring(interval = 300000) {
    // Default: every 5 minutes
    setInterval(async () => {
      try {
        const health = this.getSystemHealth();
        const AlertService = require('./alertService');

        if (health.memoryUsage > 0.9) {
          await AlertService.sendAlert('MEMORY_CRITICAL', health);
        }

        if (health.diskUsage > 0.95) {
          await AlertService.sendAlert('DISK_SPACE_CRITICAL', health);
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, interval);
  }

  // Get system health
  static getSystemHealth() {
    const os = require('os');
    const fs = require('fs');

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      memoryUsage: usedMem / totalMem,
      timestamp: new Date(),
    };
  }
}

module.exports = APIIntegrations;
