/**
 * VAXGUARD Predictive Cold-Chain Spoilage Risk Engine
 * Academic Rule-Based Predictive Calculation Service (Node.js/TypeScript)
 *
 * Core Equation & Logic:
 * Factors:
 * 1. Proximity to boundaries (Upper limit SafeMax e.g. 8°C, Lower limit SafeMin e.g. 2°C)
 * 2. Temperature Gradient / Velocity (dT/dt in °C per hour)
 * 3. Projected Excursion Time (minutes to hit boundary at current rate)
 * 4. Travel Time Vulnerability (Remaining travel duration vs thermal inertia)
 * 5. Cumulative Thermal Exposure (Historical standard deviations & past excursions)
 */

export interface RiskAnalysisInput {
  currentTemperature: number;
  safeMinTemperature: number;
  safeMaxTemperature: number;
  remainingTravelTime: number; // in hours
  temperatureHistory?: Array<{ temperature: number; recordedAt: Date | string }>;
  vaccineSensitivity?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface RiskAnalysisOutput {
  riskScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  predictedExcursionMinutes: number; // 0 if safe or projected minutes
  temperatureTrend: 'RISING_FAST' | 'RISING_MODERATE' | 'STABLE' | 'COOLING_MODERATE' | 'COOLING_FAST';
  rateOfChangePerHour: number; // °C per hour
  isCurrentExcursion: boolean;
  recommendedAction: string;
  factorBreakdown: {
    proximityScore: number;
    velocityScore: number;
    durationExposureScore: number;
    travelVulnerabilityScore: number;
  };
  explanation: string;
}

export function calculatePredictiveRisk(input: RiskAnalysisInput): RiskAnalysisOutput {
  const {
    currentTemperature,
    safeMinTemperature = 2.0,
    safeMaxTemperature = 8.0,
    remainingTravelTime = 4.0,
    temperatureHistory = [],
    vaccineSensitivity = 'HIGH',
  } = input;

  const safeRangeSpan = safeMaxTemperature - safeMinTemperature;
  const safeMid = (safeMinTemperature + safeMaxTemperature) / 2; // e.g., 5.0°C

  // 1. Current Excursion Check
  const isTooHigh = currentTemperature > safeMaxTemperature;
  const isTooLow = currentTemperature < safeMinTemperature;
  const isCurrentExcursion = isTooHigh || isTooLow;

  // 2. Velocity / Rate of Change Calculation (°C / hour)
  let rateOfChangePerHour = 0;
  if (temperatureHistory && temperatureHistory.length >= 2) {
    const recent = [...temperatureHistory].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    const latest = recent[0];
    const previous = recent[Math.min(recent.length - 1, 3)]; // lookback 1-3 points
    const timeDiffHours = Math.max(
      0.083, // minimum 5 minutes
      (new Date(latest.recordedAt).getTime() - new Date(previous.recordedAt).getTime()) / (1000 * 60 * 60)
    );
    rateOfChangePerHour = Number(((latest.temperature - previous.temperature) / timeDiffHours).toFixed(2));
  } else {
    // If no history, assume modest positive drift if temp is high
    rateOfChangePerHour = currentTemperature > safeMid ? 0.35 : 0.0;
  }

  // Determine trend category
  let temperatureTrend: 'RISING_FAST' | 'RISING_MODERATE' | 'STABLE' | 'COOLING_MODERATE' | 'COOLING_FAST' = 'STABLE';
  if (rateOfChangePerHour > 1.2) temperatureTrend = 'RISING_FAST';
  else if (rateOfChangePerHour > 0.3) temperatureTrend = 'RISING_MODERATE';
  else if (rateOfChangePerHour < -1.2) temperatureTrend = 'COOLING_FAST';
  else if (rateOfChangePerHour < -0.3) temperatureTrend = 'COOLING_MODERATE';
  else temperatureTrend = 'STABLE';

  // 3. Predicted Excursion Calculation (Minutes until upper or lower breach)
  let predictedExcursionMinutes = 0;
  if (isCurrentExcursion) {
    predictedExcursionMinutes = 0; // Already breached
  } else if (rateOfChangePerHour > 0.1) {
    const tempHeadroom = safeMaxTemperature - currentTemperature;
    const hoursToBreach = tempHeadroom / rateOfChangePerHour;
    predictedExcursionMinutes = Math.max(1, Math.round(hoursToBreach * 60));
  } else if (rateOfChangePerHour < -0.1) {
    const tempFootroom = currentTemperature - safeMinTemperature;
    const hoursToBreach = tempFootroom / Math.abs(rateOfChangePerHour);
    predictedExcursionMinutes = Math.max(1, Math.round(hoursToBreach * 60));
  }

  // 4. Component Risk Scores (0 - 100 for each factor)

  // Factor A: Proximity to boundaries (0 to 40 weight)
  let proximityScore = 0;
  if (isCurrentExcursion) {
    const breachDistance = isTooHigh
      ? currentTemperature - safeMaxTemperature
      : safeMinTemperature - currentTemperature;
    proximityScore = Math.min(40, 30 + breachDistance * 10);
  } else {
    const distanceFromCenter = Math.abs(currentTemperature - safeMid);
    const halfSpan = safeRangeSpan / 2;
    proximityScore = Math.min(30, (distanceFromCenter / halfSpan) * 30);
  }

  // Factor B: Velocity Score (0 to 30 weight)
  let velocityScore = 0;
  const absVelocity = Math.abs(rateOfChangePerHour);
  if (rateOfChangePerHour > 0 && currentTemperature >= safeMid) {
    velocityScore = Math.min(30, absVelocity * 15);
  } else if (rateOfChangePerHour < 0 && currentTemperature <= safeMid) {
    velocityScore = Math.min(30, absVelocity * 15);
  } else {
    velocityScore = Math.min(10, absVelocity * 5);
  }

  // Factor C: Duration Exposure & Historical Variance (0 to 15 weight)
  let durationExposureScore = 0;
  const historicalExcursions = temperatureHistory.filter(
    (h) => h.temperature > safeMaxTemperature || h.temperature < safeMinTemperature
  ).length;
  durationExposureScore = Math.min(15, historicalExcursions * 5);

  // Factor D: Travel Vulnerability (0 to 15 weight)
  // Higher risk if long remaining travel and positive temperature drift
  let travelVulnerabilityScore = 0;
  if (remainingTravelTime > 0) {
    const projectedFinalTemp = currentTemperature + rateOfChangePerHour * remainingTravelTime;
    if (projectedFinalTemp > safeMaxTemperature || projectedFinalTemp < safeMinTemperature) {
      travelVulnerabilityScore = Math.min(15, (remainingTravelTime / 8) * 15);
    } else {
      travelVulnerabilityScore = Math.min(5, (remainingTravelTime / 12) * 5);
    }
  }

  // Sensitivity multiplier
  let sensitivityMultiplier = 1.0;
  if (vaccineSensitivity === 'CRITICAL') sensitivityMultiplier = 1.25;
  if (vaccineSensitivity === 'MODERATE') sensitivityMultiplier = 0.9;
  if (vaccineSensitivity === 'LOW') sensitivityMultiplier = 0.8;

  // Composite raw score
  let rawScore = (proximityScore + velocityScore + durationExposureScore + travelVulnerabilityScore) * sensitivityMultiplier;
  
  if (isCurrentExcursion) {
    // If actively out of bounds, floor at 65 (HIGH or CRITICAL)
    const extraOver = isTooHigh ? currentTemperature - safeMaxTemperature : safeMinTemperature - currentTemperature;
    rawScore = Math.max(70, 70 + extraOver * 8);
  }

  const finalRiskScore = Math.min(100, Math.max(5, Math.round(rawScore)));

  // Risk Level Classification
  let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (finalRiskScore >= 81) riskLevel = 'CRITICAL';
  else if (finalRiskScore >= 61) riskLevel = 'HIGH';
  else if (finalRiskScore >= 31) riskLevel = 'MODERATE';
  else riskLevel = 'LOW';

  // Recommended Action & Actionable Advice
  let recommendedAction = 'Maintain current refrigerated carrier operation. Normal temperature range.';
  let explanation = `Temperature is stable at ${currentTemperature.toFixed(1)}°C within safe bounds (${safeMinTemperature}°C to ${safeMaxTemperature}°C).`;

  if (riskLevel === 'CRITICAL') {
    if (isCurrentExcursion) {
      recommendedAction = `CRITICAL EXCURSION: Immediate diversion required. Transfer ${currentTemperature.toFixed(1)}°C cargo to nearest backup cold-chain hub or activate aux dry-ice cooling!`;
      explanation = `Shipment is currently outside safe parameters by ${(isTooHigh ? currentTemperature - safeMaxTemperature : safeMinTemperature - currentTemperature).toFixed(1)}°C. High probability of thermal degradation.`;
    } else {
      recommendedAction = `PREDICTED EXCURSION in ${predictedExcursionMinutes} min: Move shipment to backup cold storage or replenish phase change materials immediately.`;
      explanation = `High rate of temperature rise (+${rateOfChangePerHour.toFixed(2)}°C/h) threatens threshold breach before destination ETA.`;
    }
  } else if (riskLevel === 'HIGH') {
    if (predictedExcursionMinutes > 0 && predictedExcursionMinutes < 120) {
      recommendedAction = `Predicted excursion in ${predictedExcursionMinutes} mins. Inspect refrigeration seal and prepare intermediate cold hub handoff.`;
      explanation = `Rapid temperature gradient (+${rateOfChangePerHour.toFixed(2)}°C/h) detected. Margin to upper threshold (${safeMaxTemperature}°C) is narrowing.`;
    } else {
      recommendedAction = `Accelerate transit or verify carrier cooling compressor status. Monitor sensor logs closely every 15 minutes.`;
      explanation = `Approaching safe boundary with ${remainingTravelTime.toFixed(1)}h transit remaining.`;
    }
  } else if (riskLevel === 'MODERATE') {
    recommendedAction = `Moderate thermal drift observed (+${rateOfChangePerHour.toFixed(2)}°C/h). Verify active carrier airflow and maintain planned route.`;
    explanation = `Thermal metrics remain within tolerable boundary but trend requires automated oversight.`;
  }

  return {
    riskScore: finalRiskScore,
    riskLevel,
    predictedExcursionMinutes,
    temperatureTrend,
    rateOfChangePerHour,
    isCurrentExcursion,
    recommendedAction,
    factorBreakdown: {
      proximityScore: Math.round(proximityScore),
      velocityScore: Math.round(velocityScore),
      durationExposureScore: Math.round(durationExposureScore),
      travelVulnerabilityScore: Math.round(travelVulnerabilityScore),
    },
    explanation,
  };
}
