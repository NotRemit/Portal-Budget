/**
 * app.js - Simplified Budget Flow without Auth
 */
import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc,
    serverTimestamp, setDoc, getDoc, updateDoc, getDocs, writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const UI = {
    balance: document.querySelector('.total-balance'),
    income: document.getElementById('total-income'),
    expense: document.getElementById('total-expense'),
    transactionList: document.getElementById('transaction-list'),
    form: document.getElementById('transaction-form'),
    modal: document.getElementById('transaction-modal'),
    addExpenseBtn: document.getElementById('add-expense-btn'),
    addIncomeBtn: document.getElementById('add-income-btn'),
    modalTitle: document.getElementById('modal-title'),
    closeBtn: document.querySelector('.close-modal'),
    settingsModal: document.getElementById('settings-modal'),
    openSettingsBtn: document.getElementById('open-settings'),
    closeSettingsBtn: document.querySelector('.close-settings'),
    saveBudgetBtn: document.getElementById('save-budget'),
    budgetInput: document.getElementById('monthly-budget'),
    displayLimit: document.getElementById('display-limit'),
    spentAmount: document.getElementById('spent-amount'),
    budgetPercent: document.getElementById('budget-percentage'),
    monthDisplay: document.getElementById('current-month-display'),
    initialBalanceInput: document.getElementById('initial-balance'),
    saveInitialBalanceBtn: document.getElementById('save-initial-balance'),
    historyModal: document.getElementById('history-modal'),
    closeHistoryBtn: document.querySelector('.close-history'),
    viewHistoryBtn: document.getElementById('view-history'),
    historyList: document.getElementById('history-list'),
    deleteTxBtn: document.getElementById('delete-transaction-btn'),
    sourceGroup: document.getElementById('source-group'),
    savingsBalanceDisplay: document.getElementById('savings-balance')
};

let transactions = [];
let chart = null;
let catChart = null;
let monthlyBudget = 0;
let initialBalance = 0;
let savingsBalance = 0;
let dailySpent = 0;
let editTxId = null;
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        init();
    } else {
        window.location.replace('login.html');
    }
});

// Initialize
function init() {
    setupEventListeners();
    initGauge();
    initCategoryChart();
    checkMonthReset();
    checkDayReset();
    listenToData();
}

const EXPENSE_CATEGORIES = [
    { value: 'food', label: 'Food & Drinks' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'transport', label: 'Transportation' },
    { value: 'bills', label: 'Bills & Utilities' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'other', label: 'Other' }
];

const INCOME_CATEGORIES = [
    { value: 'scholarship', label: 'Scholarship' },
    { value: 'freelancing', label: 'Freelancing' },
    { value: 'stipend', label: 'Stipend' },
    { value: 'salary', label: 'Salary' },
    { value: 'other', label: 'Other' }
];

function populateCategories(type) {
    const categorySelect = document.getElementById('category');
    const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    categorySelect.innerHTML = categories.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
}

function setupEventListeners() {
    UI.addExpenseBtn.addEventListener('click', () => {
        editTxId = null;
        UI.form.reset();
        document.getElementById('type').value = 'expense';
        UI.modalTitle.textContent = 'Add Expense';
        populateCategories('expense');
        if (UI.sourceGroup) UI.sourceGroup.style.display = 'block';
        if (UI.deleteTxBtn) UI.deleteTxBtn.style.display = 'none';
        UI.modal.classList.add('active');
    });
    UI.addIncomeBtn.addEventListener('click', () => {
        editTxId = null;
        UI.form.reset();
        document.getElementById('type').value = 'income';
        UI.modalTitle.textContent = 'Add Income';
        populateCategories('income');
        if (UI.sourceGroup) UI.sourceGroup.style.display = 'none';
        if (UI.deleteTxBtn) UI.deleteTxBtn.style.display = 'none';
        UI.modal.classList.add('active');
    });
    UI.closeBtn.addEventListener('click', () => UI.modal.classList.remove('active'));
    UI.openSettingsBtn.addEventListener('click', () => UI.settingsModal.classList.add('active'));
    UI.closeSettingsBtn.addEventListener('click', () => UI.settingsModal.classList.remove('active'));

    UI.viewHistoryBtn.addEventListener('click', async () => {
        UI.historyModal.classList.add('active');
        await loadHistory();
    });
    if (UI.closeHistoryBtn) UI.closeHistoryBtn.addEventListener('click', () => UI.historyModal.classList.remove('active'));

    UI.deleteTxBtn.addEventListener('click', async () => {
        if (editTxId && confirm("Delete this transaction?")) {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', editTxId));
            UI.modal.classList.remove('active');
        }
    });

    UI.saveBudgetBtn.addEventListener('click', async () => {
        const val = parseFloat(UI.budgetInput.value);
        if (val >= 0) {
            await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'budget'), { amount: val });
            UI.settingsModal.classList.remove('active');
        }
    });

    UI.saveInitialBalanceBtn.addEventListener('click', async () => {
        const val = parseFloat(UI.initialBalanceInput.value);
        if (!isNaN(val)) {
            await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'initialBalance'), { amount: val });
            UI.settingsModal.classList.remove('active');
        }
    });

    UI.form.addEventListener('submit', handleAddTransaction);
}

