// App level utilities

function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    icon.style.color = type === 'success' ? 'var(--success)' : 'var(--danger)';

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s backwards reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function checkAuth(redirectIfNotAuthenticated = true) {
    const token = localStorage.getItem('access_token');
    if (!token && redirectIfNotAuthenticated) {
        window.location.href = 'auth.html';
    }
    return token !== null;
}

function logout() {
    localStorage.removeItem('access_token');
    window.location.href = 'auth.html';
}

function updateNavbarAuth() {
    const isAuth = localStorage.getItem('access_token') !== null;
    const authLink = document.getElementById('nav-auth-link');
    const dashboardLink = document.getElementById('nav-dashboard-link');
    
    if (authLink) {
        authLink.style.display = isAuth ? 'none' : 'block';
    }
    if (dashboardLink) {
        dashboardLink.style.display = isAuth ? 'block' : 'none';
    }
}

function updateSidebarLinks() {
    const lastTripId = localStorage.getItem('last_trip_id');
    const navLinks = document.querySelectorAll('.sidebar-link');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#' || href === 'dashboard.html') return;

        // Append trip ID to trip-specific pages if we have one
        if (lastTripId && (href === 'expenses.html' || href === 'booking.html' || href === 'chat.html' || href === 'itinerary.html')) {
            link.setAttribute('href', `${href}?id=${lastTripId}`);
        }

        // Active state
        if (href === currentPath) {
            link.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateNavbarAuth();
    updateSidebarLinks();
});
