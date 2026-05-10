document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('tripId');
    const city = urlParams.get('city') || 'Ujjain';

    if (city) {
        document.getElementById('filter-city').value = city;
    }

    // Load AI Recommendations if tripId is present
    if (tripId) {
        loadAIRecommendations(tripId);
    }

    await loadGuides();

    // Setup Form
    const form = document.getElementById('guide-register-form');
    if (form) {
        form.addEventListener('submit', handleRegistration);
    }
});

async function loadGuides() {
    const city = document.getElementById('filter-city').value;
    const specialty = document.getElementById('filter-specialty').value;
    
    let url = `${API_BASE_URL}/guides/list/${city || 'all'}`;
    if (specialty) url += `?specialty=${specialty}`;

    try {
        const response = await fetch(url, {
            headers: ApiService.getHeaders()
        }).then(res => res.json());

        renderGuides(response);
        document.getElementById('guide-count').textContent = response.length;
    } catch (error) {
        console.error("Error loading guides:", error);
    }
}

function renderGuides(guides) {
    const container = document.getElementById('guides-container');
    if (!guides || guides.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 w-full col-span-full">
                <i class="fas fa-user-slash fa-3x text-secondary mb-1"></i>
                <p>No experts found in this city yet. Be the first to guide!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = guides.map(guide => `
        <div class="guide-card animate-slide-up">
            <div class="guide-img-container">
                <img src="${guide.profile_photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'}" class="guide-img" alt="${guide.name}">
                ${guide.verification_status === 'Verified' ? '<div class="guide-verified"><i class="fas fa-check-circle"></i> VERIFIED</div>' : ''}
            </div>
            <div class="guide-info">
                <div class="flex justify-between items-start mb-1">
                    <h3>${guide.name}</h3>
                    <div class="guide-price">₹${guide.price_per_day}/day</div>
                </div>
                <p class="text-secondary small mb-2"><i class="fas fa-map-marker-alt"></i> ${guide.city} • ${guide.experience_years} years exp.</p>
                <div class="flex flex-wrap gap-0-5 mb-2">
                    ${(guide.specialties_json || []).map(s => `<span class="specialty-pill">${s}</span>`).join('')}
                </div>
                <p class="small text-secondary mb-2">${guide.bio ? guide.bio.substring(0, 100) + '...' : 'Local expert passionate about sharing culture and history.'}</p>
                <div class="flex gap-1">
                    <button class="btn btn-outline btn-sm flex-1" onclick="viewProfile(${guide.id})">Profile</button>
                    <button class="btn btn-primary btn-sm flex-1" onclick="bookGuide(${guide.id})">Book Now</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadAIRecommendations(tripId) {
    const banner = document.getElementById('ai-trip-recommendation');
    const text = document.getElementById('ai-match-text');
    
    try {
        const response = await fetch(`${API_BASE_URL}/guides/recommendations/${tripId}`, {
            headers: ApiService.getHeaders()
        }).then(res => res.json());

        if (response && response.guide_recommended) {
            banner.style.display = 'block';
            text.innerHTML = `<strong>AI Insight:</strong> ${response.analysis.reason}<br>
                             <span class="text-primary small">Recommended Guide: ${response.guides[0].name} - ${response.guides[0].match_reason}</span>`;
        }
    } catch (error) {
        console.error("AI Recommendation error:", error);
    }
}

async function handleRegistration(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('guide-name').value,
        city: document.getElementById('guide-city').value,
        phone: document.getElementById('guide-phone').value,
        specialties: document.getElementById('guide-specialties').value.split(',').map(s => s.trim()),
        price: parseFloat(document.getElementById('guide-price').value),
        bio: document.getElementById('guide-bio').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/guides/register`, {
            method: 'POST',
            headers: ApiService.getHeaders(),
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast("Registration successful! Welcome to the expert network.");
            closeModal();
            loadGuides();
        } else {
            const err = await response.json();
            showToast(err.detail || "Registration failed", "error");
        }
    } catch (error) {
        showToast("Server error during registration", "error");
    }
}

function openRegisterModal() {
    document.getElementById('register-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('register-modal').style.display = 'none';
}

async function bookGuide(id) {
    const tripId = new URLSearchParams(window.location.search).get('tripId');
    if (!tripId) {
        showToast("Please select a trip from your dashboard first", "info");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/guides/book`, {
            method: 'POST',
            headers: ApiService.getHeaders(),
            body: JSON.stringify({ guide_id: id, trip_id: tripId })
        }).then(res => res.json());

        showToast(`Booking Confirmed! OTP: ${response.otp}. Contact: ${response.guide_phone}`, "success");
    } catch (error) {
        showToast("Booking failed", "error");
    }
}

function viewProfile(id) {
    location.href = `guide-profile.html?id=${id}`;
}
