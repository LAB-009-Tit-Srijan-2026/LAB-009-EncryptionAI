document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('id');

    if (!tripId) {
        showToast('No trip ID provided.', 'error');
        window.location.href = 'dashboard.html';
        return;
    }

    // Set nav links
    document.getElementById('nav-itinerary').href = `itinerary.html?id=${tripId}`;
    document.getElementById('nav-expenses').href = `expenses.html?id=${tripId}`;
    document.getElementById('nav-chat').href = `chat.html?id=${tripId}`;

    // Initialize real-time sync
    socketManager.init(tripId);

    window.addEventListener('sync-data', async (e) => {
        if (e.detail.type === 'expense') {
            await loadExpenses(tripId);
        }
    });

    await loadExpenses(tripId);

    // Receipt Scan Handler
    const receiptUpload = document.getElementById('receipt-upload');
    receiptUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const btn = document.getElementById('btn-scan');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<div class="spinner" style="width:16px; height:16px; border-width: 2px;"></div> Scanning...';
        btn.disabled = true;

        try {
            const result = await ApiService.scanReceipt(file);
            showToast(`Scanned: ₹${result.amount} at ${result.merchant}`);
            
            // Auto-fill and show modal
            document.getElementById('exp-desc').value = `${result.merchant} (${result.category})`;
            document.getElementById('exp-amount').value = result.amount;
            document.getElementById('add-expense-modal').style.display = 'flex';
        } catch (error) {
            showToast('OCR Failed: ' + error.message, 'error');
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    });

    const form = document.getElementById('expense-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = form.querySelector('button[type="submit"]');
        btn.innerHTML = '<div class="spinner" style="width:16px; height:16px; border-width: 2px;"></div>';
        btn.disabled = true;

        const data = {
            trip_id: parseInt(tripId),
            description: document.getElementById('exp-desc').value,
            amount: parseFloat(document.getElementById('exp-amount').value)
        };

        try {
            await ApiService.addExpense(data);
            showToast('Expense added!');
            socketManager.notifyUpdate('expense');
            document.getElementById('add-expense-modal').style.display = 'none';
            form.reset();
            await loadExpenses(tripId);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            btn.innerHTML = 'Save Expense';
            btn.disabled = false;
        }
    });
});

async function loadExpenses(tripId) {
    try {
        const splitData = await ApiService.getTripSplit(tripId);
        
        document.getElementById('total-spent').textContent = `₹${splitData.total_amount.toLocaleString()}`;
        document.getElementById('per-person').textContent = `₹${splitData.per_person_share.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        // Render member balances
        const splitSummary = document.getElementById('split-summary');
        if (splitData.member_balances) {
            splitSummary.innerHTML = splitData.member_balances.map(member => `
                <div class="glass-card" style="padding: 1rem; border-left: 4px solid ${member.balance >= 0 ? 'var(--success)' : 'var(--danger)'}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600;">${member.name}</span>
                        <span class="text-secondary" style="font-size: 0.8rem;">Paid: ₹${member.amount_paid}</span>
                    </div>
                    <div class="mt-1 ${member.balance >= 0 ? 'text-success' : 'text-danger'}" style="font-weight: 700; font-size: 1.1rem;">
                        ${member.balance >= 0 ? 'Owed ₹' + member.balance : 'Owes ₹' + Math.abs(member.balance)}
                    </div>
                </div>
            `).join('');
        }

        // Render simplified settlements
        const settlementContainer = document.getElementById('settlement-container');
        const settlementsList = document.getElementById('settlements-list');
        if (splitData.simplified_debts && splitData.simplified_debts.length > 0) {
            settlementContainer.style.display = 'block';
            settlementsList.innerHTML = splitData.simplified_debts.map(s => `
                <div class="glass-card" style="padding: 1rem; display: flex; justify-content: space-between; align-items: center; background: rgba(16, 185, 129, 0.05);">
                    <div>
                        <span class="text-danger" style="font-weight: 700;">${s.from}</span>
                        <i class="fas fa-long-arrow-alt-right mx-1 text-secondary"></i>
                        <span class="text-success" style="font-weight: 700;">${s.to}</span>
                        <div class="text-primary" style="font-size: 1.2rem; font-weight: 800; margin-top: 0.2rem;">₹${s.amount}</div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="payUPI('${s.to}', ${s.amount})">
                        <i class="fas fa-qrcode"></i> Settle UPI
                    </button>
                </div>
            `).join('');
        } else {
            settlementContainer.style.display = 'none';
        }

        const list = document.getElementById('expenses-list');
        if (splitData.expenses.length === 0) {
            list.innerHTML = '<p class="text-secondary">No expenses recorded yet.</p>';
            return;
        }

        list.innerHTML = splitData.expenses.map(exp => {
            const payer = splitData.member_balances.find(m => m.user_id === exp.payer_id);
            return `
                <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="background: rgba(255,255,255,0.1); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-receipt text-secondary"></i>
                        </div>
                        <div>
                            <h4 style="margin: 0;">${exp.description}</h4>
                            <small class="text-secondary">Paid by ${payer ? payer.name : 'Unknown'}</small>
                        </div>
                    </div>
                    <div class="text-danger" style="font-weight: 600;">
                        - ₹${exp.amount.toLocaleString()}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        showToast('Failed to load expenses: ' + error.message, 'error');
    }
}

function payUPI(name, amount) {
    const upiId = `${name.toLowerCase().replace(' ', '')}@okaxis`;
    const upiUrl = `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR`;
    
    // Show a mock QR Code
    const modalHtml = `
        <div id="upi-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
            <div class="glass-card text-center" style="max-width: 350px;">
                <h2 class="mb-1">Settle with ${name}</h2>
                <div style="background: white; padding: 1rem; border-radius: 1rem; margin: 1.5rem 0;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}" alt="UPI QR">
                </div>
                <div class="text-primary" style="font-size: 1.5rem; font-weight: 800;">₹${amount}</div>
                <p class="text-secondary small mt-1">Scan using GPay, PhonePe, or Paytm</p>
                <button class="btn btn-outline mt-2 w-full" onclick="document.getElementById('upi-modal').remove()">Done</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
