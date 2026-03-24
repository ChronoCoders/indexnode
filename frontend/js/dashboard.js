const GRAPHQL_URL = '/graphql';

// Send a GraphQL request with the stored JWT.
async function gql(query, variables = {}) {
    const token = window.auth.getToken();
    const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

// Fallback: redirect if auth takes too long to initialise.
setTimeout(function () {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
        window.location.href = 'login.html';
    }
}, 3000);

document.addEventListener('DOMContentLoaded', () => {
    if (!window.auth || !window.auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');

    loadStats();
    setupCreateJobForm();
    setupContractSearch();
    setupLogout();
});

// ── Stats ────────────────────────────────────────────────────────────────────

async function loadStats() {
    try {
        const data = await gql(`{
            creditBalance
            rateLimitStatus { tier quota used remaining }
        }`);

        setStat('credits', data.creditBalance.toLocaleString('en-US'));
        setStat('quota-used', data.rateLimitStatus.used.toLocaleString('en-US'));
        setStat('quota-remaining', data.rateLimitStatus.remaining.toLocaleString('en-US'));
        setStat('tier', data.rateLimitStatus.tier);
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

function setStat(key, value) {
    const el = document.querySelector(`[data-stat="${key}"]`);
    if (el) el.textContent = value;
}

// ── Create Job Form ──────────────────────────────────────────────────────────

function setupCreateJobForm() {
    const form = document.getElementById('createJobForm');
    if (!form) return;

    const feedback = document.getElementById('jobFeedback');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFeedback(feedback);

        const contractAddress = document.getElementById('contractAddress').value.trim();
        const chain = document.getElementById('blockchain').value;
        const eventName = document.getElementById('eventName').value.trim();
        const startBlock = parseInt(document.getElementById('startBlock').value) || 0;
        const submitBtn = form.querySelector('button[type="submit"]');

        if (!contractAddress) {
            showFeedback(feedback, 'error', 'Contract address is required.');
            return;
        }

        const events = eventName ? [eventName] : [];

        submitBtn.disabled = true;
        submitBtn.textContent = 'Starting…';

        try {
            const data = await gql(`
                mutation CreateJob($input: CreateBlockchainJobInput!) {
                    createBlockchainJob(input: $input) {
                        id
                        status
                    }
                }
            `, {
                input: {
                    contractAddress,
                    chain,
                    events,
                    fromBlock: startBlock,
                    toBlock: null,
                },
            });

            showFeedback(feedback, 'success',
                `Job created — ID: ${data.createBlockchainJob.id} (${data.createBlockchainJob.status})`);
            form.reset();
        } catch (err) {
            showFeedback(feedback, 'error', `Failed to create job: ${err.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Start Indexing';
        }
    });
}

// ── Events Table (contract search) ───────────────────────────────────────────

function setupContractSearch() {
    const form = document.getElementById('contractSearchForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const address = document.getElementById('searchContractAddress').value.trim();
        if (!address) return;
        await loadEvents(address);
    });
}

async function loadEvents(contractAddress) {
    const tbody = document.getElementById('eventsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">Loading…</td></tr>`;

    try {
        const data = await gql(`
            query Events($address: String!, $limit: Int) {
                blockchainEvents(contractAddress: $address, limit: $limit) {
                    id
                    contractAddress
                    eventName
                    blockNumber
                    transactionHash
                    contentHash
                    ipfsCid
                }
            }
        `, { address: contractAddress, limit: 20 });

        const events = data.blockchainEvents;

        if (events.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No events found for this contract.</td></tr>`;
            return;
        }

        tbody.innerHTML = events.map(ev => {
            const short = addr => addr.slice(0, 8) + '…' + addr.slice(-6);
            const verified = ev.contentHash
                ? `<span class="inline-flex items-center text-xs text-green-400">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>Verified</span>`
                : `<span class="text-xs text-gray-500">Pending</span>`;

            return `<tr class="hover:bg-gray-800/50">
                <td class="px-6 py-4 font-mono text-xs text-gray-300">${short(ev.contractAddress)}</td>
                <td class="px-6 py-4">${ev.eventName}</td>
                <td class="px-6 py-4 text-gray-400">${ev.blockNumber}</td>
                <td class="px-6 py-4 font-mono text-xs text-gray-400">${short(ev.transactionHash)}</td>
                <td class="px-6 py-4">${verified}</td>
                <td class="px-6 py-4 text-xs text-gray-500">${ev.ipfsCid ? ev.ipfsCid.slice(0, 12) + '…' : '—'}</td>
            </tr>`;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-red-400">${err.message}</td></tr>`;
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function showFeedback(el, type, message) {
    if (!el) return;
    el.classList.remove('hidden', 'text-green-400', 'text-red-400');
    el.classList.add(type === 'success' ? 'text-green-400' : 'text-red-400');
    el.textContent = message;
}

function clearFeedback(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.textContent = '';
}

function setupLogout() {
    document.querySelector('[data-logout]')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.auth.logout();
    });
}
