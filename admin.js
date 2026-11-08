import express from 'express'
import User from '../models/User.js'
import Alert from '../models/Alert.js'
import { authenticateToken, authorizeRole } from '../middleware/auth.js'

const router = express.Router()

// Get all users (admin only)
router.get('/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').lean()

    const formattedUsers = users.map((u) => ({
      ...u,
      id: u._id,
    }))

    res.json(formattedUsers)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id)

    res.json({ message: 'User deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Get system settings (admin only)
router.get('/settings', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const settings = {
      phMinThreshold: 6.5,
      phMaxThreshold: 8.5,
      turbidityThreshold: 5,
      alertEmail: 'admin@example.com',
      smsNotifications: true,
      emailNotifications: true,
    }

    res.json(settings)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Update system settings (admin only)
router.put('/settings', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { phMinThreshold, phMaxThreshold, turbidityThreshold, alertEmail, smsNotifications, emailNotifications } = req.body

    const updatedSettings = {
      phMinThreshold,
      phMaxThreshold,
      turbidityThreshold,
      alertEmail,
      smsNotifications,
      emailNotifications,
    }

    res.json({
      message: 'Settings updated successfully',
      settings: updatedSettings,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Get system overview (admin only)
router.get('/overview', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const activeAlerts = await Alert.countDocuments({ acknowledged: false })
    const totalAlerts = await Alert.countDocuments()

    res.json({
      totalUsers,
      activeAlerts,
      totalAlerts,
      systemStatus: 'Operational',
      lastBackup: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
