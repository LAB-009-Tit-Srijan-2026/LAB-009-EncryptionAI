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
    const token = localStorage.getItem('token');
    if (!token && redirectIfNotAuthenticated) {
        window.location.href = 'auth.html';
    }
    return token !== null;
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'auth.html';
}

function updateNavbarAuth() {
    const isAuth = localStorage.getItem('token') !== null;
    const authLink = document.getElementById('nav-auth-link');
    const dashboardLink = document.getElementById('nav-dashboard-link');
    
    if (authLink) {
        authLink.style.display = isAuth ? 'none' : 'block';
    }
    if (dashboardLink) {
        dashboardLink.style.display = isAuth ? 'block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateNavbarAuth();
});
