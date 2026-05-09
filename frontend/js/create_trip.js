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
