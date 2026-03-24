class Auth {
    isAuthenticated() {
        return !!localStorage.getItem('token');
    }

    getToken() {
        return localStorage.getItem('token');
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
        localStorage.removeItem('token');
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

window.auth = new Auth();
