document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    const form = document.getElementById('create-trip-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = form.querySelector('button');
        btn.innerHTML = '<div class="spinner"></div> Creating...';
        btn.disabled = true;

        const tripData = {
            destination: document.getElementById('trip-destination').value,
            budget: parseFloat(document.getElementById('trip-budget').value),
            days: parseInt(document.getElementById('trip-days').value),
            group_size: parseInt(document.getElementById('trip-group-size').value),
            interests: document.getElementById('trip-interests').value
        };

        try {
            const trip = await ApiService.createTrip(tripData);
            
            // Handle member invitations
            const membersInput = document.getElementById('trip-members').value.trim();
            if (membersInput) {
                const emails = membersInput.split(',').map(e => e.trim()).filter(e => e);
                for (const email of emails) {
                    try {
                        await ApiService.addMember(trip.id, email);
                    } catch (memberError) {
                        console.error(`Failed to add member ${email}:`, memberError);
                    }
                }
            }
            
            // Store as current trip for sidebar persistence
            localStorage.setItem('last_trip_id', trip.id);
            
            showToast('Trip created successfully!');
            // Redirect to itinerary generation page
            setTimeout(() => window.location.href = `itinerary.html?id=${trip.id}`, 1000);
        } catch (error) {
            showToast(error.message, 'error');
            btn.innerHTML = 'Create Trip <i class="fas fa-arrow-right"></i>';
            btn.disabled = false;
        }
    });
});
