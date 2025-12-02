const { SiteSettings, AuditLog } = require('../models/admin');

const getFullSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getSettings();
    
    res.json({
      success: true,
      data: {
        settings,
        isLeader: req.isLeader || false,
        hasFullAccess: req.hasFullAccess || false
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SETTINGS_ERROR',
        message: 'Failed to retrieve settings',
        messageAr: 'فشل في جلب الإعدادات'
      }
    });
  }
};

const updateBranding = async (req, res) => {
  try {
    const { siteName, siteNameAr, tagline, taglineAr, description, descriptionAr, logo, colors, typography, layout } = req.body;
    
    const updates = { branding: {} };
    
    if (siteName !== undefined) updates.branding.siteName = siteName;
    if (siteNameAr !== undefined) updates.branding.siteNameAr = siteNameAr;
    if (tagline !== undefined) updates.branding.tagline = tagline;
    if (taglineAr !== undefined) updates.branding.taglineAr = taglineAr;
    if (description !== undefined) updates.branding.description = description;
    if (descriptionAr !== undefined) updates.branding.descriptionAr = descriptionAr;
    if (logo !== undefined) updates.branding.logo = logo;
    if (colors !== undefined) updates.branding.colors = colors;
    if (typography !== undefined) updates.branding.typography = typography;
    if (layout !== undefined) updates.branding.layout = layout;
    
    const settings = await SiteSettings.updateSettings(updates, req.user._id);
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_branding',
      module: 'settings',
      description: 'Updated site branding settings',
      descriptionAr: 'تم تحديث إعدادات العلامة التجارية',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: updates.branding,
      severity: 'info'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'branding', data: settings.branding });
    }
    
    res.json({
      success: true,
      message: 'Branding updated successfully',
      messageAr: 'تم تحديث العلامة التجارية بنجاح',
      data: { branding: settings.branding }
    });
  } catch (error) {
    console.error('Update branding error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update branding',
        messageAr: 'فشل في تحديث العلامة التجارية'
      }
    });
  }
};

const updateColors = async (req, res) => {
  try {
    const { colors } = req.body;
    
    if (!colors) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_COLORS',
          message: 'Colors object is required',
          messageAr: 'يجب تقديم بيانات الألوان'
        }
      });
    }
    
    const settings = await SiteSettings.getSettings();
    settings.branding.colors = { ...settings.branding.colors.toObject(), ...colors };
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_colors',
      module: 'settings',
      description: 'Updated site color scheme',
      descriptionAr: 'تم تحديث ألوان الموقع',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: colors,
      severity: 'info'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'colors', data: settings.branding.colors });
    }
    
    res.json({
      success: true,
      message: 'Colors updated successfully',
      messageAr: 'تم تحديث الألوان بنجاح',
      data: { colors: settings.branding.colors }
    });
  } catch (error) {
    console.error('Update colors error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update colors',
        messageAr: 'فشل في تحديث الألوان'
      }
    });
  }
};

const updateLogo = async (req, res) => {
  try {
    const { logo } = req.body;
    
    if (!logo) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_LOGO',
          message: 'Logo object is required',
          messageAr: 'يجب تقديم بيانات الشعار'
        }
      });
    }
    
    const settings = await SiteSettings.getSettings();
    settings.branding.logo = { ...settings.branding.logo.toObject(), ...logo };
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_logo',
      module: 'settings',
      description: 'Updated site logo',
      descriptionAr: 'تم تحديث شعار الموقع',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: logo,
      severity: 'info'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'logo', data: settings.branding.logo });
    }
    
    res.json({
      success: true,
      message: 'Logo updated successfully',
      messageAr: 'تم تحديث الشعار بنجاح',
      data: { logo: settings.branding.logo }
    });
  } catch (error) {
    console.error('Update logo error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update logo',
        messageAr: 'فشل في تحديث الشعار'
      }
    });
  }
};