async function checkMonthReset() {
    try {
        const now = new Date();
        const currentMonthId = `${now.getFullYear()}-${now.getMonth() + 1}`;
        UI.monthDisplay.textContent = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

        const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'lastActiveMonth');
        const snap = await getDoc(settingsRef);

        if (!snap.exists() || snap.data().monthId !== currentMonthId) {
            await performMonthReset(currentMonthId);
        }
    } catch (err) {
        console.error("Month reset check failed:", err);
    }
}

async function performMonthReset(newMonthId) {
    const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
    const snap = await getDocs(transactionsRef);

    if (snap.size > 0) {
        let netChange = 0;
        const batch = writeBatch(db);
        snap.forEach((d) => {
            const data = d.data();
            netChange += data.amount || 0;
            batch.set(doc(db, 'users', currentUser.uid, 'history', d.id), data);
            batch.delete(d.ref);
        });
        await batch.commit();

        const initialBalanceRef = doc(db, 'users', currentUser.uid, 'settings', 'initialBalance');
        const initialBalanceSnap = await getDoc(initialBalanceRef);
        let currentInitialBalance = 0;
        if (initialBalanceSnap.exists()) {
            currentInitialBalance = initialBalanceSnap.data().amount || 0;
        }
        await setDoc(initialBalanceRef, { amount: currentInitialBalance + netChange });
    }

    await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'lastActiveMonth'), { monthId: newMonthId });
}

async function loadHistory() {
    UI.historyList.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';
    const snap = await getDocs(query(collection(db, 'users', currentUser.uid, 'history'), orderBy('createdAt', 'desc')));

    if (snap.size === 0) {
        UI.historyList.innerHTML = `<div class="empty-state"><i data-lucide="database"></i><p>No past transactions</p></div>`;
        lucide.createIcons();
        return;
    }

    let hHtml = '';
    snap.forEach(d => {
        const t = d.data();
        hHtml += `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="category-icon"><i data-lucide="${getIcon(t.category)}"></i></div>
                    <div><h4>${t.description}</h4><p>${t.category} • ${t.date}</p></div>
                </div>
                <div class="transaction-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}">
                    ${t.type === 'income' ? '+' : '-'}₹${Math.abs(t.amount).toFixed(2)}
                </div>
            </div>
        `;
    });
    UI.historyList.innerHTML = hHtml;
    lucide.createIcons();
}

async function checkDayReset() {
    try {
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA');
        const savingsRef = doc(db, 'users', currentUser.uid, 'settings', 'savings');
        const snap = await getDoc(savingsRef);

        if (!snap.exists()) {
            await setDoc(savingsRef, { lastActiveDay: todayStr, dailySpent: 0, balance: 0 });
            return;
        }

        const data = snap.data();
        const lastDay = data.lastActiveDay || todayStr;
        let dSpent = data.dailySpent || 0;
        let bal = data.balance || 0;

        if (lastDay !== todayStr) {
            const lastDateObj = new Date(lastDay);
            const todayObj = new Date(todayStr);
            const diffDays = Math.ceil(Math.abs(todayObj - lastDateObj) / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                bal += Math.max(0, 50 - dSpent);
                if (diffDays > 1) bal += 50 * (diffDays - 1);
                dSpent = 0;
                await setDoc(savingsRef, { lastActiveDay: todayStr, dailySpent: dSpent, balance: bal });
            }
        }
    } catch (err) {
        console.error("Day reset check failed:", err);
    }
}

function listenToData() {
    try {
        // Listen for Transactions
        const q = query(collection(db, 'users', currentUser.uid, 'transactions'), orderBy('createdAt', 'desc'));
        onSnapshot(q, (snap) => {
            transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            updateUI();
        }, (err) => console.error("Transactions listener error:", err));

        // Listen for Budget
        onSnapshot(doc(db, 'users', currentUser.uid, 'settings', 'budget'), (snap) => {
            monthlyBudget = snap.exists() ? snap.data().amount : 0;
            UI.budgetInput.value = monthlyBudget;
            updateUI();
        }, (err) => console.error("Budget listener error:", err));

        // Listen for Initial Balance
        onSnapshot(doc(db, 'users', currentUser.uid, 'settings', 'initialBalance'), (snap) => {
            initialBalance = snap.exists() ? snap.data().amount : 0;
            UI.initialBalanceInput.value = initialBalance;
            updateUI();
        }, (err) => console.error("Initial balance listener error:", err));

        // Listen for Savings
        onSnapshot(doc(db, 'users', currentUser.uid, 'settings', 'savings'), (snap) => {
            if (snap.exists()) {
                savingsBalance = snap.data().balance || 0;
                dailySpent = snap.data().dailySpent || 0;
            } else {
                savingsBalance = 0;
                dailySpent = 0;
            }
            if (UI.savingsBalanceDisplay) UI.savingsBalanceDisplay.textContent = `₹${savingsBalance.toFixed(2)}`;
        }, (err) => console.error("Savings listener error:", err));
    } catch (err) {
        console.error("Setup listeners failed:", err);
    }
}

