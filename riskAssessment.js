const SAFE_PH_MIN = 6.5
const SAFE_PH_MAX = 8.5
const SAFE_TURBIDITY_MAX = 1.0
const SAFE_TDS_MAX = 500

const clampProbability = (value) => Math.min(0.99, Math.max(0.12, value))
const safeNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return Number.NaN
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export const normalizeSensorReading = (reading = {}) => {
  const normalized = { ...reading }

  const phCalibrated = normalized.phCalibrated !== false
  const tdsCalibrated = normalized.tdsCalibrated !== false
  const turbidityCalibrated = normalized.turbidityCalibrated !== false

  if (!phCalibrated && Number.isFinite(safeNumber(normalized.phRaw))) {
    const raw = safeNumber(normalized.phRaw)
    normalized.ph = Number((7 + (raw - 1500) * 0.00065).toFixed(2))
  }

  if (!tdsCalibrated && Number.isFinite(safeNumber(normalized.tdsRaw))) {
    const raw = safeNumber(normalized.tdsRaw)
    normalized.tds = Number((raw * 0.36).toFixed(2))
  }

  if (!turbidityCalibrated && Number.isFinite(safeNumber(normalized.turbidityRaw))) {
    const raw = safeNumber(normalized.turbidityRaw)
    const estimated = raw * 0.0002
    normalized.turbidity = Number(Math.min(5, Math.max(0, estimated)).toFixed(2))
  }

  if (
    Number.isFinite(safeNumber(normalized.turbidity)) &&
    safeNumber(normalized.turbidity) > 50 &&
    Number.isFinite(safeNumber(normalized.turbidityRaw))
  ) {
    const raw = safeNumber(normalized.turbidityRaw)
    const estimated = raw * 0.0002
    normalized.turbidity = Number(Math.min(5, Math.max(0, estimated)).toFixed(2))
  }

  return normalized
}

export const getRiskAssessment = (reading = {}) => {
  const normalizedReading = normalizeSensorReading(reading)
  const ph = safeNumber(normalizedReading.ph)
  const tds = safeNumber(normalizedReading.tds)
  const turbidity = safeNumber(normalizedReading.turbidity)

  let riskScore = 0
  const riskFactors = []

  if (Number.isFinite(ph)) {
    if (ph < SAFE_PH_MIN || ph > SAFE_PH_MAX) {
      riskScore += 35
      riskFactors.push('pH outside safe range')
    } else if (ph < 7 || ph > 8) {
      riskScore += 8
      riskFactors.push('pH drifting away from neutral')
    }
  }

  if (Number.isFinite(turbidity)) {
    if (turbidity > 5) {
      riskScore += 35
      riskFactors.push('very high turbidity')
    } else if (turbidity > 2) {
      riskScore += 25
      riskFactors.push('turbidity above safe level')
    } else if (turbidity > 1.0) {
      riskScore += 12
      riskFactors.push('turbidity trending upward')
    }
  }

  if (Number.isFinite(tds)) {
    if (tds > SAFE_TDS_MAX) {
      riskScore += 30
      riskFactors.push('TDS above safe zone')
    } else if (tds > 400) {
      riskScore += 12
      riskFactors.push('TDS is elevated')
    }
  }

  if (riskFactors.length === 0) {
    riskScore = 5
  }

  if (riskScore >= 70) {
    riskScore = 100
  } else if (riskScore >= 50) {
    riskScore = 75
  } else if (riskScore >= 25) {
    riskScore = 45
  }

  const severity = riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 25 ? 'medium' : 'low'

  let qualityMessage = 'Water quality is within the safe operating range.'
  if (severity === 'medium') {
    qualityMessage = 'Water quality is slightly elevated but still monitorable. Keep checking the system.'
  } else if (severity === 'high') {
    qualityMessage = 'Water quality is risky. Immediate investigation and treatment are recommended.'
  } else if (severity === 'critical') {
    qualityMessage = 'Water quality is critically unsafe. Risk of contamination is high and intervention is urgent.'
  }

  const possibleDiseases = []

  if (ph < SAFE_PH_MIN || ph > SAFE_PH_MAX || turbidity > 1.8) {
    possibleDiseases.push({
      disease: 'Cholera risk',
      probability: clampProbability((Math.abs(ph - 7.5) / 4 + turbidity / 3) * 0.8),
      severity: severity === 'low' ? 'Medium' : severity === 'medium' ? 'High' : 'Critical',
    })
  }

  if (turbidity > 1.5 || ph > 8.5) {
    possibleDiseases.push({
      disease: 'Diarrheal illness',
      probability: clampProbability((turbidity / 2.5 + Math.max(0, ph - 8.5) / 2) * 0.9),
      severity: severity === 'low' ? 'Medium' : 'High',
    })
  }

  if (tds > 500 || (ph < 6.5 && turbidity > 2.0)) {
    possibleDiseases.push({
      disease: 'Gastroenteritis',
      probability: clampProbability((Math.abs(7 - ph) / 3 + tds / 800) * 0.75),
      severity: severity === 'critical' ? 'Critical' : 'Medium',
    })
  }

  if (possibleDiseases.length === 0) {
    possibleDiseases.push({
      disease: 'No significant disease risk predicted',
      probability: 0.12,
      severity: 'Low',
    })
  }

  const diseaseSummary = possibleDiseases
    .filter((item) => item.disease !== 'No significant disease risk predicted')
    .slice(0, 3)

  return {
    riskScore,
    riskLevel: severity,
    qualityMessage,
    possibleDiseases: diseaseSummary.length > 0 ? diseaseSummary : possibleDiseases,
    riskFactors,
  }
}

export const detectSuddenChange = (previousReading = null, currentReading = {}) => {
  if (!previousReading) {
    return {
      suddenChange: false,
      changeSummary: 'No previous baseline available',
      changeMagnitude: 0,
    }
  }

  const previousValues = {
    ph: safeNumber(previousReading.ph),
    tds: safeNumber(previousReading.tds),
    turbidity: safeNumber(previousReading.turbidity),
  }

  const currentValues = {
    ph: safeNumber(currentReading.ph),
    tds: safeNumber(currentReading.tds),
    turbidity: safeNumber(currentReading.turbidity),
  }

  const changes = []

  if (Number.isFinite(previousValues.ph) && Number.isFinite(currentValues.ph)) {
    changes.push({ metric: 'pH', delta: Math.abs(currentValues.ph - previousValues.ph), threshold: 0.8 })
  }
  if (Number.isFinite(previousValues.tds) && Number.isFinite(currentValues.tds)) {
    changes.push({ metric: 'TDS', delta: Math.abs(currentValues.tds - previousValues.tds), threshold: 120 })
  }
  if (Number.isFinite(previousValues.turbidity) && Number.isFinite(currentValues.turbidity)) {
    changes.push({ metric: 'Turbidity', delta: Math.abs(currentValues.turbidity - previousValues.turbidity), threshold: 1.2 })
  }

  const biggestChange = changes.reduce((highest, change) => (change.delta > highest.delta ? change : highest), { metric: 'None', delta: 0, threshold: 0 })
  const suddenChange = changes.some((change) => change.delta >= change.threshold)

  if (suddenChange) {
    return {
      suddenChange: true,
      changeSummary: `${biggestChange.metric} changed by ${Number(biggestChange.delta).toFixed(2)} beyond the expected range`,
      changeMagnitude: Number(biggestChange.delta.toFixed(2)),
    }
  }

  return {
    suddenChange: false,
    changeSummary: 'Water quality remained stable compared with the previous reading',
    changeMagnitude: Number(biggestChange.delta.toFixed(2)),
  }
}
