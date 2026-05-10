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
    let bookingVotes = {};
    let lastRawResults = [];

    // Listen for vote updates
    window.addEventListener('votes-updated', (e) => {
        bookingVotes = e.detail;
        console.log('Votes updated:', bookingVotes);
        // Re-render if we have results to apply pinning
        if (lastRawResults.length > 0) {
            renderBookingCards(lastRawResults);
        }
    });

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
                // Flatten recommendations into one list
                lastRawResults = [
                    ...recs.hotels.map(h => ({...h, type: 'Hotel'})),
                    ...recs.transport.map(t => ({...t, type: 'Transport'})),
                    ...recs.activities.map(a => ({...a, type: 'Activity'}))
                ];
            } else {
                data = await ApiService.searchBookings(tripId, currentType);
                lastRawResults = data.results;
            }

            loadingDiv.style.display = 'none';
            renderSourceBanner(lastRawResults.source || 'ai_estimated');
            renderBookingCards(lastRawResults.results || []);
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

        // Apply Votes & Sort (Pinned)
        const sorted = [...results].sort((a, b) => {
            const votesA = bookingVotes[a.name] || 0;
            const votesB = bookingVotes[b.name] || 0;
            return votesB - votesA;
        });

        bookingResults.innerHTML = sorted.map((item, index) => {
            const votes = bookingVotes[item.name] || 0;
            const isPinned = index === 0 && votes > 0;
            const source = item.source || 'ai_estimated';
            const isReal = source !== "ai_estimated" && source !== "static";

            return `
                <div class="booking-card animate-slide-up ${isPinned ? 'pinned-choice' : ''}" style="animation-delay: ${index * 100}ms">
                    <div class="source-badge ${isReal ? 'live' : 'estimated'}">
                        ${isReal ? '✅ Live' : '🤖 Estimated'}
                    </div>
                    ${isPinned ? `
                        <div class="pinned-badge">
                            <i class="fas fa-crown"></i> GROUP CHOICE
                        </div>
                    ` : ''}
                    ${item.ai_recommended ? `
                        <div class="ai-badge" style="${isPinned ? 'top: 35px;' : ''}">
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
                            <button class="btn btn-outline btn-sm" style="flex: 0 0 auto;" onclick="voteFor('${item.name}', '${item.type || currentType}')">
                                <i class="fas fa-thumbs-up"></i> ${votes}
                            </button>
                            <button class="btn btn-outline btn-sm flex-1" onclick="previewBooking('${item.name}')">Preview</button>
                            <button class="btn btn-primary btn-sm flex-1" onclick="confirmBooking('${item.name}', '${item.type || currentType}')">Book</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Add voteFor globally or inside
    window.voteFor = (name, category) => {
        socketManager.voteBooking(name, category);
        showToast(`Voted for ${name}!`, 'success');
    };

    function renderSourceBanner(source) {
        const bannerContainer = document.getElementById('source-banner-container');
        if (!bannerContainer) return;
        
        const isReal = source !== 'ai_estimated' && source !== 'static';
        const config = isReal ? {
            class: 'bg-success-light text-success',
            icon: 'check-circle',
            text: `Live data: ${source.replace('_', ' ')} API — real inventory`
        } : {
            class: 'bg-warning-light text-warning',
            icon: 'exclamation-triangle',
            text: 'AI Estimated — add API keys for live data'
        };

        bannerContainer.innerHTML = `
            <div class="p-1 mb-2 border-radius-sm flex items-center gap-1 ${config.class}" style="font-size: 0.85rem;">
                <i class="fas fa-${config.icon}"></i>
                <span>${config.text}</span>
            </div>
        `;
    }
});

function previewBooking(name) {
    showToast(`Showing details for ${name}...`, 'info');
}

async function confirmBooking(name, type, offerId = null) {
    // Mock the booking flow
    const modal = document.getElementById('booking-success-modal');
    const msg = document.getElementById('success-msg');
    
    let confirmationText = `Your ${type} booking for "${name}" has been confirmed and synced with your group itinerary.`;
    if (offerId) {
        confirmationText += ` (Ref: ${offerId.substring(0, 12)})`;
    }
    
    msg.textContent = confirmationText;
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
