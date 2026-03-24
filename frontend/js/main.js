// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
        });
    }
});

// Auth Forms
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

const API_BASE = '/api/v1';

if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearMessages();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }

        if (!isValidEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in…';

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user_id', data.user_id);
                window.location.href = 'dashboard.html';
            } else if (res.status === 401) {
                showError('Invalid email or password.');
            } else {
                showError('Something went wrong. Please try again.');
            }
        } catch (err) {
            showError('Could not reach the server. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign in';
        }
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearMessages();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;
        const submitBtn = signupForm.querySelector('button[type="submit"]');

        if (!name || !email || !password || !confirmPassword) {
            showError('Please fill in all fields');
            return;
        }

        if (!isValidEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }

        if (password.length < 8) {
            showError('Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        if (!terms) {
            showError('You must agree to the Terms of Service and Privacy Policy');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account…';

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user_id', data.user_id);
                window.location.href = 'dashboard.html';
            } else if (res.status === 422) {
                showError('Password is too weak. Use at least 8 characters including a number and a symbol.');
            } else if (res.status === 500) {
                showError('An account with this email may already exist.');
            } else {
                showError('Something went wrong. Please try again.');
            }
        } catch (err) {
            showError('Could not reach the server. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create account';
        }
    });
}

// Helper functions
function showError(message) {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.classList.remove('hidden');
        el.querySelector('p').textContent = message;
    }
}

function clearMessages() {
    const el = document.getElementById('errorMessage');
    if (el) el.classList.add('hidden');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// OAuth button handlers (not yet implemented)
document.querySelectorAll('.oauth-btn').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        const provider = this.textContent.trim().includes('Google') ? 'Google' : 'GitHub';
        showError(`${provider} sign-in is not yet available.`);
    });
});
