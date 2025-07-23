// Statistical analysis utilities for TGI calculations based on PMID:32277094

export interface TGIStatistics {
  tgi: number;
  tgiSEM: number;
  pValue: number;
  significance: string;
  n: number;
  treatmentGrowth: number;
  controlGrowth: number;
  treatmentGrowthSEM: number;
  controlGrowthSEM: number;
}

// Calculate TGI using the proper formula from the publication
export function calculateTGI(
  treatmentVolumes: number[],
  controlVolumes: number[],
  treatmentBaseline: number[],
  controlBaseline: number[]
): TGIStatistics {
  // Calculate individual growth rates (Vi/V0 - 1) for each animal
  const treatmentGrowthRates = treatmentVolumes.map((vol, i) => 
    (vol / treatmentBaseline[i]) - 1
  );
  
  const controlGrowthRates = controlVolumes.map((vol, i) => 
    (vol / controlBaseline[i]) - 1
  );
  
  // Calculate mean growth rates
  const treatmentMeanGrowth = mean(treatmentGrowthRates);
  const controlMeanGrowth = mean(controlGrowthRates);
  
  // Calculate TGI using the formula: TGI = (1 - ΔT/ΔC) × 100
  // where ΔT = mean treatment growth rate and ΔC = mean control growth rate
  const tgi = controlMeanGrowth > 0 ? 
    (1 - treatmentMeanGrowth / controlMeanGrowth) * 100 : 0;
    
  // Calculate standard errors
  const treatmentSEM = standardError(treatmentGrowthRates);
  const controlSEM = standardError(controlGrowthRates);
  
  // Calculate TGI standard error using error propagation
  const tgiSEM = controlMeanGrowth > 0 ? 
    (100 / controlMeanGrowth) * Math.sqrt(treatmentSEM ** 2 + (treatmentMeanGrowth ** 2 / controlMeanGrowth ** 2) * controlSEM ** 2) : 0;
  
  // Perform statistical test (Welch's t-test for unequal variances)
  const tTestResult = welchTTest(treatmentGrowthRates, controlGrowthRates);
  
  return {
    tgi,
    tgiSEM,
    pValue: tTestResult.pValue,
    significance: getSignificanceLevel(tTestResult.pValue),
    n: treatmentVolumes.length,
    treatmentGrowth: treatmentMeanGrowth * 100, // Convert to percentage
    controlGrowth: controlMeanGrowth * 100,
    treatmentGrowthSEM: treatmentSEM * 100,
    controlGrowthSEM: controlSEM * 100
  };
}

// Statistical helper functions
export function mean(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  const meanVal = mean(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - meanVal, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function standardError(values: number[]): number {
  return standardDeviation(values) / Math.sqrt(values.length);
}

// Welch's t-test for unequal variances
export function welchTTest(group1: number[], group2: number[]): { tStatistic: number; pValue: number; degreesOfFreedom: number } {
  const n1 = group1.length;
  const n2 = group2.length;
  
  const mean1 = mean(group1);
  const mean2 = mean(group2);
  
  const var1 = standardDeviation(group1) ** 2;
  const var2 = standardDeviation(group2) ** 2;
  
  // Welch's t-statistic
  const tStatistic = (mean1 - mean2) / Math.sqrt(var1/n1 + var2/n2);
  
  // Welch-Satterthwaite degrees of freedom
  const degreesOfFreedom = Math.pow(var1/n1 + var2/n2, 2) / 
    (Math.pow(var1/n1, 2)/(n1-1) + Math.pow(var2/n2, 2)/(n2-1));
  
  // Calculate p-value using t-distribution approximation
  const pValue = 2 * (1 - tCDF(Math.abs(tStatistic), degreesOfFreedom));
  
  return { tStatistic, pValue, degreesOfFreedom };
}

// Approximation of t-distribution CDF using normal approximation for large df
export function tCDF(t: number, df: number): number {
  if (df > 30) {
    // Use normal approximation for large degrees of freedom
    return normalCDF(t);
  }
  
  // Simple approximation for smaller df
  const x = df / (t * t + df);
  return 1 - 0.5 * incompleteBeta(df/2, 0.5, x);
}

// Normal CDF approximation
export function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

// Error function approximation
export function erf(x: number): number {
  // Abramowitz and Stegun approximation
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return sign * y;
}

// Incomplete beta function approximation (simplified)
export function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  
  // Simple approximation - in practice, you'd want a more accurate implementation
  return Math.pow(x, a) * Math.pow(1 - x, b) / (a * beta(a, b));
}

// Beta function
export function beta(a: number, b: number): number {
  return gamma(a) * gamma(b) / gamma(a + b);
}

// Gamma function approximation (Stirling's approximation)
export function gamma(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  
  z -= 1;
  let x = 0.99999999999980993;
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  
  for (let i = 0; i < coefficients.length; i++) {
    x += coefficients[i] / (z + i + 1);
  }
  
  const t = z + coefficients.length - 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

export function getSignificanceLevel(pValue: number): string {
  if (pValue < 0.001) return '***';
  if (pValue < 0.01) return '**';
  if (pValue < 0.05) return '*';
  return 'ns';
}

// Calculate TGI at a specific timepoint with proper statistics
export function calculateTGIAtTimepoint(
  treatmentData: { animalId: string; baseline: number; volume: number }[],
  controlData: { animalId: string; baseline: number; volume: number }[]
): TGIStatistics {
  const treatmentVolumes = treatmentData.map(d => d.volume);
  const controlVolumes = controlData.map(d => d.volume);
  const treatmentBaselines = treatmentData.map(d => d.baseline);
  const controlBaselines = controlData.map(d => d.baseline);
  
  return calculateTGI(treatmentVolumes, controlVolumes, treatmentBaselines, controlBaselines);
}