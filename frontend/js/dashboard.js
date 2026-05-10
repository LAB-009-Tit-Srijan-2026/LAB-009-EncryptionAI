document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    try {
        // 1. Fetch User Info
        const user = await ApiService.getMe();
        updateUserUI(user);

        // 2. Fetch Trips
        const trips = await ApiService.getTrips();
        renderDashboard(trips, user);

    } catch (error) {
        showToast('Error loading dashboard: ' + error.message, 'error');
        if (error.message.includes("validate credentials")) {
            logout();
        }
    }
});

function updateUserUI(user) {
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const initialsEl = document.getElementById('user-initials');
    const headerAvatar = document.getElementById('header-avatar');

    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    if (initialsEl) initialsEl.textContent = initials;
    if (headerAvatar) headerAvatar.textContent = initials;
}

function renderDashboard(trips, user) {
    // 1. Update Stats
    updateStats(trips);

    // 2. Render Trips
    const container = document.getElementById('trips-container');
    
    if (trips.length === 0) {
        container.innerHTML = `
            <div class="empty-state glass-card" style="grid-column: 1 / -1;">
                <div class="empty-illustration"><i class="fas fa-mountain-sun"></i></div>
                <h3>No trips planned yet</h3>
                <p class="text-secondary mb-2">Start your next adventure by creating your first group trip.</p>
                <button class="btn btn-primary" onclick="window.location.href='create-trip.html'">
                    <i class="fas fa-plus"></i> Create My First Trip
                </button>
            </div>
        `;
        return;
    }

    const gradients = [
        'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
        'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
        'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'
    ];

    container.innerHTML = trips.map((trip, index) => {
        const gradient = gradients[trip.id % gradients.length];
        const status = trip.itinerary ? 'Ongoing' : 'Upcoming';
        const progress = trip.itinerary ? 65 : 10; // Placeholder progress
        
        return `
            <div class="glass-card trip-card animate-slide-up" style="animation-delay: ${index * 100}ms" onclick="window.location.href='itinerary.html?id=${trip.id}'">
                <div class="trip-cover" style="background: ${gradient}">
                    <div class="trip-status">${status}</div>
                    <h3 style="color: white; margin: 0;">${trip.destination}</h3>
                    <p style="color: rgba(255,255,255,0.8); font-size: 0.8rem; margin: 0;">
                        <i class="far fa-calendar"></i> ${trip.days} Days Adventure
                    </p>
                </div>
                <div class="trip-card-body">
                    <div class="member-stack">
                        ${trip.members ? trip.members.slice(0, 4).map(m => `
                            <div class="member-avatar" title="${m.name}" style="display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; color: var(--text-secondary);">
                                ${m.name.charAt(0)}
                            </div>
                        `).join('') : ''}
                        ${trip.members && trip.members.length > 4 ? `<div class="member-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 0.6rem;">+${trip.members.length - 4}</div>` : ''}
                    </div>
                    
                    <div class="flex justify-between small mb-0-5">
                        <span class="text-secondary">Budget Planning</span>
                        <span class="font-bold">₹${trip.budget.toLocaleString()}</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateStats(trips) {
    const activeTripsEl = document.getElementById('stat-active-trips');
    const totalExpensesEl = document.getElementById('stat-total-expenses');
    const tripsYearEl = document.getElementById('stat-trips-year');
    const membersEl = document.getElementById('stat-members');

    if (activeTripsEl) activeTripsEl.textContent = trips.length;
    
    // Sum budgets as a proxy for expenses in the dashboard overview
    const totalBudget = trips.reduce((sum, t) => sum + t.budget, 0);
    if (totalExpensesEl) totalExpensesEl.textContent = `₹${(totalBudget / 2).toLocaleString()}`; // Demo logic: 50% spent
    
    if (tripsYearEl) tripsYearEl.textContent = trips.filter(t => new Date(t.created_at).getFullYear() === 2026).length;
    
    // Count unique members across all trips
    const uniqueMembers = new Set();
    trips.forEach(t => t.members?.forEach(m => uniqueMembers.add(m.id)));
    if (membersEl) membersEl.textContent = uniqueMembers.size;
}
