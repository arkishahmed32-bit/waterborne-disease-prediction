import express from 'express'
import SensorData, { TEST_SENSOR_ID } from '../models/SensorData.js'
import { authenticateToken } from '../middleware/auth.js'
import { getRiskAssessment, detectSuddenChange, normalizeSensorReading } from '../utils/riskAssessment.js'

const router = express.Router()
                                    
// Get current sensor data
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const sensorData = await SensorData.find({ sensorId: TEST_SENSOR_ID })
      .sort({ timestamp: -1 })
      .limit(1)

    res.json(sensorData)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Get sensor data by location
router.get('/location/:location', authenticateToken, async (req, res) => {
  try {
    const sensorData = await SensorData.find({ sensorId: TEST_SENSOR_ID })
      .sort({ timestamp: -1 })
      .limit(100)

    res.json(sensorData)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Get sensor locations (for maps)
router.get('/locations', authenticateToken, async (req, res) => {
  try {
    const locations = await SensorData.find({ sensorId: TEST_SENSOR_ID })
      .select('sensorId ph tds turbidity phRaw phVoltage tdsRaw tdsVoltage turbidityRaw turbidityVoltage status timestamp')
      .sort({ timestamp: -1 })
      .exec()

    const uniqueLocations = []
    const seen = new Set()

    locations.forEach((loc) => {
      if (!seen.has(loc.sensorId)) {
        seen.add(loc.sensorId)
        uniqueLocations.push(loc)
      }
    })

    res.json(uniqueLocations)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Receive sensor data (from IoT devices)
router.post('/data', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body
      : {}
    const normalizeKey = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '')
    const normalizedBody = new Map(
      Object.entries(body).map(([key, value]) => [normalizeKey(key), value])
    )
    const readingAliases = {
      ph: ['ph'],
      tds: ['tds'],
      turbidity: ['turbidity'],
      phRaw: ['phraw', 'rawph'],
      phVoltage: ['phvoltage', 'voltageph'],
      tdsRaw: ['tdsraw', 'rawtds'],
      tdsVoltage: ['tdsvoltage', 'voltagetds'],
      turbidityRaw: ['turbidityraw', 'rawturbidity'],
      turbidityVoltage: ['turbidityvoltage', 'voltageturbidity'],
    }
    const getReading = (field) => {
      const alias = readingAliases[field].find((key) => normalizedBody.has(key))
      return alias === undefined ? undefined : normalizedBody.get(alias)
    }
    const parseReading = (value) => {
      if (value == null) return null

      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null
      }

      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
      }

      return null
    }

    const providedFields = Object.keys(readingAliases)
      .filter((field) => getReading(field) !== undefined)
    if (providedFields.length === 0) {
      return res.status(400).json({
        message: 'Provide at least one recognized sensor field.',
        acceptedFields: Object.keys(readingAliases),
      })
    }

    const readings = Object.fromEntries(
      Object.keys(readingAliases).map((field) => [field, parseReading(getReading(field))])
    )
    const invalidFields = providedFields.filter((field) => {
      const value = getReading(field)
      return value != null && readings[field] === null
    })

    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: 'Sensor fields must be finite numbers or null.',
        invalidFields,
      })
    }

    const previousReading = await SensorData.findOne({ sensorId: TEST_SENSOR_ID })
      .sort({ timestamp: -1 })
      .skip(1)
      .lean()

    const normalizedReadings = normalizeSensorReading(readings)
    const riskAssessment = getRiskAssessment(normalizedReadings)
    const suddenChange = detectSuddenChange(previousReading, normalizedReadings)

    const sensorData = await SensorData.findOneAndUpdate(
      { sensorId: TEST_SENSOR_ID },
      {
        $set: {
          ...normalizedReadings,
          riskScore: riskAssessment.riskScore,
          riskLevel: riskAssessment.riskLevel,
          qualityMessage: riskAssessment.qualityMessage,
          possibleDiseases: riskAssessment.possibleDiseases,
          suddenChange: suddenChange.suddenChange,
          changeSummary: suddenChange.changeSummary,
          status: 'active',
          timestamp: new Date(),
        },
        $setOnInsert: { sensorId: TEST_SENSOR_ID },
      },
      {
        new: true,
        upsert: true,
        sort: { timestamp: -1 },
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    )

    if (riskAssessment.riskLevel !== 'low' || suddenChange.suddenChange) {
      const alertTitle = suddenChange.suddenChange
        ? 'Sudden water quality change detected'
        : `Water risk alert: ${riskAssessment.riskLevel.toUpperCase()}`

      const alertMessage = suddenChange.suddenChange
        ? `${suddenChange.changeSummary}. ${riskAssessment.qualityMessage}`
        : `${riskAssessment.qualityMessage} Possible disease risk: ${riskAssessment.possibleDiseases.map((item) => item.disease).join(', ')}`

      // Do not persist risk alerts to the database.
      // Frontend receives the live assessment in the response and shows a continuous alert banner instead.
      sensorData.alertPreview = {
        title: alertTitle,
        message: alertMessage,
        severity: riskAssessment.riskLevel === 'critical' ? 'critical' : riskAssessment.riskLevel === 'high' ? 'high' : 'medium',
        type: suddenChange.suddenChange ? 'outbreak' : 'disease-risk',
      }
    }

    res.status(200).json({
      message: 'Sensor data received and updated',
      data: sensorData,
      riskAssessment,
      suddenChange,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
