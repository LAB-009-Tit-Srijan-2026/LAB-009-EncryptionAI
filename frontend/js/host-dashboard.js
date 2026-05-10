let currentPropertyId = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    await checkHostStatus();
});

async function checkHostStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/host/me`, {
            headers: ApiService.getHeaders()
        });
        
        if (response.ok) {
            document.getElementById('host-main-dashboard').style.display = 'block';
            await loadProperties();
        } else {
            document.getElementById('host-registration-section').style.display = 'block';
        }
    } catch (error) {
        document.getElementById('host-registration-section').style.display = 'block';
    }
}

async function registerAsHost() {
    const contact = document.getElementById('host-emergency').value.trim();
    if (!contact) {
        showToast("Please provide an emergency contact", "error");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/host/register`, {
            method: 'POST',
            headers: ApiService.getHeaders(),
            body: JSON.stringify({ emergency_contact: contact })
        });

        if (response.ok) {
            showToast("You are now a verified host!");
            location.reload();
        }
    } catch (error) {
        showToast("Registration failed", "error");
    }
}

async function loadProperties() {
    try {
        const response = await fetch(`${API_BASE_URL}/properties/list`, {
            headers: ApiService.getHeaders()
        }).then(res => res.json());

        renderProperties(response);
    } catch (error) {
        console.error("Error loading properties:", error);
    }
}

function renderProperties(properties) {
    const container = document.getElementById('properties-container');
    if (!properties || properties.length === 0) {
        container.innerHTML = `<p class="text-secondary italic">You haven't added any properties yet.</p>`;
        return;
    }

    container.innerHTML = properties.map(prop => `
        <div class="property-item animate-slide-up">
            <div class="property-header">
                <h3>${prop.title}</h3>
                <div class="ai-pill" onclick="showPricingSuggestions(${prop.id})">
                    <i class="fas fa-magic"></i> AI PRICING
                </div>
            </div>
            <p class="text-secondary small mb-1">${prop.city}, ${prop.state}</p>
            <div class="flex justify-between items-center">
                <span class="font-bold">₹${prop.price_per_night} / night</span>
                <div class="flex gap-1">
                    <button class="btn btn-outline btn-sm" onclick="editProperty(${prop.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-outline btn-sm text-danger" onclick="deleteProperty(${prop.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

async function showPricingSuggestions(propId) {
    currentPropertyId = propId;
    const modal = document.getElementById('pricing-ai-modal');
    const content = document.getElementById('pricing-ai-content');
    
    modal.style.display = 'flex';
    content.innerHTML = '<div class="spinner mx-auto"></div><p class="text-center mt-1">AI is analyzing market demand...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/host/pricing-suggestions/${propId}`, {
            headers: ApiService.getHeaders()
        }).then(res => res.json());

        content.innerHTML = `
            <div class="mt-2">
                <div class="flex justify-between items-center bg-surface p-1 rounded mb-2">
                    <span>Current Price</span>
                    <span class="font-bold">₹${response.current_price}</span>
                </div>
                <div class="flex justify-between items-center bg-primary-fade p-1 rounded mb-2" style="background: rgba(79, 70, 229, 0.1);">
                    <span>Suggested Price</span>
                    <span class="font-bold text-primary">₹${response.suggested_price}</span>
                </div>
                <div class="p-1 border-left mt-2">
                    <p class="small italic text-secondary">"${response.ai_strategy}"</p>
                </div>
                <p class="mt-2 small text-warning"><i class="fas fa-info-circle"></i> ${response.insights.message}</p>
            </div>
        `;
    } catch (error) {
        content.innerHTML = '<p class="text-danger">Failed to load suggestions. Please try again later.</p>';
    }
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

async function applySuggestedPrice() {
    showToast("Price updated successfully!", "success");
    closeModal('pricing-ai-modal');
}