const updateContent = async (req, res) => {
  try {
    const { pages, announcements, banners, emailTemplates } = req.body;
    
    const settings = await SiteSettings.getSettings();
    
    if (pages) {
      Object.keys(pages).forEach(key => {
        if (settings.content.pages[key]) {
          settings.content.pages[key] = { 
            ...settings.content.pages[key].toObject?.() || settings.content.pages[key], 
            ...pages[key] 
          };
        }
      });
    }
    
    if (announcements) settings.content.announcements = announcements;
    if (banners) settings.content.banners = banners;
    if (emailTemplates) {
      Object.keys(emailTemplates).forEach(key => {
        if (settings.content.emailTemplates[key]) {
          settings.content.emailTemplates[key] = { 
            ...settings.content.emailTemplates[key].toObject?.() || settings.content.emailTemplates[key], 
            ...emailTemplates[key] 
          };
        }
      });
    }
    
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_content',
      module: 'settings',
      description: 'Updated site content',
      descriptionAr: 'تم تحديث محتوى الموقع',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      severity: 'info'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'content', data: settings.content });
    }
    
    res.json({
      success: true,
      message: 'Content updated successfully',
      messageAr: 'تم تحديث المحتوى بنجاح',
      data: { content: settings.content }
    });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update content',
        messageAr: 'فشل في تحديث المحتوى'
      }
    });
  }
};

const updateContactInfo = async (req, res) => {
  try {
    const { contactInfo } = req.body;
    
    if (!contactInfo) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Contact info is required',
          messageAr: 'يجب تقديم معلومات الاتصال'
        }
      });
    }
    
    const settings = await SiteSettings.getSettings();
    settings.contactInfo = { ...settings.contactInfo.toObject(), ...contactInfo };
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_contact',
      module: 'settings',
      description: 'Updated contact information',
      descriptionAr: 'تم تحديث معلومات الاتصال',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: contactInfo,
      severity: 'info'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'contactInfo', data: settings.contactInfo });
    }
    
    res.json({
      success: true,
      message: 'Contact info updated successfully',
      messageAr: 'تم تحديث معلومات الاتصال بنجاح',
      data: { contactInfo: settings.contactInfo }
    });
  } catch (error) {
    console.error('Update contact info error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update contact info',
        messageAr: 'فشل في تحديث معلومات الاتصال'
      }
    });
  }
};

const updateSocialMedia = async (req, res) => {
  try {
    const { socialMedia } = req.body;
    
    if (!socialMedia) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Social media data is required',
          messageAr: 'يجب تقديم بيانات وسائل التواصل'
        }
      });
    }
    
    const settings = await SiteSettings.getSettings();
    settings.socialMedia = { ...settings.socialMedia.toObject(), ...socialMedia };
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_social',
      module: 'settings',
      description: 'Updated social media links',
      descriptionAr: 'تم تحديث روابط وسائل التواصل',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: socialMedia,
      severity: 'info'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'socialMedia', data: settings.socialMedia });
    }
    
    res.json({
      success: true,
      message: 'Social media updated successfully',
      messageAr: 'تم تحديث وسائل التواصل بنجاح',
      data: { socialMedia: settings.socialMedia }
    });
  } catch (error) {
    console.error('Update social media error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update social media',
        messageAr: 'فشل في تحديث وسائل التواصل'
      }
    });
  }
};

const updateFeatures = async (req, res) => {
  try {
    const { features } = req.body;
    
    if (!features) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Features data is required',
          messageAr: 'يجب تقديم بيانات الميزات'
        }
      });
    }
    
    const settings = await SiteSettings.getSettings();
    
    Object.keys(features).forEach(key => {
      if (settings.features[key]) {
        settings.features[key] = { 
          ...settings.features[key].toObject?.() || settings.features[key], 
          ...features[key] 
        };
      }
    });
    
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_features',
      module: 'settings',
      description: 'Updated feature toggles',
      descriptionAr: 'تم تحديث إعدادات الميزات',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: features,
      severity: 'warning'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'features', data: settings.features });
    }
    
    res.json({
      success: true,
      message: 'Features updated successfully',
      messageAr: 'تم تحديث الميزات بنجاح',
      data: { features: settings.features }
    });
  } catch (error) {
    console.error('Update features error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update features',
        messageAr: 'فشل في تحديث الميزات'
      }
    });
  }
};

