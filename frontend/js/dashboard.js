// Dashboard functionality with fake data
// In production, this would fetch real data from the backend API

// Fallback: Hide loading screen after 3 seconds if auth check fails
setTimeout(function() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent = document.getElementById('mainContent');
    
    if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
        console.error('Dashboard loading timeout - auth.js may have failed to load');
        // Hide loading, show error
        if (loadingScreen) {
            loadingScreen.innerHTML = '<div class="text-center"><p class="text-red-400 mb-4">Error: Authentication system failed to load</p><a href="index.html" class="text-cyan-400 hover:text-cyan-300">Return to Home</a></div>';
        }
    }
}, 3000);

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initializing...');
    console.log('Auth object:', typeof window.auth);
    
    // Require authentication
    if (typeof window.auth === 'undefined' || !window.auth.isAuthenticated()) {
        console.log('Not authenticated, redirecting to login...');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('User authenticated!');
    
    // Hide loading screen and show main content
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent = document.getElementById('mainContent');
    
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
    if (mainContent) {
        mainContent.classList.remove('hidden');
    }
    
    console.log('Dashboard visible');
    
    // Force hide loading screen after 5 seconds max (fallback)
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
            console.warn('Loading screen timed out, forcing display');
            loadingScreen.classList.add('hidden');
            const mainContent = document.getElementById('mainContent');
            if (mainContent) mainContent.classList.remove('hidden');
        }
    }, 2000);

    loadUserInfo();
    loadStats();
    loadRecentEvents();
    setupLogout();
});

// Load user info
function loadUserInfo() {
    const currentUser = window.auth ? window.auth.getUser() : null;
    const userNameElement = document.querySelector('[data-user-name]');
    const userEmailElement = document.querySelector('[data-user-email]');
    
    if (userNameElement && currentUser) {
        userNameElement.textContent = currentUser.name || 'User';
    }
    if (userEmailElement && currentUser) {
        userEmailElement.textContent = currentUser.email || '';
    }
}

// Load dashboard stats
function loadStats() {
    const currentUser = window.auth ? window.auth.getUser() : null;
    // Simulate API call with fake data
    const stats = {
        totalEvents: formatNumber(1247893),
        activeJobs: 5,
        creditBalance: (currentUser && currentUser.credits) ? currentUser.credits : 10000,
        verifiedHashes: formatNumber(847291)
    };

    // Update stats in UI
    updateStat('[data-stat="total-events"]', stats.totalEvents);
    updateStat('[data-stat="active-jobs"]', stats.activeJobs);
    updateStat('[data-stat="credits"]', stats.creditBalance);
    updateStat('[data-stat="verified-hashes"]', stats.verifiedHashes);
}

// Load recent blockchain events
function loadRecentEvents() {
    // Fake event data
    const events = [
        {
            contract: '0x1f9840...C02aaA',
            event: 'Transfer',
            block: '18524031',
            chain: 'Ethereum',
            status: 'verified'
        },
        {
            contract: '0x7a250d...56978a',
            event: 'Approval',
            block: '18524029',
            chain: 'Polygon',
            status: 'verified'
        },
        {
            contract: '0xa0b869...9c5204',
            event: 'Swap',
            block: '18524027',
            chain: 'Ethereum',
            status: 'processing'
        },
        {
            contract: '0x2b591e...99ba39',
            event: 'Mint',
            block: '18524025',
            chain: 'Polygon',
            status: 'verified'
        },
        {
            contract: '0x514910...51de68',
            event: 'Transfer',
            block: '18524022',
            chain: 'Ethereum',
            status: 'verified'
        }
    ];

    const tbody = document.querySelector('[data-events-table] tbody');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    // Add event rows
    events.forEach(event => {
        const row = createEventRow(event);
        tbody.appendChild(row);
    });
}

// Create event table row
function createEventRow(event) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-800/50';

    const statusHTML = event.status === 'verified' 
        ? `<span class="inline-flex items-center text-xs text-green-400">
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            Verified
        </span>`
        : `<span class="inline-flex items-center text-xs text-yellow-400">
            <svg class="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing
        </span>`;

    const chainColor = event.chain === 'Ethereum' ? 'text-cyan-400' : 'text-purple-400';

    tr.innerHTML = `
        <td class="px-5 py-3 font-mono text-xs text-gray-300">${event.contract}</td>
        <td class="px-5 py-3">${event.event}</td>
        <td class="px-5 py-3 text-gray-400">${event.block}</td>
        <td class="px-5 py-3">
            <span class="${chainColor}">${event.chain}</span>
        </td>
        <td class="px-5 py-3">
            ${statusHTML}
        </td>
    `;

    return tr;
}

// Update stat in UI
function updateStat(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = value;
    }
}

// Format number with commas
function formatNumber(num) {
    return num.toLocaleString('en-US');
}

// Setup logout button
function setupLogout() {
    const logoutButton = document.querySelector('[data-logout]');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.auth) {
                window.auth.logout();
            } else {
                // Fallback if auth not loaded
                localStorage.clear();
                window.location.href = 'index.html';
            }
        });
    }
}

// Refresh data every 30 seconds
setInterval(() => {
    loadStats();
    loadRecentEvents();
}, 30000);
