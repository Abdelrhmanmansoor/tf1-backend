const mongoose = require('mongoose');

const SiteSettingsSchema = new mongoose.Schema({
  branding: {
    siteName: { type: String, default: 'SportX Platform' },
    siteNameAr: { type: String, default: 'منصة سبورت إكس' },
    tagline: { type: String, default: 'LinkedIn for Sports' },
    taglineAr: { type: String, default: 'لينكد إن للرياضة' },
    description: { type: String, default: '' },
    descriptionAr: { type: String, default: '' },
    
    logo: {
      light: { type: String, default: '' },
      dark: { type: String, default: '' },
      icon: { type: String, default: '' },
      favicon: { type: String, default: '' }
    },
    
    colors: {
      primary: { type: String, default: '#1a73e8' },
      primaryHover: { type: String, default: '#1557b0' },
      primaryLight: { type: String, default: '#e8f0fe' },
      secondary: { type: String, default: '#5f6368' },
      secondaryHover: { type: String, default: '#3c4043' },
      accent: { type: String, default: '#34a853' },
      accentHover: { type: String, default: '#2d8f47' },
      success: { type: String, default: '#34a853' },
      warning: { type: String, default: '#fbbc04' },
      error: { type: String, default: '#ea4335' },
      info: { type: String, default: '#4285f4' },
      
      background: {
        main: { type: String, default: '#ffffff' },
        secondary: { type: String, default: '#f8f9fa' },
        tertiary: { type: String, default: '#e8eaed' },
        dark: { type: String, default: '#202124' }
      },
      
      text: {
        primary: { type: String, default: '#202124' },
        secondary: { type: String, default: '#5f6368' },
        disabled: { type: String, default: '#9aa0a6' },
        light: { type: String, default: '#ffffff' },
        link: { type: String, default: '#1a73e8' },
        linkHover: { type: String, default: '#174ea6' }
      },
      
      border: {
        light: { type: String, default: '#dadce0' },
        medium: { type: String, default: '#5f6368' },
        dark: { type: String, default: '#202124' }
      },
      
      navbar: {
        background: { type: String, default: '#ffffff' },
        text: { type: String, default: '#202124' },
        activeLink: { type: String, default: '#1a73e8' }
      },
      
      sidebar: {
        background: { type: String, default: '#f8f9fa' },
        text: { type: String, default: '#202124' },
        activeItem: { type: String, default: '#e8f0fe' }
      },
      
      footer: {
        background: { type: String, default: '#202124' },
        text: { type: String, default: '#ffffff' }
      },
      
      cards: {
        background: { type: String, default: '#ffffff' },
        border: { type: String, default: '#dadce0' },
        shadow: { type: String, default: 'rgba(0,0,0,0.1)' }
      },
      
      buttons: {
        primaryBg: { type: String, default: '#1a73e8' },
        primaryText: { type: String, default: '#ffffff' },
        secondaryBg: { type: String, default: '#ffffff' },
        secondaryText: { type: String, default: '#1a73e8' },
        secondaryBorder: { type: String, default: '#dadce0' }
      },
      
      inputs: {
        background: { type: String, default: '#ffffff' },
        border: { type: String, default: '#dadce0' },
        focusBorder: { type: String, default: '#1a73e8' },
        placeholder: { type: String, default: '#9aa0a6' }
      }
    },
    
    typography: {
      fontFamily: {
        primary: { type: String, default: 'Cairo, Tajawal, sans-serif' },
        secondary: { type: String, default: 'Roboto, sans-serif' },
        heading: { type: String, default: 'Cairo, sans-serif' },
        monospace: { type: String, default: 'Roboto Mono, monospace' }
      },
      fontSize: {
        xs: { type: String, default: '0.75rem' },
        sm: { type: String, default: '0.875rem' },
        base: { type: String, default: '1rem' },
        lg: { type: String, default: '1.125rem' },
        xl: { type: String, default: '1.25rem' },
        '2xl': { type: String, default: '1.5rem' },
        '3xl': { type: String, default: '1.875rem' },
        '4xl': { type: String, default: '2.25rem' }
      },
      fontWeight: {
        light: { type: Number, default: 300 },
        normal: { type: Number, default: 400 },
        medium: { type: Number, default: 500 },
        semibold: { type: Number, default: 600 },
        bold: { type: Number, default: 700 }
      },
      lineHeight: {
        tight: { type: Number, default: 1.25 },
        normal: { type: Number, default: 1.5 },
        relaxed: { type: Number, default: 1.75 }
      }
    },
    
    layout: {
      borderRadius: {
        none: { type: String, default: '0' },
        sm: { type: String, default: '0.25rem' },
        md: { type: String, default: '0.5rem' },
        lg: { type: String, default: '1rem' },
        xl: { type: String, default: '1.5rem' },
        full: { type: String, default: '9999px' }
      },
      spacing: {
        xs: { type: String, default: '0.25rem' },
        sm: { type: String, default: '0.5rem' },
        md: { type: String, default: '1rem' },
        lg: { type: String, default: '1.5rem' },
        xl: { type: String, default: '2rem' },
        '2xl': { type: String, default: '3rem' }
      },
      containerMaxWidth: { type: String, default: '1280px' },
      sidebarWidth: { type: String, default: '280px' },
      navbarHeight: { type: String, default: '64px' }
    }
  },
  
  content: {
    pages: {
      home: {
        heroTitle: { type: String, default: 'منصة سبورت إكس' },
        heroSubtitle: { type: String, default: 'المنصة الرياضية الأولى في الشرق الأوسط' },
        heroDescription: { type: String, default: 'تواصل مع اللاعبين والمدربين والأندية والمختصين' },
        heroButtonText: { type: String, default: 'ابدأ الآن' },
        heroImage: { type: String, default: '' },
        sections: [{ type: mongoose.Schema.Types.Mixed }]
      },
      about: {
        title: { type: String, default: 'من نحن' },
        content: { type: String, default: '' },
        contentAr: { type: String, default: '' },
        image: { type: String, default: '' },
        team: [{ type: mongoose.Schema.Types.Mixed }]
      },
      terms: {
        title: { type: String, default: 'الشروط والأحكام' },
        content: { type: String, default: '' },
        lastUpdated: { type: Date, default: Date.now }
      },
      privacy: {
        title: { type: String, default: 'سياسة الخصوصية' },
        content: { type: String, default: '' },
        lastUpdated: { type: Date, default: Date.now }
      },
      faq: {
        title: { type: String, default: 'الأسئلة الشائعة' },
        items: [{
          question: String,
          questionAr: String,
          answer: String,
          answerAr: String,
          order: Number,
          isActive: { type: Boolean, default: true }
        }]
      },
      contact: {
        title: { type: String, default: 'تواصل معنا' },
        description: { type: String, default: '' },
        showMap: { type: Boolean, default: true },
        mapLocation: {
          lat: { type: Number, default: 24.7136 },
          lng: { type: Number, default: 46.6753 }
        }
      }
    },
    
    announcements: [{
      id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
      title: String,
      titleAr: String,
      message: String,
      messageAr: String,
      type: { type: String, enum: ['info', 'warning', 'success', 'error'], default: 'info' },
      position: { type: String, enum: ['top', 'bottom', 'modal'], default: 'top' },
      isActive: { type: Boolean, default: true },
      showOnPages: [String],
      dismissible: { type: Boolean, default: true },
      startsAt: Date,
      endsAt: Date,
      createdAt: { type: Date, default: Date.now }
    }],
    
    banners: [{
      id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
      title: String,
      titleAr: String,
      subtitle: String,
      subtitleAr: String,
      image: String,
      imageMobile: String,
      link: String,
      buttonText: String,
      buttonTextAr: String,
      position: { type: String, enum: ['hero', 'sidebar', 'inline', 'popup'], default: 'hero' },
      order: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
      showOnPages: [String],
      startsAt: Date,
      endsAt: Date
    }],
    
    emailTemplates: {
      welcome: {
        subject: { type: String, default: 'مرحباً بك في سبورت إكس' },
        body: { type: String, default: '' }
      },
      verification: {
        subject: { type: String, default: 'تأكيد بريدك الإلكتروني' },
        body: { type: String, default: '' }
      },
      passwordReset: {
        subject: { type: String, default: 'إعادة تعيين كلمة المرور' },
        body: { type: String, default: '' }
      },
      notification: {
        subject: { type: String, default: 'إشعار جديد' },
        body: { type: String, default: '' }
      },
      jobApplication: {
        subject: { type: String, default: 'تم استلام طلبك' },
        body: { type: String, default: '' }
      },
      matchInvite: {
        subject: { type: String, default: 'دعوة للانضمام لمباراة' },
        body: { type: String, default: '' }
      }
    }
  },
  
  contactInfo: {
    email: { type: String, default: 'info@sportx.com' },
    supportEmail: { type: String, default: 'support@sportx.com' },
    phone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    address: { type: String, default: '' },
    addressAr: { type: String, default: '' },
    city: { type: String, default: 'الرياض' },
    country: { type: String, default: 'المملكة العربية السعودية' },
    postalCode: { type: String, default: '' },
    workingHours: {
      weekdays: { type: String, default: '9:00 AM - 6:00 PM' },
      weekends: { type: String, default: 'مغلق' }
    }
  },
  
  socialMedia: {
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    youtube: { type: String, default: '' },
    tiktok: { type: String, default: '' },
    snapchat: { type: String, default: '' },
    telegram: { type: String, default: '' }
  },
  
  features: {
    matchHub: {
      enabled: { type: Boolean, default: true },
      allowPublicCreate: { type: Boolean, default: true },
      requireApproval: { type: Boolean, default: false },
      maxPlayersPerMatch: { type: Number, default: 30 }
    },
    jobs: {
      enabled: { type: Boolean, default: true },
      allowPublicPost: { type: Boolean, default: false },
      requireApproval: { type: Boolean, default: true },
      maxApplicationsPerUser: { type: Number, default: 50 }
    },
    messaging: {
      enabled: { type: Boolean, default: true },
      allowFileSharing: { type: Boolean, default: true },
      maxFileSize: { type: Number, default: 10 }
    },
    notifications: {
      enabled: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: false },
      smsNotifications: { type: Boolean, default: false }
    },
    profiles: {
      allowPublicView: { type: Boolean, default: true },
      requireVerification: { type: Boolean, default: false },
      allowRatings: { type: Boolean, default: true }
    },
    registration: {
      enabled: { type: Boolean, default: true },
      requireEmailVerification: { type: Boolean, default: false },
      allowedRoles: { 
        type: [String], 
        default: ['player', 'coach', 'club', 'specialist'] 
      },
      defaultRole: { type: String, default: 'player' }
    },
    maintenance: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: 'الموقع تحت الصيانة' },
      messageAr: { type: String, default: 'الموقع تحت الصيانة' },
      allowedIPs: [String],
      estimatedEndTime: Date
    }
  },
  
  seo: {
    metaTitle: { type: String, default: 'SportX Platform - منصة سبورت إكس' },
    metaDescription: { type: String, default: 'المنصة الرياضية الأولى في الشرق الأوسط' },
    metaKeywords: [{ type: String }],
    ogImage: { type: String, default: '' },
    twitterCard: { type: String, default: 'summary_large_image' },
    googleAnalyticsId: { type: String, default: '' },
    facebookPixelId: { type: String, default: '' }
  },
  
  footer: {
    copyrightText: { type: String, default: '© 2025 SportX Platform. جميع الحقوق محفوظة.' },
    showSocialLinks: { type: Boolean, default: true },
    showContactInfo: { type: Boolean, default: true },
    showQuickLinks: { type: Boolean, default: true },
    quickLinks: [{
      label: String,
      labelAr: String,
      url: String,
      order: Number,
      isActive: { type: Boolean, default: true }
    }],
    legalLinks: [{
      label: String,
      labelAr: String,
      url: String,
      order: Number,
      isActive: { type: Boolean, default: true }
    }],
    additionalText: { type: String, default: '' },
    additionalTextAr: { type: String, default: '' }
  },
  
  navigation: {
    mainMenu: [{
      label: String,
      labelAr: String,
      url: String,
      icon: String,
      order: Number,
      isActive: { type: Boolean, default: true },
      showFor: [{ type: String }],
      hideFor: [{ type: String }],
      children: [{
        label: String,
        labelAr: String,
        url: String,
        icon: String,
        order: Number,
        isActive: { type: Boolean, default: true }
      }]
    }],
    footerMenu: [{
      label: String,
      labelAr: String,
      url: String,
      order: Number,
      isActive: { type: Boolean, default: true }
    }],
    mobileMenu: [{
      label: String,
      labelAr: String,
      url: String,
      icon: String,
      order: Number,
      isActive: { type: Boolean, default: true }
    }]
  },
  
  localization: {
    defaultLanguage: { type: String, default: 'ar' },
    supportedLanguages: [{ type: String, default: ['ar', 'en'] }],
    rtlLanguages: [{ type: String, default: ['ar'] }],
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timeFormat: { type: String, default: 'HH:mm' },
    timezone: { type: String, default: 'Asia/Riyadh' },
    currency: { type: String, default: 'SAR' },
    currencySymbol: { type: String, default: 'ر.س' }
  },
  
  security: {
    passwordMinLength: { type: Number, default: 8 },
    passwordRequireUppercase: { type: Boolean, default: true },
    passwordRequireLowercase: { type: Boolean, default: true },
    passwordRequireNumber: { type: Boolean, default: true },
    passwordRequireSpecial: { type: Boolean, default: false },
    sessionTimeout: { type: Number, default: 3600 },
    maxLoginAttempts: { type: Number, default: 5 },
    lockoutDuration: { type: Number, default: 900 },
    twoFactorEnabled: { type: Boolean, default: false }
  },
  
  limits: {
    maxUploadSize: { type: Number, default: 10 },
    maxImagesPerProfile: { type: Number, default: 10 },
    maxVideosPerProfile: { type: Number, default: 5 },
    apiRateLimit: { type: Number, default: 100 },
    searchResultsPerPage: { type: Number, default: 20 }
  },
  
  version: { type: Number, default: 1 },
  isDraft: { type: Boolean, default: false },
  publishedAt: { type: Date },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

SiteSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ isDraft: false }).sort({ version: -1 });
  
  if (!settings) {
    settings = await this.create({});
  }
  
  return settings;
};

SiteSettingsSchema.statics.getPublicSettings = async function() {
  const settings = await this.getSettings();
  
  return {
    branding: settings.branding,
    contactInfo: {
      email: settings.contactInfo.email,
      phone: settings.contactInfo.phone,
      whatsapp: settings.contactInfo.whatsapp,
      address: settings.contactInfo.addressAr,
      city: settings.contactInfo.city,
      country: settings.contactInfo.country,
      workingHours: settings.contactInfo.workingHours
    },
    socialMedia: settings.socialMedia,
    features: {
      matchHub: { enabled: settings.features.matchHub.enabled },
      jobs: { enabled: settings.features.jobs.enabled },
      messaging: { enabled: settings.features.messaging.enabled },
      notifications: { enabled: settings.features.notifications.enabled },
      registration: { 
        enabled: settings.features.registration.enabled,
        allowedRoles: settings.features.registration.allowedRoles
      },
      maintenance: settings.features.maintenance
    },
    seo: settings.seo,
    footer: settings.footer,
    navigation: settings.navigation,
    localization: settings.localization,
    content: {
      pages: settings.content.pages,
      announcements: settings.content.announcements.filter(a => a.isActive),
      banners: settings.content.banners.filter(b => b.isActive)
    }
  };
};

SiteSettingsSchema.statics.updateSettings = async function(updates, userId) {
  const settings = await this.getSettings();
  
  Object.keys(updates).forEach(key => {
    if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
      settings[key] = { ...settings[key]?.toObject?.() || settings[key], ...updates[key] };
    } else {
      settings[key] = updates[key];
    }
  });
  
  settings.lastUpdatedBy = userId;
  settings.version += 1;
  
  await settings.save();
  return settings;
};

const SiteSettings = mongoose.model('SiteSettings', SiteSettingsSchema);

module.exports = SiteSettings;
