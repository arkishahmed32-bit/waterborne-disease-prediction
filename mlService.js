import axios from 'axios'

// Service to call ML model for predictions
export const getPrediction = async (sensorData) => {
  try {
    const response = await axios.post(
      `${process.env.ML_API_URL || 'http://localhost:5001'}/predict`,
      sensorData,
      {
        timeout: 5000,
      }
    )

    return response.data
  } catch (error) {
    console.error('ML prediction error:', error.message)
    return null
  }
}

// Service to call water quality analysis
export const analyzeWaterQuality = async (sensorData) => {
  try {
    const response = await axios.post(
      `${process.env.ML_API_URL || 'http://localhost:5001'}/analyze`,
      sensorData,
      {
        timeout: 5000,
      }
    )

    return response.data
  } catch (error) {
    console.error('Water quality analysis error:', error.message)
    return null
  }
}
