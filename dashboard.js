import express from 'express'
import SensorData, { TEST_SENSOR_ID } from '../models/SensorData.js'
import Alert from '../models/Alert.js'
import { authenticateToken } from '../middleware/auth.js'
import { getRiskAssessment } from '../utils/riskAssessment.js'

const router = express.Router()

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const activeSensors = (await SensorData.distinct('sensorId', {
      sensorId: TEST_SENSOR_ID,
      status: 'active',
    })).length
    const latestReading = await SensorData.findOne({ sensorId: TEST_SENSOR_ID })
      .sort({ timestamp: -1 })

    const ph = latestReading?.ph ?? null
    const turbidity = latestReading?.turbidity ?? null
    const tds = latestReading?.tds ?? null

    const riskAssessment = getRiskAssessment({ ph, turbidity, tds })
    const riskLevel = riskAssessment.riskLevel.charAt(0).toUpperCase() + riskAssessment.riskLevel.slice(1)

    const activeAlerts = await Alert.countDocuments({ acknowledged: false })
    const recentAlerts = await Alert.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .lean()

    res.json({
      activeSensors,
      avgPH: ph == null ? null : Number(ph.toFixed(2)),
      avgTurbidity: turbidity == null ? null : Number(turbidity.toFixed(2)),
      avgTds: tds == null ? null : Number(tds.toFixed(2)),
      sensorTimestamp: latestReading?.timestamp ?? null,
      riskLevel,
      riskScore: riskAssessment.riskScore,
      riskMessage: riskAssessment.qualityMessage,
      possibleDiseases: riskAssessment.possibleDiseases,
      activeAlerts,
      recentAlerts: recentAlerts.map((a) => ({
        ...a,
        id: a._id,
        timestamp: a.timestamp.toLocaleString(),
      })),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