const updateSeo = async (req, res) => {
  try {
    const { seo } = req.body;
    
    if (!seo) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'SEO data is required',
          messageAr: 'يجب تقديم بيانات السيو'
        }
      });
    }
    
    const settings = await SiteSettings.getSettings();
    settings.seo = { ...settings.seo.toObject(), ...seo };
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_seo',
      module: 'settings',
      description: 'Updated SEO settings',
      descriptionAr: 'تم تحديث إعدادات السيو',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: seo,
      severity: 'info'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'seo', data: settings.seo });
    }
    
    res.json({
      success: true,
      message: 'SEO updated successfully',
      messageAr: 'تم تحديث إعدادات السيو بنجاح',
      data: { seo: settings.seo }
    });
  } catch (error) {
    console.error('Update SEO error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update SEO',
        messageAr: 'فشل في تحديث إعدادات السيو'
      }
    });
  }
};

const updateFooter = async (req, res) => {
  try {
    const { footer } = req.body;
    
    if (!footer) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Footer data is required',
          messageAr: 'يجب تقديم بيانات التذييل'
        }
      });
    }
    
    const settings = await SiteSettings.getSettings();
    settings.footer = { ...settings.footer.toObject(), ...footer };
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_footer',
      module: 'settings',
      description: 'Updated footer settings',
      descriptionAr: 'تم تحديث إعدادات التذييل',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: footer,
      severity: 'info'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'footer', data: settings.footer });
    }
    
    res.json({
      success: true,
      message: 'Footer updated successfully',
      messageAr: 'تم تحديث التذييل بنجاح',
      data: { footer: settings.footer }
    });
  } catch (error) {
    console.error('Update footer error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update footer',
        messageAr: 'فشل في تحديث التذييل'
      }
    });
  }
};

const updateNavigation = async (req, res) => {
  try {
    const { navigation } = req.body;
    
    if (!navigation) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Navigation data is required',
          messageAr: 'يجب تقديم بيانات التنقل'
        }
      });
    }
    
    const settings = await SiteSettings.getSettings();
    
    if (navigation.mainMenu) settings.navigation.mainMenu = navigation.mainMenu;
    if (navigation.footerMenu) settings.navigation.footerMenu = navigation.footerMenu;
    if (navigation.mobileMenu) settings.navigation.mobileMenu = navigation.mobileMenu;
    
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_navigation',
      module: 'settings',
      description: 'Updated navigation menus',
      descriptionAr: 'تم تحديث قوائم التنقل',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      severity: 'info'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'navigation', data: settings.navigation });
    }
    
    res.json({
      success: true,
      message: 'Navigation updated successfully',
      messageAr: 'تم تحديث التنقل بنجاح',
      data: { navigation: settings.navigation }
    });
  } catch (error) {
    console.error('Update navigation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update navigation',
        messageAr: 'فشل في تحديث التنقل'
      }
    });
  }
};

const updateLocalization = async (req, res) => {
  try {
    const { localization } = req.body;
    
    if (!localization) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Localization data is required',
          messageAr: 'يجب تقديم بيانات التوطين'
        }
      });
    }
    
    const settings = await SiteSettings.getSettings();
    settings.localization = { ...settings.localization.toObject(), ...localization };
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_localization',
      module: 'settings',
      description: 'Updated localization settings',
      descriptionAr: 'تم تحديث إعدادات التوطين',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: localization,
      severity: 'info'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'localization', data: settings.localization });
    }
    
    res.json({
      success: true,
      message: 'Localization updated successfully',
      messageAr: 'تم تحديث إعدادات التوطين بنجاح',
      data: { localization: settings.localization }
    });
  } catch (error) {
    console.error('Update localization error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update localization',
        messageAr: 'فشل في تحديث إعدادات التوطين'
      }
    });
  }
};

