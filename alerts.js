import express from 'express'
import Alert from '../models/Alert.js'
import { authenticateToken, authorizeRole } from '../middleware/auth.js'

const router = express.Router()

// Get all alerts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ timestamp: -1 })
      .lean()

    const formattedAlerts = alerts.map((a) => ({
      ...a,
      id: a._id,
      timestamp: a.timestamp.toLocaleString(),
    }))

    res.json(formattedAlerts)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Get active alerts
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const activeAlerts = await Alert.find({ acknowledged: false })
      .sort({ timestamp: -1 })
      .lean()

    res.json(activeAlerts)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Create alert
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, message, severity, type, sensorId, location } = req.body

    const alert = new Alert({
      userId: req.user.id,
      title,
      message,
      severity,
      type,
      sensorId,
      location,
    })

    await alert.save()

    res.status(201).json({
      message: 'Alert created',
      alert,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Delete alert
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await Alert.findByIdAndDelete(req.params.id)

    res.json({ message: 'Alert deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Acknowledge alert
router.put('/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true },
      { new: true }
    )

    res.json({
      message: 'Alert acknowledged',
      alert,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
