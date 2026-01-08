/**
 * Report Generation Service
 * Generate detailed reports with export capabilities (PDF/Excel)
 */

const analyticsService = require('./analyticsService');
const kpiService = require('./kpiService');
const statisticalModels = require('./statisticalModels');

class ReportService {
  /**
   * Generate Comprehensive Analytics Report
   */
  async generateAnalyticsReport(options = {}) {
    const {
      period = 'month',
      includeGrowth = true,
      includeKPIs = true,
      includeHealth = true,
      includeFunnel = true,
      includeForecasts = true
    } = options;

    const report = {
      metadata: {
        report_type: 'comprehensive_analytics',
        generated_at: new Date(),
        period,
        version: '1.0'
      },
      executive_summary: {},
      sections: []
    };

    // Get all data in parallel
    const dataPromises = [];
    
    if (includeKPIs) {
      dataPromises.push(
        kpiService.getDashboardKPIs(period)
          .then(data => ({ type: 'kpis', data }))
      );
    }

    if (includeHealth) {
      dataPromises.push(
        analyticsService.getPlatformHealthMetrics()
          .then(data => ({ type: 'health', data }))
      );
    }

    if (includeGrowth) {
      dataPromises.push(
        analyticsService.getGrowthTrendAnalysis(90)
          .then(data => ({ type: 'growth', data }))
      );
    }

    if (includeFunnel) {
      const now = new Date();
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dataPromises.push(
        kpiService.getFunnelAnalysis(startDate, now)
          .then(data => ({ type: 'funnel', data }))
      );
    }

    const results = await Promise.all(dataPromises);

    // Process results
    const dataMap = {};
    results.forEach(result => {
      dataMap[result.type] = result.data;
    });

    // Build Executive Summary
    if (dataMap.kpis) {
      report.executive_summary = {
        health_score: dataMap.kpis.health_score?.score || 0,
        total_matches: dataMap.kpis.growth?.matches_created?.current || 0,
        total_users: dataMap.kpis.engagement?.active_users?.value || 0,
        engagement_rate: dataMap.kpis.engagement?.engagement_rate?.value || 0,
        key_insights: this.generateKeyInsights(dataMap)
      };
    }

    // Build Sections
    if (dataMap.kpis) {
      report.sections.push({
        title: 'Key Performance Indicators',
        type: 'kpi',
        data: dataMap.kpis,
        charts: this.generateKPICharts(dataMap.kpis)
      });
    }

    if (dataMap.growth) {
      report.sections.push({
        title: 'Growth Trend Analysis',
        type: 'growth',
        data: dataMap.growth,
        statistical_model: {
          type: 'Linear Regression',
          r2_score: dataMap.growth.matches?.regression?.r2,
          slope: dataMap.growth.matches?.regression?.slope,
          interpretation: this.interpretRegressionResults(dataMap.growth.matches?.regression)
        },
        charts: this.generateGrowthCharts(dataMap.growth)
      });
    }

    if (dataMap.health) {
      report.sections.push({
        title: 'Platform Health Assessment',
        type: 'health',
        data: dataMap.health,
        anomalies: dataMap.health.fill_rate_analysis?.anomalies || [],
        recommendations: this.generateHealthRecommendations(dataMap.health)
      });
    }

    if (dataMap.funnel) {
      report.sections.push({
        title: 'Conversion Funnel Analysis',
        type: 'funnel',
        data: dataMap.funnel,
        optimization_opportunities: this.identifyOptimizationOpportunities(dataMap.funnel)
      });
    }

    // Add Forecasts
    if (includeForecasts && dataMap.growth) {
      report.sections.push({
        title: 'Predictive Forecasts',
        type: 'forecast',
        matches_forecast: dataMap.growth.matches?.forecast || [],
        joins_forecast: dataMap.growth.joins?.forecast || [],
        confidence_level: Math.round((dataMap.growth.matches?.regression?.r2 || 0) * 100),
        methodology: 'Exponential Smoothing with Linear Regression trend'
      });
    }

    return report;
  }