const updateSecurity = async (req, res) => {
  try {
    const { security } = req.body;
    
    if (!security) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Security data is required',
          messageAr: 'يجب تقديم بيانات الأمان'
        }
      });
    }
    
    const settings = await SiteSettings.getSettings();
    settings.security = { ...settings.security.toObject(), ...security };
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_security',
      module: 'settings',
      description: 'Updated security settings',
      descriptionAr: 'تم تحديث إعدادات الأمان',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: security,
      severity: 'critical'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'security', data: settings.security });
    }
    
    res.json({
      success: true,
      message: 'Security updated successfully',
      messageAr: 'تم تحديث إعدادات الأمان بنجاح',
      data: { security: settings.security }
    });
  } catch (error) {
    console.error('Update security error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update security',
        messageAr: 'فشل في تحديث إعدادات الأمان'
      }
    });
  }
};

const updateLimits = async (req, res) => {
  try {
    const { limits } = req.body;
    
    if (!limits) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Limits data is required',
          messageAr: 'يجب تقديم بيانات الحدود'
        }
      });
    }
    
    const settings = await SiteSettings.getSettings();
    settings.limits = { ...settings.limits.toObject(), ...limits };
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'update_limits',
      module: 'settings',
      description: 'Updated system limits',
      descriptionAr: 'تم تحديث حدود النظام',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: limits,
      severity: 'warning'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'limits', data: settings.limits });
    }
    
    res.json({
      success: true,
      message: 'Limits updated successfully',
      messageAr: 'تم تحديث الحدود بنجاح',
      data: { limits: settings.limits }
    });
  } catch (error) {
    console.error('Update limits error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update limits',
        messageAr: 'فشل في تحديث الحدود'
      }
    });
  }
};

const addAnnouncement = async (req, res) => {
  try {
    const { title, titleAr, message, messageAr, type, position, showOnPages, dismissible, startsAt, endsAt } = req.body;
    
    const settings = await SiteSettings.getSettings();
    
    const newAnnouncement = {
      title,
      titleAr,
      message,
      messageAr,
      type: type || 'info',
      position: position || 'top',
      showOnPages: showOnPages || [],
      dismissible: dismissible !== false,
      startsAt,
      endsAt,
      isActive: true
    };
    
    settings.content.announcements.push(newAnnouncement);
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'add_announcement',
      module: 'content',
      description: `Added announcement: ${titleAr || title}`,
      descriptionAr: `تم إضافة إعلان: ${titleAr || title}`,
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: newAnnouncement,
      severity: 'info'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'announcements', data: settings.content.announcements });
    }
    
    res.status(201).json({
      success: true,
      message: 'Announcement added successfully',
      messageAr: 'تم إضافة الإعلان بنجاح',
      data: { announcement: newAnnouncement }
    });
  } catch (error) {
    console.error('Add announcement error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADD_ERROR',
        message: 'Failed to add announcement',
        messageAr: 'فشل في إضافة الإعلان'
      }
    });
  }
};

