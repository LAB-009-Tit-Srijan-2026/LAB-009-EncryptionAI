document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    const btnSearch = document.getElementById('btn-search');
    const tabs = document.querySelectorAll('.booking-tab');
    let currentTab = 'hotels';

    // Initial search
    performSearch();

    btnSearch.addEventListener('click', () => performSearch());

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            performSearch();
        });
    });

    async function performSearch() {
        const city = document.getElementById('search-dest').value || 'Paris';
        const budget = document.getElementById('search-budget').value || 1000;
        const resultsGrid = document.getElementById('booking-results');

        resultsGrid.innerHTML = Array(3).fill(0).map(() => `
            <div class="glass-card" style="height: 300px; background: rgba(255,255,255,0.05); border: none;">
                <div class="skeleton" style="height: 180px; border-radius: 1rem;"></div>
                <div class="skeleton" style="height: 20px; width: 60%; margin-top: 1rem;"></div>
                <div class="skeleton" style="height: 15px; width: 40%; margin-top: 0.5rem;"></div>
            </div>
        `).join('');

        try {
            let data;
            if (currentTab === 'hotels') {
                data = await ApiService.searchHotels(city, budget);
                renderHotels(data);
            } else if (currentTab === 'transport') {
                data = await ApiService.searchTransport(city);
                renderTransport(data);
            } else {
                data = await ApiService.searchActivities(city);
                renderActivities(data);
            }
        } catch (error) {
            showToast(error.message, 'error');
            resultsGrid.innerHTML = `<p>Error loading results.</p>`;
        }
    }

    function renderHotels(hotels) {
        const grid = document.getElementById('booking-results');
        grid.innerHTML = hotels.map((h, i) => `
            <div class="glass-card booking-card animate-slide-up" style="animation-delay: ${i * 100}ms">
                ${h.ai_recommended ? `<div class="ai-badge"><i class="fas fa-magic"></i> AI Pick</div>` : ''}
                <img src="${h.image}" class="card-img" alt="${h.name}">
                <div class="card-content">
                    <div class="flex justify-between items-start">
                        <h3>${h.name}</h3>
                        <div class="text-warning"><i class="fas fa-star"></i> ${h.rating}</div>
                    </div>
                    <p class="text-secondary small mb-1"><i class="fas fa-map-marker-alt"></i> ${h.amenities.join(', ')}</p>
                    <div class="flex justify-between items-center mt-2">
                        <span class="price-tag">₹${h.price}<small class="text-secondary">/night</small></span>
                        <button class="btn btn-primary btn-sm">Book Now</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function renderTransport(transport) {
        const grid = document.getElementById('booking-results');
        grid.innerHTML = transport.map((t, i) => `
            <div class="glass-card booking-card animate-slide-up" style="animation-delay: ${i * 100}ms">
                <div class="card-content">
                    <div class="flex justify-between items-center mb-2">
                        <span class="badge" style="background: var(--primary-light); color: var(--primary);">${t.type}</span>
                        <span class="price-tag">₹${t.price}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <div class="text-center">
                            <h2 style="margin:0">${t.dep}</h2>
                            <small class="text-secondary">Departure</small>
                        </div>
                        <div style="flex:1; border-bottom: 2px dashed #ddd; margin: 0 1rem; position: relative;">
                            <i class="fas ${t.type === 'Flight' ? 'fa-plane' : t.type === 'Train' ? 'fa-train' : 'fa-bus'}" style="position: absolute; top: -10px; left: 45%; color: #999;"></i>
                            <div class="text-center small text-secondary" style="margin-top: 5px;">${t.duration}</div>
                        </div>
                        <div class="text-center">
                            <h2 style="margin:0">${t.arr}</h2>
                            <small class="text-secondary">Arrival</small>
                        </div>
                    </div>
                    <div class="mt-2 text-center">
                        <div style="font-weight: 600;">${t.name}</div>
                        <button class="btn btn-outline btn-sm mt-1 w-full">Select Journey</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function renderActivities(activities) {
        const grid = document.getElementById('booking-results');
        grid.innerHTML = activities.map((a, i) => `
            <div class="glass-card booking-card animate-slide-up" style="animation-delay: ${i * 100}ms">
                <img src="${a.image}" class="card-img" alt="${a.name}">
                <div class="card-content">
                    <div class="flex justify-between items-start">
                        <div>
                            <small class="text-primary font-bold">${a.category.toUpperCase()}</small>
                            <h3 style="margin-top: 0.2rem;">${a.name}</h3>
                        </div>
                        <div class="text-warning"><i class="fas fa-star"></i> ${a.rating}</div>
                    </div>
                    <p class="text-secondary small mt-1"><i class="far fa-clock"></i> ${a.duration}</p>
                    <div class="flex justify-between items-center mt-2">
                        <span class="price-tag">₹${a.price}</span>
                        <button class="btn btn-primary btn-sm">Join Activity</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
});
