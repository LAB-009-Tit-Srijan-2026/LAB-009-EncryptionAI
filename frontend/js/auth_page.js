document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to dashboard
    if (localStorage.getItem('token')) {
        window.location.href = 'dashboard.html';
    }

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const authSubtitle = document.getElementById('auth-subtitle');

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        authSubtitle.textContent = 'Create an account to start planning';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        authSubtitle.textContent = 'Login to continue';
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = loginForm.querySelector('button');
        btn.innerHTML = '<div class="spinner"></div>';
        btn.disabled = true;

        try {
            const data = await ApiService.login(email, password);
            localStorage.setItem('token', data.access_token);
            showToast('Login successful!');
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        } catch (error) {
            showToast(error.message, 'error');
            btn.innerHTML = 'Login <i class="fas fa-sign-in-alt"></i>';
            btn.disabled = false;
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const btn = registerForm.querySelector('button');
        btn.innerHTML = '<div class="spinner"></div>';
        btn.disabled = true;

        try {
            await ApiService.register(name, email, password);
            showToast('Registration successful! Please login.');
            showLoginLink.click();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            btn.innerHTML = 'Create Account <i class="fas fa-user-plus"></i>';
            btn.disabled = false;
        }
    });
});
