// Configuration
const CONFIG = {
    apiBaseUrl: 'http://localhost:3000/api',
    updateInterval: 5000, // 5 seconds
    chartOptions: {
        width: 800,
        height: 300,
        maxDataPoints: 20
    }
};

// DOM Elements
const elements = {
    temperature: document.querySelector('[data-sensor="temperature"] .card-value'),
    humidity: document.querySelector('[data-sensor="humidity"] .card-value'),
    ph: document.querySelector('[data-sensor="ph"] .card-value'),
    turbidity: document.querySelector('[data-sensor="turbidity"] .card-value'),
    warningsContainer: document.querySelector('.warnings'),
    warningsList: document.querySelector('.warnings-list'),
    chartContainer: document.querySelector('.chart-placeholder')
};

// State Management
let sensorHistory = [];

// Fetch current sensor data
async function fetchCurrentStatus() {
    try {
        const response = await fetch(`${CONFIG.apiBaseUrl}/status`);
        if (!response.ok) throw new Error('Failed to fetch status');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching status:', error);
        showError('Failed to fetch sensor data');
        return null;
    }
}

// Fetch historical data
async function fetchHistory() {
    try {
        const response = await fetch(`${CONFIG.apiBaseUrl}/history`);
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        return data.data_points;
    } catch (error) {
        console.error('Error fetching history:', error);
        showError('Failed to fetch historical data');
        return [];
    }
}

// Update sensor displays
function updateSensorDisplays(data) {
    if (!data?.sensors) return;
    
    const { temperature, humidity, ph, turbidity } = data.sensors;
    
    elements.temperature.textContent = `${temperature}°C`;
    elements.humidity.textContent = `${humidity}%`;
    elements.ph.textContent = ph.toFixed(1);
    elements.turbidity.textContent = `${turbidity}%`;

    // Add visual indicators for out-of-range values
    checkThresholds(data.sensors);
}

// Check sensor thresholds and add visual indicators
function checkThresholds(sensors) {
    const thresholds = {
        temperature: { min: 20, max: 30 },
        humidity: { min: 50, max: 80 },
        ph: { min: 5.5, max: 7.5 },
        turbidity: { min: 0, max: 20 }
    };

    Object.entries(sensors).forEach(([sensor, value]) => {
        const element = elements[sensor];
        if (!element) return;

        const { min, max } = thresholds[sensor];
        element.classList.remove('warning', 'danger');
        
        if (value < min || value > max) {
            element.classList.add(value < min * 0.9 || value > max * 1.1 ? 'danger' : 'warning');
        }
    });
}

// Update warnings display
function updateWarnings(data) {
    if (!data?.system_status?.warnings) return;
    
    const warnings = data.system_status.warnings;
    elements.warningsContainer.style.display = warnings.length ? 'block' : 'none';
    
    elements.warningsList.innerHTML = warnings
        .map(warning => `<li>${warning}</li>`)
        .join('');
}

// Initialize and update chart
function initChart() {
    // Create chart using Chart.js
    const ctx = document.createElement('canvas');
    elements.chartContainer.innerHTML = '';
    elements.chartContainer.appendChild(ctx);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperature',
                    borderColor: '#3b82f6',
                    data: []
                },
                {
                    label: 'Humidity',
                    borderColor: '#10b981',
                    data: []
                },
                {
                    label: 'pH',
                    borderColor: '#f59e0b',
                    data: []
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Update chart data
function updateChart(chart, newData) {
    if (!newData?.sensors) return;

    const timestamp = new Date().toLocaleTimeString();
    
    chart.data.labels.push(timestamp);
    chart.data.datasets[0].data.push(newData.sensors.temperature);
    chart.data.datasets[1].data.push(newData.sensors.humidity);
    chart.data.datasets[2].data.push(newData.sensors.ph);

    // Limit the number of data points shown
    if (chart.data.labels.length > CONFIG.chartOptions.maxDataPoints) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(dataset => dataset.data.shift());
    }

    chart.update();
}

// Show error messages
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Initialize the dashboard
async function initDashboard() {
    // Load Chart.js from CDN
    await loadChartJS();
    
    // Initialize chart
    const chart = initChart();

    // Initial data fetch
    const initialStatus = await fetchCurrentStatus();
    if (initialStatus) {
        updateSensorDisplays(initialStatus);
        updateWarnings(initialStatus);
    }

    const initialHistory = await fetchHistory();
    if (initialHistory.length) {
        sensorHistory = initialHistory;
        updateChart(chart, initialHistory[initialHistory.length - 1]);
    }

    // Set up periodic updates
    setInterval(async () => {
        const newStatus = await fetchCurrentStatus();
        if (newStatus) {
            updateSensorDisplays(newStatus);
            updateWarnings(newStatus);
            updateChart(chart, newStatus);
        }
    }, CONFIG.updateInterval);
}

// Helper function to load Chart.js
async function loadChartJS() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Add necessary styles
const styles = `
    .error-message {
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #ef4444;
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 1000;
    }

    .warning {
        color: #f59e0b;
    }

    .danger {
        color: #ef4444;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Initialize the dashboard when the DOM is ready
document.addEventListener('DOMContentLoaded', initDashboard);