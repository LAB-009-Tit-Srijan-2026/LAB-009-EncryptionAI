document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const city = urlParams.get('city') || '';
    
    if (city) {
        document.getElementById('guide-city-search').value = city;
    }

    await loadGuides(city);

    document.getElementById('guide-city-search').addEventListener('change', (e) => {
        loadGuides(e.target.value);
    });
});

async function loadGuides(city = '') {
    const container = document.getElementById('guides-container');
    container.innerHTML = '<div class="spinner mx-auto"></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/guides/list?city=${city}`, {
            headers: ApiService.getHeaders()
        }).then(res => res.json());

        renderGuides(response);
    } catch (error) {
        console.error("Error loading guides:", error);
        container.innerHTML = '<p class="text-danger text-center">Failed to load guides.</p>';
    }
}

function renderGuides(guides) {
    const container = document.getElementById('guides-container');
    
    if (!guides || guides.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 col-span-full">
                <i class="fas fa-user-slash fa-3x text-secondary mb-1"></i>
                <p>No guides found for this location yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = guides.map(guide => `
        <div class="guide-card animate-slide-up">
            <div class="guide-header">
                <img src="${guide.profile_photo || 'https://i.pravatar.cc/150?u='+guide.id}" class="guide-avatar" alt="${guide.name}">
            </div>
            <div class="guide-content">
                <div class="flex justify-between items-center mb-1">
                    <h3 class="m-0">${guide.name}</h3>
                    <div class="guide-badge badge-verified">
                        <i class="fas fa-check-circle"></i> VERIFIED
                    </div>
                </div>
                <p class="text-secondary small mb-2"><i class="fas fa-map-marker-alt"></i> ${guide.city}</p>
                
                <div class="mb-2">
                    ${(guide.specialties_json || []).map(s => `<span class="specialty-tag">${s}</span>`).join('')}
                </div>

                <div class="flex justify-between items-center mt-3">
                    <div class="guide-price">₹${guide.price_per_day}<span class="small text-secondary">/day</span></div>
                    <div class="text-warning font-bold"><i class="fas fa-star"></i> ${guide.rating}</div>
                </div>

                <div class="flex gap-1 mt-3">
                    <button class="btn btn-outline btn-sm flex-1" onclick="viewGuideProfile(${guide.id})">Profile</button>
                    <button class="btn btn-primary btn-sm flex-1" onclick="bookGuideQuick(${guide.id}, '${guide.name}', ${guide.price_per_day})">Book Now</button>
                </div>
                <div class="mt-2 text-center">
                    <p class="small text-secondary"><i class="fas fa-phone-alt"></i> ${guide.phone || 'Contact locked'}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function viewGuideProfile(id) {
    // location.href = `guide-profile.html?id=${id}`;
    showToast("Profile page coming soon!", "info");
}

async function bookGuideQuick(id, name, price) {
    showToast(`Booking request sent to ${name}!`, "success");
}