const addBanner = async (req, res) => {
  try {
    const { title, titleAr, subtitle, subtitleAr, image, imageMobile, link, buttonText, buttonTextAr, position, order, showOnPages, startsAt, endsAt } = req.body;
    
    const settings = await SiteSettings.getSettings();
    
    const newBanner = {
      title,
      titleAr,
      subtitle,
      subtitleAr,
      image,
      imageMobile,
      link,
      buttonText,
      buttonTextAr,
      position: position || 'hero',
      order: order || 0,
      showOnPages: showOnPages || [],
      startsAt,
      endsAt,
      isActive: true
    };
    
    settings.content.banners.push(newBanner);
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'add_banner',
      module: 'content',
      description: `Added banner: ${titleAr || title}`,
      descriptionAr: `تم إضافة بانر: ${titleAr || title}`,
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      newValues: newBanner,
      severity: 'info'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'banners', data: settings.content.banners });
    }
    
    res.status(201).json({
      success: true,
      message: 'Banner added successfully',
      messageAr: 'تم إضافة البانر بنجاح',
      data: { banner: newBanner }
    });
  } catch (error) {
    console.error('Add banner error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADD_ERROR',
        message: 'Failed to add banner',
        messageAr: 'فشل في إضافة البانر'
      }
    });
  }
};

const toggleMaintenance = async (req, res) => {
  try {
    const { enabled, message, messageAr, allowedIPs, estimatedEndTime } = req.body;
    
    const settings = await SiteSettings.getSettings();
    
    settings.features.maintenance = {
      enabled: enabled !== undefined ? enabled : settings.features.maintenance.enabled,
      message: message || settings.features.maintenance.message,
      messageAr: messageAr || settings.features.maintenance.messageAr,
      allowedIPs: allowedIPs || settings.features.maintenance.allowedIPs,
      estimatedEndTime: estimatedEndTime || settings.features.maintenance.estimatedEndTime
    };
    
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: enabled ? 'enable_maintenance' : 'disable_maintenance',
      module: 'system',
      description: enabled ? 'Enabled maintenance mode' : 'Disabled maintenance mode',
      descriptionAr: enabled ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      severity: 'critical'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: 'maintenance', data: settings.features.maintenance });
      if (enabled) {
        io.emit('maintenance:enabled', settings.features.maintenance);
      } else {
        io.emit('maintenance:disabled');
      }
    }
    
    res.json({
      success: true,
      message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
      messageAr: enabled ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة',
      data: { maintenance: settings.features.maintenance }
    });
  } catch (error) {
    console.error('Toggle maintenance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to toggle maintenance',
        messageAr: 'فشل في تغيير وضع الصيانة'
      }
    });
  }
};

const getPublicSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getPublicSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SETTINGS_ERROR',
        message: 'Failed to retrieve settings',
        messageAr: 'فشل في جلب الإعدادات'
      }
    });
  }
};

const resetToDefaults = async (req, res) => {
  try {
    const { section } = req.body;
    
    const settings = await SiteSettings.getSettings();
    const previousValues = settings[section];
    
    const defaultSettings = new SiteSettings();
    
    if (section && defaultSettings[section]) {
      settings[section] = defaultSettings[section];
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SECTION',
          message: 'Invalid section specified',
          messageAr: 'القسم المحدد غير صالح'
        }
      });
    }
    
    settings.lastUpdatedBy = req.user._id;
    settings.version += 1;
    await settings.save();
    
    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'reset_settings',
      module: 'settings',
      description: `Reset ${section} to defaults`,
      descriptionAr: `إعادة تعيين ${section} للإعدادات الافتراضية`,
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      previousValues,
      severity: 'warning'
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', { type: section, data: settings[section] });
    }
    
    res.json({
      success: true,
      message: `${section} reset to defaults`,
      messageAr: `تم إعادة تعيين ${section} للإعدادات الافتراضية`,
      data: { [section]: settings[section] }
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_ERROR',
        message: 'Failed to reset settings',
        messageAr: 'فشل في إعادة تعيين الإعدادات'
      }
    });
  }
};

module.exports = {
  getFullSettings,
  updateBranding,
  updateColors,
  updateLogo,
  updateContent,
  updateContactInfo,
  updateSocialMedia,
  updateFeatures,
  updateSeo,
  updateFooter,
  updateNavigation,
  updateLocalization,
  updateSecurity,
  updateLimits,
  addAnnouncement,
  addBanner,
  toggleMaintenance,
  getPublicSettings,
  resetToDefaults
};
