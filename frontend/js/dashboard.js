const GRAPHQL_URL = '/graphql';

// Send a GraphQL request using the HttpOnly cookie for auth.
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

    loadAccountOverview();
    setupWalletSection();
    setupCreateJobForm();
    setupContractSearch();
    setupLogout();

    document.getElementById('refreshJobs')?.addEventListener('click', () => loadAccountOverview());
});

// ── Account Overview ──────────────────────────────────────────────────────────

async function loadAccountOverview() {
    try {
        const data = await gql(`{
            walletInfo { creditBalance }
            myJobs(limit: 50) {
                id jobType status target chain createdAt completedAt error
            }
        }`);

        // Credit balance
        const balance = data.walletInfo ? data.walletInfo.creditBalance : null;
        setStat('credit-balance', balance !== null ? balance.toLocaleString('en-US') : '—');

        // Active jobs count
        const jobs = data.myJobs || [];
        const active = jobs.filter(j => j.status === 'pending' || j.status === 'processing').length;
        setStat('active-jobs', active.toLocaleString('en-US'));

        // Jobs table
        renderJobs(jobs);
    } catch (err) {
        console.error('Failed to load account overview:', err);
        setStat('credit-balance', '—');
        setStat('active-jobs', '—');
    }
}

function renderJobs(jobs) {
    const tbody = document.getElementById('jobsTableBody');
    if (!tbody) return;

    if (!jobs || jobs.length === 0) {
        tbody.innerHTML = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.className = 'px-6 py-8 text-center text-gray-500';
        td.textContent = 'No jobs yet. Create an indexing job below.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    tbody.innerHTML = '';
    for (const job of jobs) {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-800/50';

        const tdType = document.createElement('td');
        tdType.className = 'px-6 py-4 text-sm';
        tdType.textContent = job.jobType === 'blockchain_index' ? 'Blockchain' : job.jobType === 'http_crawl' ? 'HTTP Crawl' : job.jobType;

        const tdTarget = document.createElement('td');
        tdTarget.className = 'px-6 py-4 font-mono text-xs text-gray-300';
        if (job.target) {
            const t = String(job.target);
            tdTarget.textContent = t.length > 20 ? t.slice(0, 10) + '…' + t.slice(-8) : t;
            tdTarget.title = t;
        } else {
            tdTarget.textContent = '—';
        }

        const tdChain = document.createElement('td');
        tdChain.className = 'px-6 py-4 text-sm text-gray-400 capitalize';
        tdChain.textContent = job.chain || '—';

        const tdStatus = document.createElement('td');
        tdStatus.className = 'px-6 py-4';
        const badge = document.createElement('span');
        badge.textContent = job.status;
        const statusClasses = {
            pending:    'bg-yellow-900/40 text-yellow-400',
            processing: 'bg-blue-900/40 text-blue-400',
            completed:  'bg-green-900/40 text-green-400',
            failed:     'bg-red-900/40 text-red-400',
        };
        badge.className = `inline-block px-2 py-0.5 rounded text-xs font-medium ${statusClasses[job.status] || 'bg-gray-800 text-gray-400'}`;
        tdStatus.appendChild(badge);

        const tdCreated = document.createElement('td');
        tdCreated.className = 'px-6 py-4 text-sm text-gray-500';
        tdCreated.textContent = job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

        tr.append(tdType, tdTarget, tdChain, tdStatus, tdCreated);
        tbody.appendChild(tr);
    }
}

function setStat(key, value) {
    const el = document.querySelector(`[data-stat="${key}"]`);
    if (el) el.textContent = value;
}

// ── Event Stats (inline, shown after contract search) ─────────────────────────

function resetEventStats() {
    setStat('events-total', '—');
    setStat('events-verified', '—');
    setStat('events-ipfs', '—');
    setStat('events-latest-block', '—');
    const bar = document.getElementById('eventStatsBar');
    if (bar) bar.style.display = 'none';
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
    const bar = document.getElementById('eventStatsBar');
    if (bar) bar.style.display = 'grid';
}

// ── Wallet Section ───────────────────────────────────────────────────────────

async function setupWalletSection() {
    // Load existing wallet if any.
    try {
        const data = await gql(`{ walletInfo { walletAddress creditBalance } }`);
        if (data.walletInfo && data.walletInfo.walletAddress) {
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
            setStat('credit-balance', data.registerWallet.creditBalance.toLocaleString('en-US'));
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
            // Refresh jobs list to show the new job.
            loadAccountOverview();
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

    tbody.innerHTML = '';
    const loadingTr = document.createElement('tr');
    const loadingTd = document.createElement('td');
    loadingTd.colSpan = 6;
    loadingTd.className = 'px-6 py-8 text-center text-gray-500';
    loadingTd.textContent = 'Loading…';
    loadingTr.appendChild(loadingTd);
    tbody.appendChild(loadingTr);

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
            tbody.innerHTML = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.className = 'px-6 py-8 text-center text-gray-500';
            td.textContent = 'No events found for this contract.';
            tr.appendChild(td);
            tbody.appendChild(tr);
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
        tbody.innerHTML = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'px-6 py-8 text-center text-red-400';
        td.textContent = err.message;
        tr.appendChild(td);
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

function setupLogout() {
    document.querySelector('[data-logout]')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.auth.logout();
    });
}