  /**
   * Generate User Performance Report
   */
  async generateUserReport(userId) {
    const report = {
      metadata: {
        report_type: 'user_performance',
        user_id: userId,
        generated_at: new Date(),
        version: '1.0'
      },
      sections: []
    };

    // Get user data
    const [analytics, performance, comparative, predictive] = await Promise.all([
      analyticsService.getUserAnalytics(userId),
      analyticsService.getUserPerformanceScore(userId),
      analyticsService.getComparativeAnalysis(userId),
      analyticsService.getPredictiveInsights(userId)
    ]);

    // Executive Summary
    report.executive_summary = {
      overall_score: performance.overall_score,
      classification: performance.classification,
      percentile_rank: comparative.percentile_rank?.overall || 0,
      churn_risk: predictive.churn_risk?.risk_level || 'unknown'
    };

    // Performance Section
    report.sections.push({
      title: 'Performance Metrics',
      type: 'performance',
      data: performance,
      statistical_analysis: {
        weighted_components: performance.breakdown,
        classification_method: 'Multi-dimensional weighted scoring'
      }
    });

    // Comparative Section
    report.sections.push({
      title: 'Comparative Analysis',
      type: 'comparative',
      data: comparative,
      interpretation: this.interpretComparative(comparative)
    });

    // Predictive Section
    report.sections.push({
      title: 'Predictive Insights',
      type: 'predictive',
      data: predictive,
      risk_assessment: predictive.risk_assessment,
      recommendations: predictive.recommendations
    });

    // Activity Summary
    report.sections.push({
      title: 'Activity Summary',
      type: 'activity',
      data: analytics,
      trends: {
        recent_activity: analytics.activity?.this_week,
        monthly_summary: analytics.activity?.this_month
      }
    });

    return report;
  }

  /**
   * Generate Platform Health Report
   */
  async generateHealthReport() {
    const health = await analyticsService.getPlatformHealthMetrics();
    const seasonality = await analyticsService.getSeasonalityAnalysis(60);

    return {
      metadata: {
        report_type: 'platform_health',
        generated_at: new Date(),
        version: '1.0'
      },
      health_metrics: health,
      seasonality_analysis: seasonality,
      critical_issues: this.identifyCriticalIssues(health),
      recommendations: this.generateHealthRecommendations(health),
      statistical_insights: {
        fill_rate_distribution: health.fill_rate_analysis,
        anomalies_detected: health.fill_rate_analysis?.anomalies_detected || 0,
        seasonal_patterns: seasonality.weekly_pattern
      }
    };
  }

  /**
   * Export Report to Structured Format (for PDF/Excel generation)
   */
  formatReportForExport(report, format = 'json') {
    if (format === 'csv') {
      return this.convertToCSV(report);
    } else if (format === 'excel') {
      return this.convertToExcelFormat(report);
    } else if (format === 'pdf') {
      return this.convertToPDFFormat(report);
    }
    return report;
  }

