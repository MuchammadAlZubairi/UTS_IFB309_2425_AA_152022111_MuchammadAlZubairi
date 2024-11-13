// app.js
const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Simpan data sensor terakhir
let latestSensorData = {
  device_id: "hydro_001",
  timestamp: new Date().toISOString(),
  sensors: {
    temperature: 0,
    humidity: 0,
    ph: 0,
    turbidity: 0
  },
  actuators: {
    pump_status: false,
    last_activation: null
  },
  system_status: {
    is_online: true,
    uptime: 0,
    warnings: []
  }
};

// Koneksi ke MQTT broker
const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe('hydroponic/sensors');
});

client.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    latestSensorData.sensors = data;
    latestSensorData.timestamp = new Date().toISOString();
    
    // Check for warnings
    latestSensorData.system_status.warnings = [];
    if (data.temperature > 30) {
      latestSensorData.system_status.warnings.push("High temperature detected");
    }
    if (data.ph < 5.5 || data.ph > 7.5) {
      latestSensorData.system_status.warnings.push("pH level out of range");
    }
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});

// API Endpoints
app.get('/api/status', (req, res) => {
  res.json(latestSensorData);
});

// Endpoint untuk riwayat data (simulasi)
app.get('/api/history', (req, res) => {
  const history = {
    device_id: "hydro_001",
    data_points: [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        ...latestSensorData.sensors
      },
      {
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        ...latestSensorData.sensors
      },
      // Bisa ditambahkan lebih banyak data historis
    ]
  };
  res.json(history);
});

// Endpoint untuk mengontrol pompa
app.post('/api/control/pump', (req, res) => {
  const { status } = req.body;
  latestSensorData.actuators.pump_status = status;
  latestSensorData.actuators.last_activation = new Date().toISOString();
  
  // Publish ke MQTT untuk mengontrol pompa
  client.publish('hydroponic/control', status ? 'pump_on' : 'pump_off');
  
  res.json({ success: true, message: `Pump ${status ? 'activated' : 'deactivated'}` });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});