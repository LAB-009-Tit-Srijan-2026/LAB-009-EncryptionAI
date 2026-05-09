document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('id');

    if (!tripId) {
        showToast('Please select a trip from the dashboard first.', 'info');
        window.location.href = 'dashboard.html';
        return;
    }

    // Set nav links
    document.getElementById('nav-itinerary').href = `itinerary.html?id=${tripId}`;
    document.getElementById('nav-expenses').href = `expenses.html?id=${tripId}`;
    document.getElementById('nav-chat').href = `chat.html?id=${tripId}`;
    document.getElementById('nav-booking').href = `booking.html?id=${tripId}`;

    // Init Sockets
    socketManager.init(tripId);

    const bookingResults = document.getElementById('booking-results');
    const loadingDiv = document.getElementById('booking-loading');
    const btnSearch = document.getElementById('btn-search');
    let currentType = 'hotels';

    // Tab Logic
    const tabs = document.querySelectorAll('.booking-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentType = tab.dataset.type;
            loadResults();
        });
    });

    // Initial Load
    loadResults();

    btnSearch.addEventListener('click', loadResults);

    async function loadResults() {
        bookingResults.innerHTML = '';
        loadingDiv.style.display = 'block';

        try {
            let data;
            if (currentType === 'recommendations') {
                const recs = await ApiService.getBookingRecommendations(tripId);
                renderRecommendations(recs);
                loadingDiv.style.display = 'none';
                return;
            } else {
                data = await ApiService.searchBookings(tripId, currentType);
            }

            loadingDiv.style.display = 'none';
            renderBookingCards(data.results);
        } catch (error) {
            loadingDiv.style.display = 'none';
            showToast(error.message, 'error');
        }
    }

    function renderBookingCards(results) {
        if (!results || results.length === 0) {
            bookingResults.innerHTML = '<p class="text-center text-secondary py-5">No matches found for your search.</p>';
            return;
        }

        bookingResults.innerHTML = results.map((item, index) => `
            <div class="booking-card animate-slide-up" style="animation-delay: ${index * 100}ms">
                ${item.ai_recommended ? `
                    <div class="ai-badge">
                        <i class="fas fa-magic"></i> AI RECOMMENDED
                    </div>
                ` : ''}
                <img src="${item.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500'}" class="booking-img" alt="${item.name}">
                <div class="card-content">
                    <div class="flex justify-between items-start mb-1">
                        <div>
                            <span class="tag-badge">${item.tag || 'Popular'}</span>
                            <h3 class="mt-1">${item.name}</h3>
                        </div>
                        <div class="text-right">
                            <div class="text-success font-bold" style="font-size: 1.2rem;">₹${item.price}</div>
                            <small class="text-secondary">per person</small>
                        </div>
                    </div>

                    <div class="flex gap-1 mb-1" style="color: #f59e0b; font-size: 0.8rem;">
                        ${Array(5).fill(0).map((_, i) => `<i class="${i < Math.floor(item.rating) ? 'fas' : 'far'} fa-star"></i>`).join('')}
                        <span class="text-secondary">(${item.rating})</span>
                    </div>

                    <div class="recommendation-reason">
                        <i class="fas fa-robot text-primary"></i> ${item.reason}
                    </div>

                    <div class="flex gap-1 mt-2">
                        <button class="btn btn-outline btn-sm flex-1" onclick="previewBooking('${item.name}')">Preview</button>
                        <button class="btn btn-primary btn-sm flex-1" onclick="confirmBooking('${item.name}', '${item.type || currentType}')">Book Now</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function renderRecommendations(recs) {
        // Flatten recommendations into one list
        const all = [
            ...recs.hotels.map(h => ({...h, type: 'Hotel'})),
            ...recs.transport.map(t => ({...t, type: 'Transport'})),
            ...recs.activities.map(a => ({...a, type: 'Activity'}))
        ];
        renderBookingCards(all);
    }
});

function previewBooking(name) {
    showToast(`Showing details for ${name}...`, 'info');
}

async function confirmBooking(name, type) {
    // Mock the booking flow
    const modal = document.getElementById('booking-success-modal');
    const msg = document.getElementById('success-msg');
    
    msg.textContent = `Your ${type} booking for "${name}" has been confirmed and synced with your group itinerary.`;
    modal.style.display = 'flex';
    
    // Notify via Socket.IO
    if (window.socketManager) {
        socketManager.notifyUpdate('booking');
        socketManager.socket.emit('send-message', {
            trip_id: socketManager.tripId,
            user_id: socketManager.userId,
            user_name: socketManager.userName,
            content: `📢 I just booked a ${type}: ${name}!`,
            timestamp: new Date().toISOString()
        });
    }
}
