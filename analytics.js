import express from 'express'
import SensorData, { TEST_SENSOR_ID } from '../models/SensorData.js'
import Prediction from '../models/Prediction.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Get analytics data
router.get('/data', authenticateToken, async (req, res) => {
  try {
    // Water quality trend (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const sensorData = await SensorData.find({
      sensorId: TEST_SENSOR_ID,
      timestamp: { $gte: sevenDaysAgo },
    })
      .sort({ timestamp: 1 })
      .lean()

    const waterQualityTrend = []
    const dailyData = {}

    sensorData.forEach((data) => {
      const date = data.timestamp.toISOString().split('T')[0]
      if (!dailyData[date]) {
        dailyData[date] = { ph: [], tds: [], turbidity: [], date }
      }
      dailyData[date].ph.push(data.ph)
      dailyData[date].tds.push(data.tds)
      if (data.turbidity != null) {
        dailyData[date].turbidity.push(data.turbidity)
      }
    })

    Object.values(dailyData).forEach((day) => {
      const avgPh = day.ph.reduce((a, b) => a + b, 0) / day.ph.length
      const avgTds = day.tds.reduce((a, b) => a + b, 0) / day.tds.length
      const avgTurbidity = day.turbidity.length > 0
        ? Number((day.turbidity.reduce((a, b) => a + b, 0) / day.turbidity.length).toFixed(2))
        : null
      waterQualityTrend.push({
        date: day.date,
        ph: Number(avgPh.toFixed(2)),
        tds: Number(avgTds.toFixed(2)),
        turbidity: avgTurbidity,
      })
    })

    // Disease risk distribution
    const predictions = await Prediction.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .lean()

    const diseaseRiskMap = {}
    predictions.forEach((pred) => {
      pred.predictions.forEach((p) => {
        if (!diseaseRiskMap[p.disease]) {
          diseaseRiskMap[p.disease] = 0
        }
        diseaseRiskMap[p.disease] += p.probability
      })
    })

    const diseaseRiskDistribution = Object.entries(diseaseRiskMap).map(([disease, risk]) => ({
      disease,
      risk: Number((risk / Math.max(1, predictions.length)).toFixed(2)),
    }))

    // Predictions summary
    const predictionsData = predictions.slice(0, 10).map((p) => ({
      id: p._id,
      disease: p.predictions[0]?.disease || 'Unknown',
      risk: p.predictions[0]?.probability || 0,
      severity: p.predictions[0]?.severity || 'Low',
    }))

    res.json({
      waterQualityTrend,
      diseaseRiskDistribution,
      predictions: predictionsData,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
