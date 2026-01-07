/**
 * Statistical Models & Mathematical Functions
 * Advanced statistical analysis for analytics
 */

class StatisticalModels {
  /**
   * Linear Regression
   * y = mx + b
   */
  linearRegression(data) {
    const n = data.length;
    if (n === 0) return null;

    const x = data.map((_, i) => i);
    const y = data.map(d => d.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const r2 = 1 - (ssResidual / ssTotal);

    return {
      slope,
      intercept,
      r2,
      trend: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
      equation: `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`
    };
  }

  /**
   * Moving Average
   */
  movingAverage(data, window = 7) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const end = i + 1;
      const windowData = data.slice(start, end);
      const avg = windowData.reduce((sum, d) => sum + d.value, 0) / windowData.length;
      result.push({
        date: data[i].date,
        value: Math.round(avg * 100) / 100
      });
    }
    return result;
  }

  /**
   * Exponential Smoothing
   */
  exponentialSmoothing(data, alpha = 0.3) {
    if (data.length === 0) return [];

    const result = [{ date: data[0].date, value: data[0].value }];

    for (let i = 1; i < data.length; i++) {
      const smoothed = alpha * data[i].value + (1 - alpha) * result[i - 1].value;
      result.push({
        date: data[i].date,
        value: Math.round(smoothed * 100) / 100
      });
    }

    return result;
  }

  /**
   * Forecast next periods using linear regression
   */
  forecastNextPeriods(data, periods = 7) {
    const regression = this.linearRegression(data);
    if (!regression) return [];

    const forecast = [];
    const lastIndex = data.length - 1;

    for (let i = 1; i <= periods; i++) {
      const nextIndex = lastIndex + i;
      const predicted = regression.slope * nextIndex + regression.intercept;
      
      // Add prediction date (assuming daily data)
      const lastDate = new Date(data[data.length - 1].date);
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + i);

      forecast.push({
        date: nextDate.toISOString().split('T')[0],
        value: Math.max(0, Math.round(predicted * 100) / 100)
      });
    }

    return forecast;
  }

  /**
   * Calculate basic statistics
   */
  calculateStatistics(values) {
    if (values.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: values.length
    };
  }

  /**
   * Calculate growth rate
   */
  calculateGrowthRate(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Correlation coefficient
   */
  correlation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Seasonality Analysis
   */
  seasonalityAnalysis(data, period = 7) {
    if (data.length < period * 2) {
      return {
        hasSeasonality: false,
        strength: 0,
        peakDay: null,
        lowDay: null
      };
    }

    const values = data.map(d => d.value);
    const stats = this.calculateStatistics(values);
    
    // Calculate coefficient of variation
    const cv = stats.stdDev / stats.mean;

    // Find peak and low days
    const peakDay = values.indexOf(Math.max(...values));
    const lowDay = values.indexOf(Math.min(...values));

    return {
      hasSeasonality: cv > 0.2, // Significant variation
      strength: Math.min(100, Math.round(cv * 100)),
      peakDay,
      lowDay,
      statistics: stats
    };
  }

  /**
   * Detect Anomalies (Z-score method)
   */
  detectAnomalies(values, threshold = 2) {
    const stats = this.calculateStatistics(values);
    const anomalies = [];

    values.forEach((value, index) => {
      const zScore = (value - stats.mean) / stats.stdDev;
      if (Math.abs(zScore) > threshold) {
        anomalies.push({
          index,
          value,
          zScore: Math.round(zScore * 100) / 100,
          type: zScore > 0 ? 'high' : 'low'
        });
      }
    });

    return anomalies;
  }

  /**
   * Calculate Weighted Score
   */
  calculateWeightedScore(metrics) {
    let totalScore = 0;
    let totalWeight = 0;

    Object.values(metrics).forEach(metric => {
      totalScore += metric.value * metric.weight;
      totalWeight += metric.weight;
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Classify Performance
   */
  classifyPerformance(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'average';
    if (score >= 40) return 'below_average';
    return 'poor';
  }

  /**
   * Monte Carlo Simulation
   */
  monteCarloSimulation(baseValue, volatility, iterations = 1000) {
    const results = [];

    for (let i = 0; i < iterations; i++) {
      // Random normal distribution (Box-Muller transform)
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      
      // Simulate value
      const simulated = baseValue * (1 + volatility * z);
      results.push(Math.max(0, simulated));
    }

    results.sort((a, b) => a - b);

    return {
      mean: results.reduce((a, b) => a + b, 0) / results.length,
      median: results[Math.floor(results.length / 2)],
      percentile5: results[Math.floor(results.length * 0.05)],
      percentile95: results[Math.floor(results.length * 0.95)],
      min: results[0],
      max: results[results.length - 1]
    };
  }
}

module.exports = new StatisticalModels();
