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

if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');
        
        // Basic validation
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }
        
        if (!isValidEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }
        
        // TODO: Implement actual authentication
        // For now, just show a success message
        console.log('Login attempt:', { email });
        
        // Redirect to dashboard (placeholder)
        // window.location.href = 'dashboard.html';
        
        showError('Authentication not yet implemented. This is a demo.');
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;
        const errorMessage = document.getElementById('errorMessage');
        
        // Basic validation
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
        
        // TODO: Implement actual registration
        console.log('Signup attempt:', { name, email });
        
        // Redirect to dashboard (placeholder)
        // window.location.href = 'dashboard.html';
        
        showError('Registration not yet implemented. This is a demo.');
    });
}

// Helper functions
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.classList.remove('hidden');
        errorMessage.querySelector('p').textContent = message;
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// OAuth button handlers (placeholders)
document.querySelectorAll('.oauth-btn').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        const provider = this.textContent.includes('Google') ? 'Google' : 'GitHub';
        console.log(`OAuth login with ${provider} not yet implemented`);
        showError(`${provider} authentication not yet implemented. This is a demo.`);
    });
});
