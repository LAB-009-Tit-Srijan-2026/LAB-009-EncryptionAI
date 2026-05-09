document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('id');

    if (!tripId) {
        showToast('No trip ID provided.', 'error');
        window.location.href = 'dashboard.html';
        return;
    }

    // Set nav links
    document.getElementById('nav-itinerary').href = `itinerary.html?id=${tripId}`;
    document.getElementById('nav-expenses').href = `expenses.html?id=${tripId}`;
    document.getElementById('btn-expenses').href = `expenses.html?id=${tripId}`;

    const loadingDiv = document.getElementById('ai-loading');
    const contentDiv = document.getElementById('itinerary-content');

    try {
        // Fetch trip details
        const trip = await ApiService.getTrip(tripId);
        document.getElementById('trip-title').textContent = `Trip to ${trip.destination}`;
        document.getElementById('trip-meta').innerHTML = `<i class="far fa-clock"></i> ${trip.days} Days • <i class="fas fa-users"></i> ${trip.group_size} People • <i class="fas fa-wallet"></i> ₹${trip.budget}`;

        loadingDiv.style.display = 'block';

        // Try to get existing itinerary or generate a new one
        let itineraryData;
        try {
            const existing = await ApiService.getItinerary(tripId);
            itineraryData = JSON.parse(existing.content);
        } catch (e) {
            // Not found, generate it
            const generated = await ApiService.generateItinerary(tripId);
            itineraryData = JSON.parse(generated.content);
        }

        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';

        renderItinerary(itineraryData);

    } catch (error) {
        loadingDiv.style.display = 'none';
        showToast(error.message, 'error');
    }
});

function renderItinerary(data) {
    if (data.budget_breakdown) {
        document.getElementById('budget-hotel').textContent = `₹${data.budget_breakdown.hotel || 0}`;
        document.getElementById('budget-food').textContent = `₹${data.budget_breakdown.food || 0}`;
        document.getElementById('budget-transport').textContent = `₹${data.budget_breakdown.transport || 0}`;
    }

    const timeline = document.getElementById('timeline-container');
    if (data.days && Array.isArray(data.days)) {
        timeline.innerHTML = data.days.map((day, index) => `
            <div class="timeline-item animate-slide-up" style="animation-delay: ${index * 200}ms">
                <div class="glass-card" style="padding: 1.5rem;">
                    <h3 class="text-primary" style="margin-bottom: 1rem;">Day ${day.day}</h3>
                    
                    ${day.hotel ? `<p class="mb-1"><i class="fas fa-bed text-secondary"></i> <strong>Stay:</strong> ${day.hotel}</p>` : ''}
                    
                    <div style="margin-bottom: 1rem;">
                        <strong><i class="fas fa-map-marker-alt text-primary"></i> Activities:</strong>
                        <ul style="list-style-type: circle; margin-left: 2rem; margin-top: 0.5rem; color: var(--text-secondary);">
                            ${(day.activities || []).map(act => `<li>${act}</li>`).join('')}
                        </ul>
                    </div>

                    ${day.food && day.food.length > 0 ? `
                        <div style="margin-bottom: 1rem;">
                            <strong><i class="fas fa-utensils text-warning"></i> Food:</strong>
                            <span class="text-secondary">${day.food.join(', ')}</span>
                        </div>
                    ` : ''}
                    
                    ${day.cost_estimate ? `<div class="text-right text-success" style="font-weight: 600;"><i class="fas fa-money-bill-wave"></i> Est. Cost: ₹${day.cost_estimate}</div>` : ''}
                </div>
            </div>
        `).join('');
    } else {
        timeline.innerHTML = '<p>Could not parse itinerary days. Please regenerate.</p>';
    }

    const tipsContainer = document.getElementById('travel-tips');
    if (data.travel_tips && Array.isArray(data.travel_tips)) {
        tipsContainer.innerHTML = data.travel_tips.map(tip => `<li style="margin-bottom: 0.5rem;">${tip}</li>`).join('');
    } else {
        tipsContainer.parentElement.style.display = 'none';
    }
}