  /**
   * Convert report to CSV format
   */
  convertToCSV(report) {
    const rows = [];
    
    // Header
    rows.push(['Report Type', report.metadata.report_type]);
    rows.push(['Generated At', report.metadata.generated_at]);
    rows.push([]);

    // Executive Summary
    if (report.executive_summary) {
      rows.push(['EXECUTIVE SUMMARY']);
      Object.entries(report.executive_summary).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          rows.push([key, value]);
        }
      });
      rows.push([]);
    }

    // Sections
    report.sections?.forEach(section => {
      rows.push([section.title.toUpperCase()]);
      rows.push(['Type', section.type]);
      
      if (section.data) {
        this.flattenObjectToCSV(section.data, rows);
      }
      rows.push([]);
    });

    return rows.map(row => row.join(',')).join('\n');
  }

  /**
   * Flatten object for CSV
   */
  flattenObjectToCSV(obj, rows, prefix = '') {
    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value === null || value === undefined) {
        rows.push([fullKey, '']);
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        this.flattenObjectToCSV(value, rows, fullKey);
      } else if (Array.isArray(value)) {
        rows.push([fullKey, JSON.stringify(value)]);
      } else {
        rows.push([fullKey, value]);
      }
    });
  }

  /**
   * Convert to Excel-friendly format
   */
  convertToExcelFormat(report) {
    const workbook = {
      sheets: []
    };

    // Summary Sheet
    if (report.executive_summary) {
      workbook.sheets.push({
        name: 'Executive Summary',
        data: this.objectToTableData(report.executive_summary)
      });
    }

    // Section Sheets
    report.sections?.forEach(section => {
      workbook.sheets.push({
        name: section.title.substring(0, 31), // Excel sheet name limit
        data: this.objectToTableData(section.data)
      });
    });

    return workbook;
  }

  /**
   * Convert object to table data
   */
  objectToTableData(obj, rows = [], prefix = '') {
    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value === null || value === undefined) {
        rows.push({ metric: fullKey, value: '' });
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        this.objectToTableData(value, rows, fullKey);
      } else if (Array.isArray(value)) {
        rows.push({ metric: fullKey, value: `Array[${value.length}]` });
      } else {
        rows.push({ metric: fullKey, value: value });
      }
    });
    return rows;
  }

  /**
   * Convert to PDF-friendly format
   */
  convertToPDFFormat(report) {
    return {
      title: `${report.metadata.report_type} Report`,
      generated_at: report.metadata.generated_at,
      sections: report.sections?.map(section => ({
        title: section.title,
        type: section.type,
        content: this.formatSectionForPDF(section)
      })) || []
    };
  }

  /**
   * Format section for PDF
   */
  formatSectionForPDF(section) {
    const content = [];

    if (section.data) {
      content.push({
        type: 'data',
        items: this.objectToTableData(section.data)
      });
    }

    if (section.charts) {
      content.push({
        type: 'charts',
        charts: section.charts
      });
    }

    if (section.recommendations) {
      content.push({
        type: 'recommendations',
        items: section.recommendations
      });
    }

    return content;
  }

  /**
   * Helper Functions
   */

  generateKeyInsights(dataMap) {
    const insights = [];

    if (dataMap.kpis) {
      const growth = dataMap.kpis.growth;
      
      if (growth?.matches_created?.trend === 'up') {
        insights.push({
          type: 'positive',
          message: `Match creation is trending upward with ${growth.matches_created.change_percent}% growth`
        });
      } else if (growth?.matches_created?.trend === 'down') {
        insights.push({
          type: 'negative',
          message: `Match creation is declining by ${Math.abs(growth.matches_created.change_percent)}%`
        });
      }

      const engagement = dataMap.kpis.engagement;
      if (engagement?.engagement_rate?.status === 'excellent') {
        insights.push({
          type: 'positive',
          message: `Excellent engagement rate at ${engagement.engagement_rate.value}%`
        });
      }
    }

    if (dataMap.health) {
      const health = dataMap.health;
      if (health.fill_rate_analysis?.anomalies_detected > 0) {
        insights.push({
          type: 'warning',
          message: `${health.fill_rate_analysis.anomalies_detected} anomalies detected in fill rates`
        });
      }
    }

    return insights;
  }

  generateKPICharts(kpiData) {
    return {
      growth_comparison: {
        type: 'bar',
        data: [
          { label: 'Matches', current: kpiData.growth?.matches_created?.current, previous: kpiData.growth?.matches_created?.previous },
          { label: 'Users', current: kpiData.growth?.new_users?.current, previous: kpiData.growth?.new_users?.previous },
          { label: 'Participations', current: kpiData.growth?.total_participations?.current, previous: kpiData.growth?.total_participations?.previous }
        ]
      },
      engagement_gauges: {
        type: 'gauge',
        metrics: [
          { name: 'Active Users', value: kpiData.engagement?.active_users?.achievement },
          { name: 'Engagement Rate', value: kpiData.engagement?.engagement_rate?.achievement }
        ]
      }
    };
  }

  generateGrowthCharts(growthData) {
    return {
      trend_line: {
        type: 'line',
        data: growthData.matches?.smoothed || [],
        regression: growthData.matches?.regression
      },
      forecast: {
        type: 'forecast',
        historical: growthData.matches?.raw_data || [],
        predictions: growthData.matches?.forecast || []
      }
    };
  }

  interpretRegressionResults(regression) {
    if (!regression) return 'No regression data available';

    const r2 = regression.r2 * 100;
    const slope = regression.slope;

    let interpretation = '';

    if (r2 > 80) {
      interpretation += 'Strong predictive model (R² > 80%). ';
    } else if (r2 > 60) {
      interpretation += 'Moderate predictive model (R² > 60%). ';
    } else {
      interpretation += 'Weak predictive model (R² < 60%). ';
    }

    if (slope > 0.5) {
      interpretation += 'Strong positive growth trend.';
    } else if (slope > 0) {
      interpretation += 'Slight positive growth trend.';
    } else if (slope < -0.5) {
      interpretation += 'Strong negative trend.';
    } else {
      interpretation += 'Slight negative trend.';
    }

    return interpretation;
  }

  generateHealthRecommendations(healthData) {
    const recommendations = [];

    if (healthData.health_indicators?.match_creation?.status === 'poor') {
      recommendations.push({
        priority: 'high',
        area: 'match_creation',
        issue: 'Low match creation rate',
        action: 'Implement promotional campaigns to encourage match creation',
        expected_impact: 'high'
      });
    }

    if (healthData.fill_rate_analysis?.mean < 60) {
      recommendations.push({
        priority: 'high',
        area: 'fill_rate',
        issue: 'Low average fill rate',
        action: 'Improve match visibility and recommendation algorithm',
        expected_impact: 'high'
      });
    }

    if (healthData.health_indicators?.user_activity?.status === 'poor') {
      recommendations.push({
        priority: 'medium',
        area: 'engagement',
        issue: 'Low user activity',
        action: 'Implement retention campaigns and push notifications',
        expected_impact: 'medium'
      });
    }

    return recommendations;
  }

  identifyCriticalIssues(healthData) {
    const issues = [];

    if (healthData.growth?.trend === 'decline') {
      issues.push({
        severity: 'critical',
        area: 'growth',
        description: 'Platform growth is declining',
        metrics: healthData.growth
      });
    }

    if (healthData.fill_rate_analysis?.anomalies_detected > 5) {
      issues.push({
        severity: 'high',
        area: 'fill_rates',
        description: `Multiple anomalies detected (${healthData.fill_rate_analysis.anomalies_detected})`,
        metrics: healthData.fill_rate_analysis
      });
    }

    return issues;
  }

  identifyOptimizationOpportunities(funnelData) {
    const opportunities = [];

    funnelData.funnel?.forEach((stage, index) => {
      if (stage.drop_off > 0 && stage.conversion_from_previous < 50) {
        opportunities.push({
          stage: stage.stage,
          issue: `High drop-off rate (${100 - stage.conversion_from_previous.toFixed(1)}%)`,
          potential_improvement: `Recover ${Math.round(stage.drop_off * 0.3)} users`,
          recommendations: this.getStageRecommendations(stage.stage)
        });
      }
    });

    return opportunities;
  }

  getStageRecommendations(stage) {
    const recommendations = {
      browsing: ['Improve UI/UX', 'Add more filters', 'Enhance match recommendations'],
      joining: ['Simplify join process', 'Add social proof', 'Show match benefits'],
      completion: ['Send reminders', 'Improve match quality', 'Add incentives'],
      rating: ['Make rating easier', 'Add rating prompts', 'Gamify ratings']
    };

    return recommendations[stage] || ['Review user feedback', 'Conduct user testing'];
  }

  interpretComparative(comparative) {
    const percentile = comparative.percentile_rank?.overall || 0;
    
    if (percentile >= 90) {
      return 'Top 10% performer - Exceptional performance';
    } else if (percentile >= 75) {
      return 'Top 25% performer - Above average performance';
    } else if (percentile >= 50) {
      return 'Top 50% performer - Average performance';
    } else if (percentile >= 25) {
      return 'Bottom 50% performer - Below average performance';
    } else {
      return 'Bottom 25% performer - Needs improvement';
    }
  }
}

module.exports = new ReportService();


