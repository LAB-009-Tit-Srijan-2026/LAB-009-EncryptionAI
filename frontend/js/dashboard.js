document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    try {
        const user = await ApiService.getMe();
        document.getElementById('user-greeting').textContent = `Welcome back, ${user.name}!`;

        const trips = await ApiService.getTrips();
        renderTrips(trips);
    } catch (error) {
        showToast('Error loading dashboard: ' + error.message, 'error');
        if(error.message.includes("validate credentials")) {
            logout();
        }
    }
});

function renderTrips(trips) {
    const container = document.getElementById('trips-container');
    const tripsCount = document.getElementById('active-trips-count');
    if (tripsCount) tripsCount.textContent = trips.length;
    
    let totalBudget = 0;
    trips.forEach(t => totalBudget += t.budget);
    const budgetEl = document.getElementById('total-budget');
    if (budgetEl) budgetEl.textContent = `₹${totalBudget.toLocaleString()}`;

    if (trips.length === 0) {
        container.innerHTML = '<p class="text-secondary">No trips yet. Create one to get started!</p>';
        return;
    }

    container.innerHTML = trips.map((trip, index) => `
        <a href="itinerary.html?id=${trip.id}" class="glass-card animate-slide-up" style="display:block; animation-delay: ${index * 100}ms">
            <div class="trip-card-image">
                <i class="fas fa-map-marked-alt"></i>
            </div>
            <h3>${trip.destination}</h3>
            <div style="display: flex; justify-content: space-between; margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                <span><i class="far fa-clock"></i> ${trip.days} Days</span>
                <span><i class="fas fa-users"></i> ${trip.group_size} People</span>
            </div>
            <div class="mt-1 text-primary">
                <i class="fas fa-wallet"></i> Budget: ₹${trip.budget}
            </div>
        </a>
    `).join('');
}
