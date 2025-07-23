export class TumorStatisticalAnalysis {
  confidenceLevel: number;
  alpha: number;

  constructor() {
    this.confidenceLevel = 0.95;
    this.alpha = 0.05;
  }

  // Advanced TGI calculations with statistical testing
  calculateAdvancedTGI(controlGroup, treatmentGroups, timepoints) {
    const results = {
      timepoints: [],
      overallAnalysis: {},
      groupComparisons: []
    };

    timepoints.forEach(timepoint => {
      const controlData = this.extractTimePointData(controlGroup, timepoint);
      const timepointResults = {
        day: timepoint,
        controlStats: this.calculateDescriptiveStats(controlData),
        treatments: []
      };

      treatmentGroups.forEach(treatmentGroup => {
        const treatmentData = this.extractTimePointData(treatmentGroup.animals, timepoint);
        if (controlData.length > 0 && treatmentData.length > 0) {
          const tgiAnalysis = this.performTGIAnalysis(controlData, treatmentData, treatmentGroup.name);
          timepointResults.treatments.push(tgiAnalysis);
        }
      });

      results.timepoints.push(timepointResults);
    });

    // Overall longitudinal analysis
    results.overallAnalysis = this.performLongitudinalAnalysis(controlGroup, treatmentGroups);

    return results;
  }

  performTGIAnalysis(controlData, treatmentData, treatmentName) {
    const controlMean = this.mean(controlData);
    const treatmentMean = this.mean(treatmentData);
    const tgi = ((controlMean - treatmentMean) / controlMean) * 100;
    const tTestResult = this.tTest(controlData, treatmentData);
    const mannWhitneyResult = this.mannWhitneyU(controlData, treatmentData);
    const cohensD = this.calculateCohensD(controlData, treatmentData);
    const tgiCI = this.bootstrapTGIConfidenceInterval(controlData, treatmentData, 1000);
    return {
      treatmentName: treatmentName,
      n_control: controlData.length,
      n_treatment: treatmentData.length,
      controlMean: controlMean,
      controlSD: this.standardDeviation(controlData),
      treatmentMean: treatmentMean,
      treatmentSD: this.standardDeviation(treatmentData),
      tgi: tgi,
      tgiCI: tgiCI,
      tTest: tTestResult,
      mannWhitney: mannWhitneyResult,
      cohensD: cohensD,
      interpretation: this.interpretTGI(tgi, tTestResult.pValue)
    };
  }

  // Descriptive stats
  calculateDescriptiveStats(data) {
    return {
      mean: this.mean(data),
      sd: this.standardDeviation(data),
      sem: this.standardDeviation(data) / Math.sqrt(data.length),
      n: data.length
    };
  }

  // Two-sample t-test (Welch's)
  tTest(group1, group2) {
    const n1 = group1.length;
    const n2 = group2.length;
    const mean1 = this.mean(group1);
    const mean2 = this.mean(group2);
    const var1 = this.variance(group1);
    const var2 = this.variance(group2);
    const pooledSE = Math.sqrt(var1/n1 + var2/n2);
    const tStatistic = (mean1 - mean2) / pooledSE;
    const df = Math.pow(var1/n1 + var2/n2, 2) /
               (Math.pow(var1/n1, 2)/(n1-1) + Math.pow(var2/n2, 2)/(n2-1));
    const pValue = this.tDistributionPValue(tStatistic, df);
    return {
      tStatistic: tStatistic,
      degreesOfFreedom: df,
      pValue: pValue,
      significant: pValue < this.alpha,
      confidenceInterval: this.tTestConfidenceInterval(mean1, mean2, pooledSE, df)
    };
  }

  // Mann-Whitney U test (non-parametric)
  mannWhitneyU(group1, group2) {
    const combined = [...group1.map(v => ({value: v, group: 1})),
                     ...group2.map(v => ({value: v, group: 2}))];
    combined.sort((a, b) => a.value - b.value);
    let rank = 1;
    for (let i = 0; i < combined.length; i++) {
      let tieCount = 1;
      while (i + tieCount < combined.length &&
             combined[i].value === combined[i + tieCount].value) {
        tieCount++;
      }
      const avgRank = rank + (tieCount - 1) / 2;
      for (let j = 0; j < tieCount; j++) {
        combined[i + j].rank = avgRank;
      }
      rank += tieCount;
      i += tieCount - 1;
    }
    const r1 = combined.filter(item => item.group === 1)
                      .reduce((sum, item) => sum + item.rank, 0);
    const n1 = group1.length;
    const n2 = group2.length;
    const u1 = r1 - (n1 * (n1 + 1)) / 2;
    const u2 = n1 * n2 - u1;
    const u = Math.min(u1, u2);
    const meanU = (n1 * n2) / 2;
    const sdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const zScore = (u - meanU) / sdU;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    return {
      uStatistic: u,
      zScore: zScore,
      pValue: pValue,
      significant: pValue < this.alpha
    };
  }

  // Bootstrap confidence interval for TGI
  bootstrapTGIConfidenceInterval(controlData, treatmentData, nBootstrap = 1000) {
    const tgiBootstrap = [];
    for (let i = 0; i < nBootstrap; i++) {
      const controlBootstrap = this.resample(controlData);
      const treatmentBootstrap = this.resample(treatmentData);
      const controlMean = this.mean(controlBootstrap);
      const treatmentMean = this.mean(treatmentBootstrap);
      const tgi = ((controlMean - treatmentMean) / controlMean) * 100;
      tgiBootstrap.push(tgi);
    }
    tgiBootstrap.sort((a, b) => a - b);
    const lowerIndex = Math.floor((1 - this.confidenceLevel) / 2 * nBootstrap);
    const upperIndex = Math.floor((1 + this.confidenceLevel) / 2 * nBootstrap);
    return {
      lower: tgiBootstrap[lowerIndex],
      upper: tgiBootstrap[upperIndex],
      level: this.confidenceLevel
    };
  }

  // Utility methods
  extractTimePointData(group, timepoint) {
    const data = [];
    group.forEach(animal => {
      const measurement = animal.measurements.find(m => m.studyDay === timepoint);
      if (measurement && measurement.measurements.tumorVolume) {
        data.push(measurement.measurements.tumorVolume);
      }
    });
    return data;
  }

  mean(data) {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  variance(data) {
    const mean = this.mean(data);
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      (data.length - 1);
  }

  standardDeviation(data) {
    return Math.sqrt(this.variance(data));
  }

  calculateCohensD(group1, group2) {
    const mean1 = this.mean(group1);
    const mean2 = this.mean(group2);
    const pooledSD = Math.sqrt(((group1.length - 1) * this.variance(group1) +
                               (group2.length - 1) * this.variance(group2)) /
                              (group1.length + group2.length - 2));
    return (mean1 - mean2) / pooledSD;
  }

  resample(data) {
    const resampled = [];
    for (let i = 0; i < data.length; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      resampled.push(data[randomIndex]);
    }
    return resampled;
  }

  // Statistical distribution functions (simplified)
  normalCDF(z) {
    return (1.0 + this.erf(z / Math.sqrt(2.0))) / 2.0;
  }

  erf(x) {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t *
      Math.exp(-x * x);
    return sign * y;
  }

  tDistributionPValue(t, df) {
    // Simplified t-distribution p-value calculation
    const z = Math.abs(t);
    return 2 * (1 - this.normalCDF(z));
  }

  interpretTGI(tgi, pValue) {
    let efficacy = 'No effect';
    if (tgi > 50 && pValue < 0.05) {
      efficacy = 'Highly effective';
    } else if (tgi > 30 && pValue < 0.05) {
      efficacy = 'Moderately effective';
    } else if (tgi > 10 && pValue < 0.05) {
      efficacy = 'Minimally effective';
    }
    return {
      efficacy: efficacy,
      tgiCategory: this.categorizeTGI(tgi),
      statisticalSignificance: pValue < 0.05 ? 'Significant' : 'Not significant'
    };
  }

  categorizeTGI(tgi) {
    if (tgi >= 100) return 'Tumor regression';
    if (tgi >= 50) return 'High inhibition';
    if (tgi >= 30) return 'Moderate inhibition';
    if (tgi >= 10) return 'Low inhibition';
    if (tgi >= 0) return 'Minimal inhibition';
    return 'Tumor acceleration';
  }

  // Placeholder for longitudinal analysis (ANOVA, etc.)
  performLongitudinalAnalysis(controlGroup, treatmentGroups) {
    // Implement as needed
    return {};
  }

  tTestConfidenceInterval(mean1, mean2, pooledSE, df) {
    // Placeholder: returns a simple CI
    const tCritical = 2.0; // Approximate for 95% CI
    const diff = mean1 - mean2;
    return {
      lower: diff - tCritical * pooledSE,
      upper: diff + tCritical * pooledSE
    };
  }
} 