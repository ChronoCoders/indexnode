const API = '';   // same origin

async function gql(query, variables = {}) {
    const res = await fetch('/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.auth.getToken()}`,
        },
        body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.auth.getToken()}`,
    };
}

async function api(method, path, body) {
    const res = await fetch(API + path, {
        method,
        headers: authHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? `HTTP ${res.status}`);
    return json;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

setTimeout(() => {
    const ls = document.getElementById('loadingScreen');
    if (ls && !ls.classList.contains('hidden')) window.location.href = 'login.html';
}, 3000);

document.addEventListener('DOMContentLoaded', () => {
    if (!window.auth?.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');

    loadProfile();
    loadApiKeys();
    loadWebhooks();
    setupLogout();
    setupApiKeySection();
    setupWebhookSection();
    setupWalletSection();
});

// ── Profile ───────────────────────────────────────────────────────────────────

async function loadProfile() {
    const userIdEl = document.getElementById('profileUserId');
    if (userIdEl) userIdEl.textContent = window.auth.getUserId() ?? '—';

    try {
        const me = await api('GET', '/api/v1/me');
        const emailEl = document.getElementById('profileEmail');
        const roleEl  = document.getElementById('profileRole');
        const sinceEl = document.getElementById('profileSince');
        if (emailEl) emailEl.textContent = me.email;
        if (roleEl)  roleEl.textContent  = me.role;
        if (sinceEl) sinceEl.textContent = formatDate(me.created_at);
        if (userIdEl) userIdEl.textContent = me.user_id;
    } catch (err) {
        console.error('Failed to load profile:', err);
    }
}

// ── API Keys ──────────────────────────────────────────────────────────────────

async function loadApiKeys() {
    const container = document.getElementById('apiKeysList');
    try {
        const keys = await api('GET', '/api/v1/api-keys');
        renderApiKeys(keys);
    } catch (err) {
        container.innerHTML = `<p class="text-red-400 text-sm">${err.message}</p>`;
    }
}

function renderApiKeys(keys) {
    const container = document.getElementById('apiKeysList');
    if (!keys.length) {
        container.innerHTML = `<p class="text-gray-500 text-sm">No API keys yet. Create one above to get started.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="text-left text-gray-400 border-b border-gray-800">
                        <th class="pb-3 pr-6 font-medium">Name</th>
                        <th class="pb-3 pr-6 font-medium">Key prefix</th>
                        <th class="pb-3 pr-6 font-medium">Last used</th>
                        <th class="pb-3 pr-6 font-medium">Expires</th>
                        <th class="pb-3 font-medium"></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
                    ${keys.map(k => `
                    <tr data-key-id="${k.id}">
                        <td class="py-3 pr-6 text-gray-200">${escHtml(k.name)}</td>
                        <td class="py-3 pr-6 font-mono text-xs text-cyan-400">${escHtml(k.key_prefix)}…</td>
                        <td class="py-3 pr-6 text-gray-400">${k.last_used_at ? relativeTime(k.last_used_at) : 'Never'}</td>
                        <td class="py-3 pr-6 text-gray-400">${k.expires_at ? formatDate(k.expires_at) : 'Never'}</td>
                        <td class="py-3 text-right">
                            <button
                                onclick="revokeApiKey('${k.id}')"
                                class="text-xs text-red-400 hover:text-red-300 transition"
                            >Revoke</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

function setupApiKeySection() {
    const showBtn   = document.getElementById('showCreateKeyForm');
    const form      = document.getElementById('createKeyForm');
    const cancelBtn = document.getElementById('cancelCreateKey');
    const createBtn = document.getElementById('createKeyBtn');
    const feedback  = document.getElementById('createKeyFeedback');

    showBtn.addEventListener('click', () => {
        form.classList.remove('hidden');
        showBtn.classList.add('hidden');
        document.getElementById('newKeyReveal').classList.add('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        form.classList.add('hidden');
        showBtn.classList.remove('hidden');
        clearFeedback(feedback);
    });

    createBtn.addEventListener('click', async () => {
        const name = document.getElementById('newKeyName').value.trim();
        const expiry = document.getElementById('newKeyExpiry').value;

        if (!name) {
            showFeedback(feedback, 'error', 'Name is required.');
            return;
        }

        createBtn.disabled = true;
        createBtn.textContent = 'Creating…';
        clearFeedback(feedback);

        try {
            const body = { name };
            if (expiry) body.expires_in_days = parseInt(expiry, 10);

            const key = await api('POST', '/api/v1/api-keys', body);

            // Show one-time reveal.
            const revealBox = document.getElementById('newKeyReveal');
            document.getElementById('newKeyValue').textContent = key.key;
            revealBox.classList.remove('hidden');

            document.getElementById('copyKeyBtn').onclick = () => copyText(key.key, 'copyKeyBtn');

            // Reset & hide form.
            form.classList.add('hidden');
            showBtn.classList.remove('hidden');
            document.getElementById('newKeyName').value = '';
            document.getElementById('newKeyExpiry').value = '';
            clearFeedback(feedback);

            await loadApiKeys();
        } catch (err) {
            showFeedback(feedback, 'error', err.message);
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = 'Create';
        }
    });
}

async function revokeApiKey(id) {
    if (!confirm('Revoke this API key? Any integrations using it will stop working immediately.')) return;
    try {
        await api('DELETE', `/api/v1/api-keys/${id}`);
        await loadApiKeys();
        // Hide reveal box if it belongs to the just-revoked key.
        document.getElementById('newKeyReveal').classList.add('hidden');
    } catch (err) {
        alert(`Failed to revoke key: ${err.message}`);
    }
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

async function loadWebhooks() {
    const container = document.getElementById('webhooksList');
    try {
        const hooks = await api('GET', '/api/v1/webhooks');
        renderWebhooks(hooks);
    } catch (err) {
        container.innerHTML = `<p class="text-red-400 text-sm">${err.message}</p>`;
    }
}

function renderWebhooks(hooks) {
    const container = document.getElementById('webhooksList');
    if (!hooks.length) {
        container.innerHTML = `<p class="text-gray-500 text-sm">No webhooks yet. Register one above to receive job notifications.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="space-y-3">
            ${hooks.map(h => `
            <div class="flex items-start gap-4 p-4 bg-gray-800 rounded-lg" data-hook-id="${h.id}">
                <div class="flex-1 min-w-0">
                    <p class="font-mono text-sm text-gray-200 truncate" title="${escHtml(h.url)}">${escHtml(h.url)}</p>
                    <div class="flex items-center gap-2 mt-1">
                        ${h.events.map(ev => `<span class="text-xs bg-gray-700 text-gray-300 rounded px-1.5 py-0.5">${escHtml(ev)}</span>`).join('')}
                        ${h.is_active
                            ? `<span class="text-xs text-green-400">active</span>`
                            : `<span class="text-xs text-gray-500">inactive</span>`}
                        <span class="text-xs text-gray-600">since ${formatDate(h.created_at)}</span>
                    </div>
                </div>
                <button
                    onclick="deleteWebhook('${h.id}')"
                    class="shrink-0 text-xs text-red-400 hover:text-red-300 transition"
                >Delete</button>
            </div>`).join('')}
        </div>`;
}

function setupWebhookSection() {
    const showBtn   = document.getElementById('showCreateWebhookForm');
    const form      = document.getElementById('createWebhookForm');
    const cancelBtn = document.getElementById('cancelCreateWebhook');
    const createBtn = document.getElementById('createWebhookBtn');
    const feedback  = document.getElementById('createWebhookFeedback');

    showBtn.addEventListener('click', () => {
        form.classList.remove('hidden');
        showBtn.classList.add('hidden');
        document.getElementById('newWebhookReveal').classList.add('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        form.classList.add('hidden');
        showBtn.classList.remove('hidden');
        clearFeedback(feedback);
    });

    createBtn.addEventListener('click', async () => {
        const url = document.getElementById('newWebhookUrl').value.trim();
        const completed = document.getElementById('eventCompleted').checked;
        const failed    = document.getElementById('eventFailed').checked;

        if (!url) {
            showFeedback(feedback, 'error', 'URL is required.');
            return;
        }
        if (!completed && !failed) {
            showFeedback(feedback, 'error', 'Select at least one event type.');
            return;
        }

        const events = [];
        if (completed) events.push('job.completed');
        if (failed)    events.push('job.failed');

        createBtn.disabled = true;
        createBtn.textContent = 'Registering…';
        clearFeedback(feedback);

        try {
            const hook = await api('POST', '/api/v1/webhooks', { url, events });

            const revealBox = document.getElementById('newWebhookReveal');
            document.getElementById('newWebhookSecret').textContent = hook.secret;
            revealBox.classList.remove('hidden');

            document.getElementById('copySecretBtn').onclick = () => copyText(hook.secret, 'copySecretBtn');

            form.classList.add('hidden');
            showBtn.classList.remove('hidden');
            document.getElementById('newWebhookUrl').value = '';
            document.getElementById('eventCompleted').checked = true;
            document.getElementById('eventFailed').checked = true;
            clearFeedback(feedback);

            await loadWebhooks();
        } catch (err) {
            showFeedback(feedback, 'error', err.message);
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = 'Register';
        }
    });
}

async function deleteWebhook(id) {
    if (!confirm('Delete this webhook? It will stop receiving event callbacks.')) return;
    try {
        await api('DELETE', `/api/v1/webhooks/${id}`);
        await loadWebhooks();
        document.getElementById('newWebhookReveal').classList.add('hidden');
    } catch (err) {
        alert(`Failed to delete webhook: ${err.message}`);
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupLogout() {
    document.querySelector('[data-logout]')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.auth.logout();
    });
}

function showFeedback(el, type, message) {
    el.classList.remove('hidden', 'text-green-400', 'text-red-400');
    el.classList.add(type === 'success' ? 'text-green-400' : 'text-red-400');
    el.textContent = message;
}

function clearFeedback(el) {
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

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30)  return `${days}d ago`;
    return formatDate(iso);
}

// ── Wallet / INC Credits ──────────────────────────────────────────────────────

function setupWalletSection() {
    const w = window.IndexWallet;

    const navBtn         = document.getElementById('walletBtn');
    const connectBtn     = document.getElementById('connectWalletBtn');
    const disconnectBtn  = document.getElementById('disconnectWalletBtn');
    const disconnectedEl = document.getElementById('walletDisconnected');
    const connectedEl    = document.getElementById('walletConnected');
    const errorEl        = document.getElementById('walletConnectError');
    const addressEl      = document.getElementById('walletAddress');
    const chainBadgeEl   = document.getElementById('walletChainBadge');
    const unsupportedEl  = document.getElementById('unsupportedChain');
    const switchAnvilBtn = document.getElementById('switchAnvilBtn');
    const walBalEl       = document.getElementById('incWalletBalance');
    const credBalEl      = document.getElementById('incCreditBalance');
    const depositAmtEl   = document.getElementById('depositAmount');
    const depositBtn     = document.getElementById('depositBtn');
    const depositFb      = document.getElementById('depositFeedback');
    const withdrawAmtEl  = document.getElementById('withdrawAmount');
    const withdrawBtn    = document.getElementById('withdrawBtn');
    const withdrawFb     = document.getElementById('withdrawFeedback');

    if (!w) return; // wallet.js not loaded

    function showConnected() {
        disconnectedEl.classList.add('hidden');
        connectedEl.classList.remove('hidden');
        errorEl.classList.add('hidden');

        addressEl.textContent  = w.shortAddr(w.address);
        const info = w.chainInfo();
        chainBadgeEl.textContent = info ? info.shortName : `#${w.chain}`;

        if (!w.isChainSupported()) {
            unsupportedEl.classList.remove('hidden');
            walBalEl.textContent = credBalEl.textContent = '—';
        } else {
            unsupportedEl.classList.add('hidden');
            refreshBalances();
        }

        navBtn.textContent = w.shortAddr(w.address);
        navBtn.classList.add('text-cyan-400', 'border-cyan-800');
    }

    function showDisconnected() {
        disconnectedEl.classList.remove('hidden');
        connectedEl.classList.add('hidden');
        navBtn.textContent = 'Connect Wallet';
        navBtn.classList.remove('text-cyan-400', 'border-cyan-800');
    }

    async function refreshBalances() {
        if (!w.isChainSupported()) return;
        walBalEl.textContent = credBalEl.textContent = '…';
        try {
            const b = await w.balances();
            walBalEl.textContent  = b.walletFmt + ' INC';
            credBalEl.textContent = b.creditFmt + ' INC';
        } catch (err) {
            walBalEl.textContent = credBalEl.textContent = 'Error';
            console.error('Balance fetch failed:', err);
        }
    }

    async function doConnect() {
        if (typeof ethers === 'undefined') {
            errorEl.textContent = 'ethers.js failed to load — please refresh the page.';
            errorEl.classList.remove('hidden');
            return;
        }
        errorEl.classList.add('hidden');
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting…';
        navBtn.disabled = true;
        try {
            await w.connect();
            showConnected();
        } catch (err) {
            console.error('[wallet] connect failed:', err);
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
        } finally {
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect Wallet';
            navBtn.disabled = false;
        }
    }

    connectBtn.addEventListener('click', doConnect);
    navBtn.addEventListener('click', () => {
        if (w.address) return; // already connected, clicking does nothing for now
        doConnect();
    });

    disconnectBtn.addEventListener('click', () => {
        w.disconnect();
        showDisconnected();
    });

    w.on('connect', () => showConnected());
    w.on('chainChanged', () => showConnected());
    w.on('disconnect', () => showDisconnected());

    switchAnvilBtn.addEventListener('click', async () => {
        switchAnvilBtn.disabled = true;
        switchAnvilBtn.textContent = 'Switching…';
        try {
            await w.switchToAnvil();
        } catch (err) {
            console.error('[wallet] chain switch failed:', err);
        } finally {
            switchAnvilBtn.disabled = false;
            switchAnvilBtn.textContent = 'Switch to Local Anvil';
        }
    });

    depositBtn.addEventListener('click', async () => {
        const amount = parseFloat(depositAmtEl.value);
        if (!amount || amount <= 0) {
            showFeedback(depositFb, 'error', 'Enter a valid amount.');
            return;
        }
        depositBtn.disabled = true;
        depositBtn.textContent = 'Confirm in wallet…';
        clearFeedback(depositFb);
        try {
            await w.purchaseCredits(amount);
            await gql('mutation { syncCreditBalance }');
            showFeedback(depositFb, 'success', `${amount} INC deposited as credits.`);
            depositAmtEl.value = '';
            await refreshBalances();
        } catch (err) {
            showFeedback(depositFb, 'error', err.reason ?? err.message);
        } finally {
            depositBtn.disabled = false;
            depositBtn.textContent = 'Deposit';
        }
    });

    withdrawBtn.addEventListener('click', async () => {
        const amount = parseFloat(withdrawAmtEl.value);
        if (!amount || amount <= 0) {
            showFeedback(withdrawFb, 'error', 'Enter a valid amount.');
            return;
        }
        withdrawBtn.disabled = true;
        withdrawBtn.textContent = 'Confirm in wallet…';
        clearFeedback(withdrawFb);
        try {
            await w.withdrawCredits(amount);
            await gql('mutation { syncCreditBalance }');
            showFeedback(withdrawFb, 'success', `${amount} INC withdrawn to wallet.`);
            withdrawAmtEl.value = '';
            await refreshBalances();
        } catch (err) {
            showFeedback(withdrawFb, 'error', err.reason ?? err.message);
        } finally {
            withdrawBtn.disabled = false;
            withdrawBtn.textContent = 'Withdraw';
        }
    });
}

async function copyText(text, btnId) {
    const btn = document.getElementById(btnId);
    try {
        await navigator.clipboard.writeText(text);
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = orig; }, 2000);
        }
    } catch {
        // Clipboard API not available (non-HTTPS dev).
        if (btn) btn.textContent = 'Select manually';
    }
}
