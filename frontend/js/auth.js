// Simple fake authentication for demo purposes
// In production, this would connect to a real backend API

class Auth {
    constructor() {
        this.storageKey = 'indexnode_auth_token';
        this.userKey = 'indexnode_user';
    }

    // Check if user is authenticated
    isAuthenticated() {
        return localStorage.getItem(this.storageKey) !== null;
    }

    // Get current user
    getUser() {
        const userJson = localStorage.getItem(this.userKey);
        return userJson ? JSON.parse(userJson) : null;
    }

    // Login with email and password
    async login(email, password) {
        // Simulate API call delay
        await this.delay(500);

        // For demo: accept any email/password
        const fakeToken = this.generateToken();
        const user = {
            email: email,
            name: email.split('@')[0],
            credits: 1000,
            plan: 'Free'
        };

        localStorage.setItem(this.storageKey, fakeToken);
        localStorage.setItem(this.userKey, JSON.stringify(user));

        return { success: true, user };
    }

    // Signup with name, email, password
    async signup(name, email, password) {
        // Simulate API call delay
        await this.delay(500);

        // For demo: just validate and return success
        // Do NOT write token - user must login after signup
        // In production, this would create account in database
        
        return { 
            success: true, 
            message: 'Account created successfully' 
        };
    }

    // Logout
    logout() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.userKey);
        window.location.href = 'index.html';
    }

    // Redirect to login if not authenticated
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // Helper: generate fake token
    generateToken() {
        return 'fake_token_' + Math.random().toString(36).substr(2, 9);
    }

    // Helper: delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global auth instance - attach to window for access from dashboard.js
window.auth = new Auth();

// Handle login form
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        // Disable button and show loading
        submitButton.disabled = true;
        submitButton.textContent = 'Signing in...';
        errorMessage.classList.add('hidden');

        try {
            const result = await window.auth.login(email, password);
            
            if (result.success) {
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            errorMessage.classList.remove('hidden');
            errorMessage.querySelector('p').textContent = 'Login failed. Please try again.';
            submitButton.disabled = false;
            submitButton.textContent = 'Sign in';
        }
    });
}

// Handle signup form
if (document.getElementById('signupForm')) {
    const signupForm = document.getElementById('signupForm');
    const errorMessage = document.getElementById('errorMessage');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;
        const submitButton = signupForm.querySelector('button[type="submit"]');

        // Validate
        if (password !== confirmPassword) {
            errorMessage.classList.remove('hidden');
            errorMessage.querySelector('p').textContent = 'Passwords do not match.';
            return;
        }

        if (!terms) {
            errorMessage.classList.remove('hidden');
            errorMessage.querySelector('p').textContent = 'You must agree to the Terms of Service.';
            return;
        }

        // Disable button and show loading
        submitButton.disabled = true;
        submitButton.textContent = 'Creating account...';
        errorMessage.classList.add('hidden');

        try {
            const result = await window.auth.signup(name, email, password);
            
            if (result.success) {
                // Show success message
                alert('Account created successfully! Please login.');
                // Redirect to login page
                window.location.href = 'login.html';
            }
        } catch (error) {
            errorMessage.classList.remove('hidden');
            errorMessage.querySelector('p').textContent = 'Signup failed. Please try again.';
            submitButton.disabled = false;
            submitButton.textContent = 'Create account';
        }
    });
}
