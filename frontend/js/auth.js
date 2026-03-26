class Auth {
    isAuthenticated() {
        return hasAuthCookie();
    }

    getToken() {
        return null;
    }

    getUserId() {
        return localStorage.getItem('user_id');
    }

    // Returns a minimal user object from localStorage.
    // Full profile would require a /api/v1/me endpoint.
    getUser() {
        const user_id = localStorage.getItem('user_id');
        if (!user_id) return null;
        return { user_id };
    }

    logout() {
        fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
        localStorage.removeItem('user_id');
        window.location.href = 'index.html';
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
}

function hasAuthCookie() {
    return document.cookie.split(';').some(c => c.trim().startsWith('auth_present='));
}

window.auth = new Auth();
