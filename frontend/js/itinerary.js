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
    document.getElementById('nav-chat').href = `chat.html?id=${tripId}`;
    document.getElementById('btn-expenses').href = `expenses.html?id=${tripId}`;

    // Initialize real-time sync
    socketManager.init(tripId);

    window.addEventListener('sync-data', async (e) => {
        if (e.detail.type === 'member') {
            const updatedTrip = await ApiService.getTrip(tripId);
            renderMembers(updatedTrip.members);
        }
    });

    const loadingDiv = document.getElementById('ai-loading');
    const contentDiv = document.getElementById('itinerary-content');

    try {
        // Fetch trip details
        const trip = await ApiService.getTrip(tripId);
        document.getElementById('trip-title').textContent = `Trip to ${trip.destination}`;
        document.getElementById('trip-meta').innerHTML = `<i class="far fa-clock"></i> ${trip.days} Days • <i class="fas fa-users"></i> ${trip.members.length} Members • <i class="fas fa-wallet"></i> ₹${trip.budget}`;

        renderMembers(trip.members);

        // Add member handler
        const btnAddMember = document.getElementById('btn-add-member');
        if (btnAddMember) {
            btnAddMember.addEventListener('click', async () => {
                const emailInput = document.getElementById('new-member-email');
                const email = emailInput.value.trim();
                if (!email) return;

                try {
                    await ApiService.addMember(tripId, email);
                    showToast('Member added successfully!');
                    socketManager.notifyUpdate('member');
                    emailInput.value = '';
                    // Reload trip to update member list
                    const updatedTrip = await ApiService.getTrip(tripId);
                    renderMembers(updatedTrip.members);
                    document.getElementById('trip-meta').innerHTML = `<i class="far fa-clock"></i> ${updatedTrip.days} Days • <i class="fas fa-users"></i> ${updatedTrip.members.length} Members • <i class="fas fa-wallet"></i> ₹${updatedTrip.budget}`;
                } catch (error) {
                    showToast(error.message, 'error');
                }
            });
        }

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
        
        // Load booking recommendations
        const recs = await ApiService.getBookingRecommendations(tripId);
        renderRecommendations(recs);

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

function renderMembers(members) {
    const list = document.getElementById('member-list');
    if (!list) return;
    list.innerHTML = (members || []).map(m => `
        <div class="glass-card" style="padding: 0.5rem 1rem; border-radius: 100px; display: flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.1);">
            <i class="fas fa-user-circle text-primary"></i>
            <span>${m.name}</span>
        </div>
    `).join('');
}

function renderRecommendations(recs) {
    const container = document.getElementById('booking-recommendations');
    if (!container) return;
    
    // Combine some hotels and activities for a quick view
    const items = [
        ...(recs.hotels || []).slice(0, 1).map(h => ({...h, type: 'Hotel', icon: 'fa-hotel'})),
        ...(recs.transport || []).slice(0, 1).map(t => ({...t, name: t.name, type: 'Transport', icon: 'fa-plane', price: t.price})),
        ...(recs.activities || []).slice(0, 1).map(a => ({...a, type: 'Activity', icon: 'fa-camera-retro'}))
    ];

    container.innerHTML = items.map(item => `
        <div class="glass-card animate-slide-up" style="padding: 1rem; position: relative; border: 1px solid rgba(99, 102, 241, 0.2);">
            ${item.ai_recommended ? `<div class="badge" style="position: absolute; top: 0.5rem; right: 0.5rem; font-size: 0.6rem; background: var(--primary); color: white;"><i class="fas fa-magic"></i> AI PICK</div>` : ''}
            <div class="flex items-center gap-1 mb-1">
                <i class="fas ${item.icon} text-primary"></i>
                <small class="font-bold text-secondary">${item.type.toUpperCase()}</small>
            </div>
            <h4 style="margin-bottom: 0.5rem;">${item.name}</h4>
            <div class="flex justify-between items-center">
                <span class="text-success" style="font-weight: 700;">₹${item.price}</span>
                <a href="booking.html" class="btn btn-primary btn-sm" style="padding: 0.2rem 0.6rem; font-size: 0.7rem;">Book</a>
            </div>
        </div>
    `).join('');
}