async function handleAddTransaction(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const sourceEl = document.getElementById('source');
    const source = sourceEl ? sourceEl.value : 'account';

    const txData = {
        amount: type === 'expense' ? -amount : amount,
        description: document.getElementById('description').value,
        type,
        category: document.getElementById('category').value,
        source: type === 'expense' ? source : 'account'
    };

    if (editTxId) {
        await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', editTxId), txData);
    } else {
        txData.date = new Date().toLocaleDateString('en-IN');
        txData.createdAt = serverTimestamp();

        if (type === 'expense') {
            if (source === 'savings') {
                await updateDoc(doc(db, 'users', currentUser.uid, 'settings', 'savings'), { balance: Math.max(0, savingsBalance - amount) });
            } else {
                await updateDoc(doc(db, 'users', currentUser.uid, 'settings', 'savings'), { dailySpent: dailySpent + amount });
            }
        }
        await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), txData);
    }

    UI.form.reset();
    UI.modal.classList.remove('active');
}

window.openEditModal = (id) => {
    const t = transactions.find(x => x.id === id);
    if (!t) return;
    editTxId = id;

    document.getElementById('amount').value = Math.abs(t.amount);
    document.getElementById('description').value = t.description;
    document.getElementById('type').value = t.type;
    populateCategories(t.type);
    document.getElementById('category').value = t.category;

    if (t.type === 'expense') {
        if (UI.sourceGroup) UI.sourceGroup.style.display = 'block';
        if (document.getElementById('source')) document.getElementById('source').value = t.source || 'account';
    } else {
        if (UI.sourceGroup) UI.sourceGroup.style.display = 'none';
    }

    UI.modalTitle.textContent = t.type === 'expense' ? 'Edit Expense' : 'Edit Income';
    if (UI.deleteTxBtn) UI.deleteTxBtn.style.display = 'block';
    UI.modal.classList.add('active');
};

function updateUI() {
    const expenses = Math.abs(transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0));
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const total = initialBalance + transactions.reduce((acc, t) => acc + t.amount, 0);

    const format = (v) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    UI.balance.textContent = format(total);
    UI.income.textContent = format(income);
    UI.expense.textContent = format(expenses);
    UI.spentAmount.textContent = `₹${Math.round(expenses)}`;
    UI.displayLimit.textContent = `₹${monthlyBudget}`;

    renderList();
    updateGauge(expenses);
    updateCategoryChart();
}

function renderList() {
    if (transactions.length === 0) {
        UI.transactionList.innerHTML = `<div class="empty-state"><i data-lucide="database"></i><p>No transactions yet</p></div>`;
        lucide.createIcons();
        return;
    }

    UI.transactionList.innerHTML = transactions.map(t => `
        <div class="transaction-item animate-slide-up" onclick="openEditModal('${t.id}')">
            <div class="transaction-info">
                <div class="category-icon"><i data-lucide="${getIcon(t.category)}"></i></div>
                <div><h4>${t.description}</h4><p>${t.category} • ${t.date}</p></div>
            </div>
            <div class="transaction-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}">
                ${t.type === 'income' ? '+' : '-'}₹${Math.abs(t.amount).toFixed(2)}
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function getIcon(c) {
    const map = {
        food: 'utensils',
        shopping: 'shopping-bag',
        transport: 'car',
        bills: 'zap',
        entertainment: 'play',
        scholarship: 'graduation-cap',
        freelancing: 'laptop',
        stipend: 'banknote',
        salary: 'wallet'
    };
    return map[c] || 'grid';
}

function initGauge() {
    const ctx = document.getElementById('budgetGauge').getContext('2d');
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#10b981', 'rgba(255,255,255,0.05)'],
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
                borderRadius: 10,
                cutout: '85%'
            }]
        },
        options: {
            aspectRatio: 1.5,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            events: []
        }
    });
}

function updateGauge(spent) {
    const percent = monthlyBudget > 0 ? Math.min((spent / monthlyBudget) * 100, 100) : 0;
    UI.budgetPercent.textContent = `${Math.round(percent)}%`;

    let color = '#10b981'; // Green
    if (percent > 80) color = '#ef4444'; // Red (Danger)
    else if (percent > 50) color = '#f59e0b'; // Yellow (Warning)

    chart.data.datasets[0].data = [percent, 100 - percent];
    chart.data.datasets[0].backgroundColor[0] = color;
    chart.update();
}

function initCategoryChart() {
    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;
    catChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8' } }
            }
        }
    });
}

function updateCategoryChart() {
    if (!catChart) return;
    const catMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        catMap[t.category] = (catMap[t.category] || 0) + Math.abs(t.amount);
    });

    catChart.data.labels = Object.keys(catMap).map(c => EXPENSE_CATEGORIES.find(x => x.value === c)?.label || c);
    catChart.data.datasets[0].data = Object.values(catMap);
    catChart.update();
}

// window.addEventListener('load', init); handled by auth state
