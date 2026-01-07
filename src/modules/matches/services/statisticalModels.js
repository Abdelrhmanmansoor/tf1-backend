/**
 * Statistical Models Service
 * Real statistical models for analytics (NO AI/ML libraries)
 * Pure mathematical implementations
 */

class StatisticalModels {
  /**
   * Linear Regression Model
   * Used for predicting trends based on historical data
   */
  linearRegression(dataPoints) {
    if (!dataPoints || dataPoints.length < 2) {
      return { slope: 0, intercept: 0, r2: 0, prediction: null };
    }

    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    dataPoints.forEach((point, index) => {
      const x = index;
      const y = point.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R² (coefficient of determination)
    const meanY = sumY / n;
    let ssTotal = 0, ssResidual = 0;
    dataPoints.forEach((point, index) => {
      const predicted = slope * index + intercept;
      ssTotal += Math.pow(point.value - meanY, 2);
      ssResidual += Math.pow(point.value - predicted, 2);
    });
    const r2 = 1 - (ssResidual / ssTotal);

    // Predict next value
    const nextX = n;
    const prediction = slope * nextX + intercept;

    return {
      slope,
      intercept,
      r2: Math.max(0, Math.min(1, r2)), // Clamp between 0 and 1
      prediction: Math.max(0, prediction), // Can't be negative
      trend: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable'
    };
  }

  /**
   * Moving Average - Smooths out short-term fluctuations
   */
  movingAverage(data, window = 7) {
    if (data.length < window) return data;

    const result = [];
    for (let i = 0; i <= data.length - window; i++) {
      const slice = data.slice(i, i + window);
      const avg = slice.reduce((sum, val) => sum + val.value, 0) / window;
      result.push({
        date: data[i + window - 1].date,
        value: Math.round(avg * 100) / 100
      });
    }
    return result;
  }

  /**
   * Exponential Smoothing - More weight on recent data
   */
  exponentialSmoothing(data, alpha = 0.3) {
    if (!data || data.length === 0) return [];

    const result = [data[0]];
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
   * Standard Deviation & Variance
   */
  calculateStatistics(values) {
    if (!values || values.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, variance: 0, min: 0, max: 0 };
    }

    const n = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / n;

    // Variance
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Median
    const sorted = [...values].sort((a, b) => a - b);
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values)
    };
  }

  /**
   * Correlation Coefficient (Pearson)
   * Measures relationship between two variables (-1 to 1)
   */
  correlation(x, y) {
    if (!x || !y || x.length !== y.length || x.length < 2) {
      return 0;
    }

    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      sumX2 += dx * dx;
      sumY2 += dy * dy;
    }

    const denominator = Math.sqrt(sumX2 * sumY2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Percentile Calculation
   */
  percentile(values, p) {
    if (!values || values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Seasonal Decomposition
   * Identifies patterns that repeat at regular intervals
   */
  seasonalityAnalysis(data, period = 7) {
    if (data.length < period * 2) {
      return { hasSeasonality: false, pattern: [] };
    }

    // Calculate average for each position in the cycle
    const seasonalPattern = new Array(period).fill(0);
    const counts = new Array(period).fill(0);

    data.forEach((point, index) => {
      const position = index % period;
      seasonalPattern[position] += point.value;
      counts[position]++;
    });

    // Average each seasonal component
    for (let i = 0; i < period; i++) {
      seasonalPattern[i] = counts[i] > 0 ? seasonalPattern[i] / counts[i] : 0;
    }

    // Calculate strength of seasonality
    const overallMean = data.reduce((sum, p) => sum + p.value, 0) / data.length;
    const seasonalVariance = seasonalPattern.reduce((sum, val) => 
      sum + Math.pow(val - overallMean, 2), 0) / period;
    const dataVariance = data.reduce((sum, p) => 
      sum + Math.pow(p.value - overallMean, 2), 0) / data.length;
    
    const seasonalityStrength = dataVariance > 0 ? seasonalVariance / dataVariance : 0;

    return {
      hasSeasonality: seasonalityStrength > 0.15,
      strength: Math.round(seasonalityStrength * 100),
      pattern: seasonalPattern.map(v => Math.round(v * 100) / 100),
      peakDay: seasonalPattern.indexOf(Math.max(...seasonalPattern)),
      lowDay: seasonalPattern.indexOf(Math.min(...seasonalPattern))
    };
  }

  /**
   * Growth Rate Analysis
   */
  calculateGrowthRate(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Compound Annual Growth Rate (CAGR)
   */
  calculateCAGR(initialValue, finalValue, periods) {
    if (initialValue <= 0 || periods <= 0) return 0;
    return (Math.pow(finalValue / initialValue, 1 / periods) - 1) * 100;
  }

  /**
   * Z-Score Normalization
   * Identifies outliers (|z| > 2 is unusual, |z| > 3 is rare)
   */
  calculateZScores(values) {
    const stats = this.calculateStatistics(values);
    if (stats.stdDev === 0) return values.map(() => 0);

    return values.map(val => (val - stats.mean) / stats.stdDev);
  }

  /**
   * Time Series Forecast using Simple Exponential Smoothing
   */
  forecastNextPeriods(data, periods = 7, alpha = 0.3) {
    if (!data || data.length < 3) {
      return [];
    }

    // Get smoothed series
    const smoothed = this.exponentialSmoothing(data, alpha);
    const lastValue = smoothed[smoothed.length - 1].value;
    
    // Get trend from linear regression
    const regression = this.linearRegression(data);
    
    const forecasts = [];
    for (let i = 1; i <= periods; i++) {
      const forecast = lastValue + (regression.slope * i);
      forecasts.push({
        period: i,
        forecast: Math.max(0, Math.round(forecast * 100) / 100),
        confidence: Math.max(0, Math.min(100, regression.r2 * 100))
      });
    }

    return forecasts;
  }

  /**
   * Classification based on thresholds
   */
  classifyPerformance(value, thresholds = { poor: 30, average: 60, good: 80 }) {
    if (value >= thresholds.good) return 'excellent';
    if (value >= thresholds.average) return 'good';
    if (value >= thresholds.poor) return 'average';
    return 'poor';
  }

  /**
   * Weighted Score Calculation
   */
  calculateWeightedScore(metrics) {
    let totalWeight = 0;
    let weightedSum = 0;

    Object.keys(metrics).forEach(key => {
      const { value, weight } = metrics[key];
      weightedSum += value * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  }

  /**
   * Anomaly Detection using IQR method
   */
  detectAnomalies(values) {
    if (!values || values.length < 4) return [];

    const q1 = this.percentile(values, 25);
    const q3 = this.percentile(values, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const anomalies = [];
    values.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        anomalies.push({
          index,
          value,
          type: value < lowerBound ? 'low' : 'high',
          deviation: value < lowerBound 
            ? Math.abs(value - lowerBound)
            : Math.abs(value - upperBound)
        });
      }
    });

    return anomalies;
  }

  /**
   * Monte Carlo Simulation for Risk Assessment
   */
  monteCarloSimulation(baseValue, volatility, iterations = 1000) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      
      const change = z * volatility;
      const simulatedValue = baseValue * (1 + change);
      results.push(Math.max(0, simulatedValue));
    }

    const stats = this.calculateStatistics(results);
    return {
      mean: stats.mean,
      median: stats.median,
      stdDev: stats.stdDev,
      percentile5: this.percentile(results, 5),
      percentile95: this.percentile(results, 95),
      confidence90Range: [
        this.percentile(results, 5),
        this.percentile(results, 95)
      ]
    };
  }
}

module.exports = new StatisticalModels();

