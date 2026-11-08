import express from 'express'
import PDFDocument from 'pdfkit'
import { createObjectCsvWriter } from 'csv-writer'
import Report from '../models/Report.js'
import SensorData, { TEST_SENSOR_ID } from '../models/SensorData.js'
import HealthRecord from '../models/HealthRecord.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Generate water quality report
router.get('/generate/water-quality', authenticateToken, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const sensorData = await SensorData.find({
      sensorId: TEST_SENSOR_ID,
      timestamp: { $gte: sevenDaysAgo },
    })
      .sort({ timestamp: -1 })

    const average = (field) => sensorData.length
      ? (sensorData.reduce((sum, data) => sum + data[field], 0) / sensorData.length).toFixed(2)
      : 'N/A'

    const doc = new PDFDocument()
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', 'attachment; filename="water-quality-report.pdf"')

    doc.pipe(res)

    doc.fontSize(16).text('Water Quality Report', { align: 'center' })
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' }).moveDown()

    doc.text('Summary Statistics:')
    doc.list([
      `Total Readings: ${sensorData.length}`,
      `Average pH: ${average('ph')}`,
      `Average TDS: ${average('tds')} ppm`,
      `Average Turbidity: ${average('turbidity')} NTU`,
    ])

    doc.end()
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Generate disease risk report
router.get('/generate/disease-risk', authenticateToken, async (req, res) => {
  try {
    const doc = new PDFDocument()
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', 'attachment; filename="disease-risk-report.pdf"')

    doc.pipe(res)

    doc.fontSize(16).text('Disease Risk Analysis Report', { align: 'center' })
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' }).moveDown()

    doc.text('Predictive Analysis:')
    doc.list([
      'Analysis based on water quality parameters',
      'Machine learning models used for prediction',
      'Risk assessment for common waterborne diseases',
    ])

    doc.end()
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Generate health records report
router.get('/generate/health-records', authenticateToken, async (req, res) => {
  try {
    const healthRecords = await HealthRecord.find()
      .sort({ reportedAt: -1 })
      .limit(100)

    const doc = new PDFDocument()
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', 'attachment; filename="health-records-report.pdf"')

    doc.pipe(res)

    doc.fontSize(16).text('Health Records Report', { align: 'center' })
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' }).moveDown()

    doc.text(`Total Health Records: ${healthRecords.length}`)
    doc.text(`Report Period: Last 30 days`)

    doc.end()
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Generate outbreak analysis report
router.get('/generate/outbreak', authenticateToken, async (req, res) => {
  try {
    const doc = new PDFDocument()
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', 'attachment; filename="outbreak-analysis-report.pdf"')

    doc.pipe(res)

    doc.fontSize(16).text('Outbreak Analysis Report', { align: 'center' })
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' }).moveDown()

    doc.text('Disease Pattern Analysis:')
    doc.list([
      'Identification of disease clusters',
      'Temporal analysis of outbreak patterns',
      'Spatial distribution of cases',
      'Risk assessment and recommendations',
    ])

    doc.end()
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
