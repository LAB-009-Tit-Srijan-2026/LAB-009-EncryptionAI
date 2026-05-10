document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('tripId');
    const locInput = document.getElementById('search-location');
    if (locInput) locInput.value = city;
    
    // Set nav link back to itinerary if tripId exists
    const navItin = document.getElementById('nav-itinerary');
    if (navItin && tripId) {
        navItin.href = `itinerary.html?id=${tripId}`;
    }

    // Handle Search Button
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const newCity = locInput.value.trim();
            if (newCity) loadStaysForCity(newCity);
        });
    }

    await loadStaysForCity(city);
});

async function loadStaysForCity(city) {
    const welcomeText = document.getElementById('welcome-text');
    if (welcomeText) welcomeText.textContent = `Finding your perfect stay in ${city} ✨`;

    try {
        // 1. Check Demand
        const demand = await fetch(`${API_BASE_URL}/demand/analyze/${city}`, {
            headers: ApiService.getHeaders()
        }).then(res => res.json());

        // 2. Fetch Stays (Nearby)
        const lat = 19.0760; 
        const lon = 72.8777;

        const response = await fetch(`${API_BASE_URL}/properties/nearby/${city}?lat=${lat}&lon=${lon}`, {
            headers: ApiService.getHeaders()
        }).then(res => res.json());

        renderStays(response.results);
        
        const titleEl = document.getElementById('search-results-title');
        if (titleEl) titleEl.textContent = `${response.results.length} Local Stays in ${city}`;

    } catch (error) {
        console.error("Error loading stays:", error);
        showToast("Failed to load local stays", "error");
    }
}

function renderDemandAlert(demand) {
    const container = document.getElementById('demand-indicator');
    if (!demand.overflow_triggered) {
        container.innerHTML = `
            <div class="badge badge-success">
                <i class="fas fa-check-circle"></i> Hotel Availability: Normal
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="overflow-alert animate-pulse">
            <i class="fas fa-exclamation-triangle fa-2x text-danger"></i>
            <div>
                <h4 class="text-danger">Peak Demand Detected!</h4>
                <p class="text-secondary small">Hotels in ${demand.destination} are ${Math.round(100 - demand.hotel_availability)}% full. Switching to Local Stay recommendations.</p>
            </div>
        </div>
    `;
}

function renderStays(stays) {
    const container = document.getElementById('stays-container');
    if (!stays || stays.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 w-full col-span-full">
                <i class="fas fa-house-damage fa-3x text-secondary mb-1"></i>
                <p>No local stays found in this city yet. Be the first to host!</p>
                <a href="host-dashboard.html" class="btn btn-primary mt-2">Become a Host</a>
            </div>
        `;
        return;
    }

    container.innerHTML = stays.map(stay => `
        <div class="stay-card animate-slide-up">
            <div style="position: relative;">
                <img src="${(stay.photos && stay.photos.length > 0) ? stay.photos[0] : 'https://images.unsplash.com/photo-1513584684374-8bdb7489feef?w=500'}" class="stay-img" alt="${stay.title}">
                <div style="position: absolute; top: 10px; right: 10px;" class="stay-badge ${getBadgeClass(stay.room_type)}">
                    ${stay.room_type.toUpperCase()}
                </div>
            </div>
            <div class="stay-info">
                <div class="flex justify-between items-start mb-1">
                    <h3 style="font-size: 1.1rem;">${stay.title}</h3>
                    <div class="stay-price">₹${stay.price}</div>
                </div>
                <div class="flex gap-1 text-secondary small mb-2">
                    <span><i class="fas fa-map-marker-alt"></i> ${stay.distance_km} km away</span>
                    <span><i class="fas fa-star text-warning"></i> Match: ${stay.match_score}%</span>
                </div>
                <div class="flex gap-1">
                    <button class="btn btn-outline btn-sm flex-1" onclick="viewStay(${stay.id})">Details</button>
                    <button class="btn btn-primary btn-sm flex-1" onclick="bookStay(${stay.id})">Book Now</button>
                </div>
            </div>
        </div>
    `).join('');
}

function getBadgeClass(type) {
    if (type.includes('shared')) return 'badge-shared';
    if (type.includes('private')) return 'badge-private';
    return 'badge-home';
}

function viewStay(id) {
    showToast("Opening stay details...", "info");
}

function bookStay(id) {
    showToast("Booking request sent to host!", "success");
}
