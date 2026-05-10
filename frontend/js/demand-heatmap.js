document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    const city = "Mumbai"; // Default for demo

    try {
        // 1. Fetch Heatmap & Forecast
        const response = await fetch(`${API_BASE_URL}/demand/heatmap/${city}`, {
            headers: ApiService.getHeaders()
        }).then(res => res.json());

        renderHeatmap(response.forecast);

        // 2. Fetch Active Alerts
        const alerts = await fetch(`${API_BASE_URL}/demand/alerts`, {
            headers: ApiService.getHeaders()
        }).then(res => res.json());

        renderAlerts(alerts);

    } catch (error) {
        console.error("Error loading heatmap:", error);
    }
});

function renderHeatmap(forecast) {
    const container = document.getElementById('heatmap-bars');
    container.innerHTML = forecast.map(day => {
        const height = day.score * 100;
        const colorClass = day.score > 0.8 ? 'demand-peak' : (day.score > 0.6 ? 'demand-high' : 'demand-moderate');
        return `
            <div class="demand-bar ${colorClass}" 
                 style="height: ${height}%;" 
                 data-label="${Math.round(height)}% Demand">
            </div>
        `;
    }).join('');
}

function renderAlerts(alerts) {
    const container = document.getElementById('alerts-container');
    container.innerHTML = alerts.map(alert => `
        <div class="glass-card flex justify-between items-center animate-slide-up" style="border-left: 4px solid ${alert.level === 'Peak' ? 'var(--danger)' : 'var(--warning)'};">
            <div>
                <h4 class="text-primary">${alert.destination} - ${alert.reason}</h4>
                <p class="text-secondary small">${alert.action}</p>
            </div>
            <div class="badge ${alert.level === 'Peak' ? 'badge-danger' : 'badge-warning'}">
                ${alert.level.toUpperCase()}
            </div>
        </div>
    `).join('');
}
