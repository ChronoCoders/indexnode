const GRAPHQL_URL = '/graphql';

// Send a GraphQL request with the stored JWT.
async function gql(query, variables = {}) {
    const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
        if (res.status === 401) {
            window.auth.logout();
            throw new Error('Session expired. Please log in again.');
        }
        throw new Error(`HTTP ${res.status}`);
    }
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

    resetEventStats();
    setupWalletSection();
    setupCreateJobForm();
    setupContractSearch();
    setupLogout();
});

// ── Snapshot Stats ───────────────────────────────────────────────────────────

function resetEventStats() {
    setStat('events-total', '—');
    setStat('events-verified', '—');
    setStat('events-ipfs', '—');
    setStat('events-latest-block', '—');
}

function updateEventStats(events) {
    const total = events.length;
    const verified = events.filter(e => e.contentHash).length;
    const withIpfs = events.filter(e => e.ipfsCid).length;
    const latestBlock = total ? events[0].blockNumber : null;

    setStat('events-total', total.toLocaleString('en-US'));
    setStat('events-verified', verified.toLocaleString('en-US'));
    setStat('events-ipfs', withIpfs.toLocaleString('en-US'));
    setStat('events-latest-block', latestBlock ? latestBlock.toLocaleString('en-US') : '—');
}

function setStat(key, value) {
    const el = document.querySelector(`[data-stat="${key}"]`);
    if (el) el.textContent = value;
}

// ── Wallet Section ───────────────────────────────────────────────────────────

async function setupWalletSection() {
    // Load existing wallet if any.
    try {
        const data = await gql(`{ walletInfo { walletAddress creditBalance } }`);
        if (data.walletInfo) {
            showRegisteredWallet(data.walletInfo.walletAddress);
        }
    } catch (err) {
        console.error('Failed to load wallet info:', err);
    }

    const form = document.getElementById('walletForm');
    const feedback = document.getElementById('walletFeedback');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const addr = document.getElementById('walletInput').value.trim();
        if (!addr) return;

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Registering…';
        clearFeedback(feedback);

        try {
            const data = await gql(`
                mutation RegisterWallet($addr: String!) {
                    registerWallet(walletAddress: $addr) { walletAddress creditBalance }
                }
            `, { addr });
            showRegisteredWallet(data.registerWallet.walletAddress);
            showFeedback(feedback, 'success', 'Wallet registered successfully.');
            form.reset();
        } catch (err) {
            showFeedback(feedback, 'error', `Registration failed: ${err.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Register Wallet';
        }
    });
}

function showRegisteredWallet(address) {
    const statusEl = document.getElementById('walletStatus');
    const addrEl = document.getElementById('walletAddress');
    if (statusEl && addrEl) {
        addrEl.textContent = address.slice(0, 10) + '…' + address.slice(-8);
        addrEl.title = address;
        statusEl.classList.remove('hidden');
    }
    const input = document.getElementById('walletInput');
    if (input) input.placeholder = address;
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
            updateEventStats([]);
            return;
        }

        updateEventStats(events);
        tbody.innerHTML = '';
        const short = addr => {
            const a = String(addr ?? '');
            return a.slice(0, 8) + '…' + a.slice(-6);
        };
        for (const ev of events) {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-800/50';

            const tdContract = document.createElement('td');
            tdContract.className = 'px-6 py-4 font-mono text-xs text-gray-300';
            tdContract.textContent = short(ev.contractAddress);

            const tdEvent = document.createElement('td');
            tdEvent.className = 'px-6 py-4';
            tdEvent.textContent = ev.eventName;

            const tdBlock = document.createElement('td');
            tdBlock.className = 'px-6 py-4 text-gray-400';
            tdBlock.textContent = ev.blockNumber;

            const tdTx = document.createElement('td');
            tdTx.className = 'px-6 py-4 font-mono text-xs text-gray-400';
            tdTx.textContent = short(ev.transactionHash);

            const tdStatus = document.createElement('td');
            tdStatus.className = 'px-6 py-4';
            const statusSpan = document.createElement('span');
            if (ev.contentHash) {
                statusSpan.className = 'inline-flex items-center text-xs text-green-400';
                // SVG is static markup — no user data interpolated.
                statusSpan.innerHTML = '<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>Verified';
            } else {
                statusSpan.className = 'text-xs text-gray-500';
                statusSpan.textContent = 'Pending';
            }
            tdStatus.appendChild(statusSpan);

            const tdIpfs = document.createElement('td');
            tdIpfs.className = 'px-6 py-4 text-xs text-gray-500';
            tdIpfs.textContent = ev.ipfsCid ? String(ev.ipfsCid).slice(0, 12) + '…' : '—';

            tr.append(tdContract, tdEvent, tdBlock, tdTx, tdStatus, tdIpfs);
            tbody.appendChild(tr);
        }
    } catch (err) {
        resetEventStats();
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'px-6 py-8 text-center text-red-400';
        td.textContent = err.message;
        tr.appendChild(td);
        tbody.innerHTML = '';
        tbody.appendChild(tr);
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

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function setupLogout() {
    document.querySelector('[data-logout]')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.auth.logout();
    });
}
