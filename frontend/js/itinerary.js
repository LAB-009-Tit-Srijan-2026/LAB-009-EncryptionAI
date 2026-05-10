let map;
let markers = [];

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
    const navItin = document.getElementById('nav-itinerary');
    const navExp = document.getElementById('nav-expenses');
    const navChat = document.getElementById('nav-chat');
    const btnExp = document.getElementById('btn-expenses');

    if (navItin) navItin.href = `itinerary.html?id=${tripId}`;
    if (navExp) navExp.href = `expenses.html?id=${tripId}`;
    if (navChat) navChat.href = `chat.html?id=${tripId}`;
    if (btnExp) btnExp.href = `expenses.html?id=${tripId}`;

    // Initialize real-time sync
    socketManager.init(tripId);

    window.addEventListener('sync-data', async (e) => {
        if (e.detail.type === 'member') {
            const updatedTrip = await ApiService.getTrip(tripId);
            renderMembers(updatedTrip.members);
        } else if (e.detail.type === 'itinerary') {
            const updatedTrip = await ApiService.getTrip(tripId);
            renderItinerary(updatedTrip.itinerary.content);
        }
    });

    // Tab Switching
    const tabs = document.querySelectorAll('.view-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('btn-primary', 'active'));
            tab.classList.add('btn-primary', 'active');
            
            const view = tab.dataset.view;
            document.getElementById('timeline-view').style.display = view === 'timeline' ? 'block' : 'none';
            document.getElementById('map-view').style.display = view === 'map' ? 'block' : 'none';
            
            // Trigger map resize if switching to map
            if (view === 'map' && map) {
                google.maps.event.trigger(map, 'resize');
            }
        });
    });

    const loadingDiv = document.getElementById('ai-loading');
    const contentDiv = document.getElementById('itinerary-content');

    try {
        // Fetch trip details
        const trip = await ApiService.getTrip(tripId);
        
        // Render Hero Section
        renderHero(trip);
        
        const tripDest = document.getElementById('trip-destination');
        if (tripDest) tripDest.textContent = trip.destination;

        const tripBudget = document.getElementById('trip-budget');
        if (tripBudget) tripBudget.textContent = trip.budget;
        
        const tripGroup = document.getElementById('trip-group-size');
        if (tripGroup) tripGroup.textContent = trip.members.length;

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
                    renderHero(updatedTrip); // This updates the hero badges correctly
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
        
        // Load booking recommendations and spotlight
        const recs = await ApiService.getBookingRecommendations(tripId);
        renderHotelSpotlight(recs.hotels || []);
        renderRecommendations(recs);

        // NEW: Handle Demand Alerts
        if (recs.demand_alert) {
            showToast(`Peak Demand in ${trip.destination}! Local stays recommended.`, 'info');
            const alertHtml = `
                <div class="glass-card mt-2 animate-pulse" style="border: 1px solid var(--danger); background: rgba(239, 68, 68, 0.05);">
                    <div class="flex items-center gap-1">
                        <i class="fas fa-exclamation-triangle text-danger"></i>
                        <p class="small"><strong>Peak Demand Detected:</strong> Hotels are ${Math.round(100 - recs.demand_alert.hotel_availability)}% full. <a href="nearby-homes.html?tripId=${tripId}&city=${trip.destination}" class="text-primary font-bold">View Local Homes &rarr;</a></p>
                    </div>
                </div>
            `;
            const container = document.getElementById('itinerary-content');
            container.insertAdjacentHTML('afterbegin', alertHtml);
        }

        // NEW: Handle Guide Recommendations
        if (recs.guide_recommendations && recs.guide_recommendations.length > 0) {
            const guide = recs.guide_recommendations[0];
            if (guide.guides && guide.guides.length > 0) {
                const guideHtml = `
                    <div class="ai-suggestion-box mt-2 animate-fade-in">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="small"><strong>AI Guide Match:</strong> ${guide.analysis.reason}</p>
                                <p class="x-small text-secondary mt-0-5">Expert: ${guide.guides[0].name} (${guide.guides[0].match_reason})</p>
                            </div>
                            <a href="tourist-guides.html?tripId=${tripId}&city=${trip.destination}" class="btn btn-primary btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.7rem;">Book Expert</a>
                        </div>
                    </div>
                `;
                const container = document.getElementById('itinerary-content');
                if (container) container.insertAdjacentHTML('beforeend', guideHtml);
            }
        }

    } catch (error) {
        loadingDiv.style.display = 'none';
        showToast(error.message, 'error');
    }
});

