// Utility function to validate sensor data
export const validateSensorData = (data) => {
  const { ph, tds, turbidity } = data

  const errors = []

  if (ph < 0 || ph > 14) {
    errors.push('pH must be between 0 and 14')
  }

  if (turbidity < 0) {
    errors.push('Turbidity cannot be negative')
  }

  if (tds < 0) {
    errors.push('TDS cannot be negative')
  }

  if (turbidity < 0) {
    errors.push('Turbidity cannot be negative')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Utility function to calculate risk level
export const calculateRiskLevel = (sensorData) => {
  const { ph, turbidity } = sensorData
  let riskScore = 0

  // pH risk (optimal range: 6.5-8.5)
  if (ph < 6.5 || ph > 8.5) {
    riskScore += 30
  } else if (ph < 7 || ph > 8) {
    riskScore += 15
  }

  // Turbidity risk (optimal: < 1 NTU, acceptable: < 5 NTU)
  if (turbidity > 5) {
    riskScore += 40
  } else if (turbidity > 1) {
    riskScore += 20
  }

  if (riskScore >= 70) return 'Critical'
  if (riskScore >= 50) return 'High'
  if (riskScore >= 25) return 'Medium'
  return 'Low'
}