function initMap() {
    const mapCenter = { lat: 20.5937, lng: 78.9629 }; // Default India
    map = new google.maps.Map(document.getElementById("map-view"), {
        zoom: 4,
        center: mapCenter,
        styles: [
            { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
            { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
            { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
            { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
            { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
            { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
            { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
            { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
            { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
            { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
            { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
            { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
            { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
            { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
            { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
            { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
            { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
            { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
        ]
    });
}

function renderItinerary(data) {
    if (data.budget_breakdown) {
        const hotelEl = document.getElementById('budget-hotel');
        const foodEl = document.getElementById('budget-food');
        const transEl = document.getElementById('budget-transport');
        
        if (hotelEl) hotelEl.textContent = `₹${data.budget_breakdown.hotel || 0}`;
        if (foodEl) foodEl.textContent = `₹${data.budget_breakdown.food || 0}`;
        if (transEl) transEl.textContent = `₹${data.budget_breakdown.transport || 0}`;
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

        // Plot on map if available
        if (typeof google !== 'undefined' && map) {
            updateMapWithActivities(data.days);
        }
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

function updateMapWithActivities(days) {
    // Clear old markers
    markers.forEach(m => m.setMap(null));
    markers = [];

    const geocoder = new google.maps.Geocoder();
    const bounds = new google.maps.LatLngBounds();

    days.forEach(day => {
        (day.activities || []).forEach(activity => {
            geocoder.geocode({ address: activity }, (results, status) => {
                if (status === "OK") {
                    const marker = new google.maps.Marker({
                        map: map,
                        position: results[0].geometry.location,
                        title: activity,
                        label: day.day.toString(),
                        animation: google.maps.Animation.DROP
                    });
                    
                    const infoWindow = new google.maps.InfoWindow({
                        content: `<div style="color: black;"><strong>Day ${day.day}:</strong> ${activity}</div>`
                    });

                    marker.addListener("click", () => {
                        infoWindow.open(map, marker);
                    });

                    markers.push(marker);
                    bounds.extend(results[0].geometry.location);
                    map.fitBounds(bounds);
                }
            });
        });
    });
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

function renderHero(trip) {
    const title = document.getElementById('trip-title');
    const dates = document.getElementById('trip-dates');
    
    if (title) title.textContent = `Trip to ${trip.destination}`;
    if (dates) dates.textContent = `${trip.days} Days • ${trip.members.length} Travelers`;
}

function renderHotelSpotlight(hotels) {
    const container = document.getElementById('hotel-spotlight');
    if (!container || !hotels.length) return;

    container.innerHTML = hotels.slice(0, 3).map((hotel, index) => `
        <div class="spotlight-card animate-slide-up" style="animation-delay: ${index * 150}ms">
            <div class="spotlight-img-container">
                <img src="${hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500'}" alt="${hotel.name}">
                <div class="spotlight-price">₹${hotel.price}</div>
            </div>
            <div class="spotlight-info">
                <div class="flex justify-between items-start">
                    <h4>${hotel.name}</h4>
                    <div class="rating-mini"><i class="fas fa-star"></i> ${hotel.rating}</div>
                </div>
                <p class="text-secondary small mt-1"><i class="fas fa-map-marker-alt"></i> Highly rated in ${hotel.tag || 'City Center'}</p>
                <div class="flex gap-1 mt-2">
                    <a href="booking.html" class="btn btn-primary btn-sm flex-1">Select Room</a>
                </div>
            </div>
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
