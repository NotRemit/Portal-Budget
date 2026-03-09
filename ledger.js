import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc,
    serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const UI = {
    totalOwed: document.getElementById('total-owed'),
    ledgerList: document.getElementById('ledger-list'),
    form: document.getElementById('ledger-form'),
    modal: document.getElementById('ledger-modal'),
    addBtn: document.getElementById('add-ledger-btn'),
    closeBtn: document.querySelector('.close-modal')
};

let debts = [];
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        init();
    } else {
        window.location.replace('login.html');
    }
});

function init() {
    setupEventListeners();
    listenToData();
}

function setupEventListeners() {
    UI.addBtn.addEventListener('click', () => {
        UI.form.reset();
        UI.modal.classList.add('active');
    });

    UI.closeBtn.addEventListener('click', () => UI.modal.classList.remove('active'));

    UI.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const person = document.getElementById('person').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const description = document.getElementById('description').value;

        const newDebt = {
            person,
            amount,
            description,
            date: new Date().toLocaleDateString('en-IN'),
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'users', currentUser.uid, 'ledger'), newDebt);
        UI.form.reset();
        UI.modal.classList.remove('active');
    });
}

function listenToData() {
    try {
        const q = query(collection(db, 'users', currentUser.uid, 'ledger'), orderBy('createdAt', 'desc'));
        onSnapshot(q, (snap) => {
            debts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            updateUI();
        }, (err) => console.error("Ledger listener error:", err));
    } catch (err) {
        console.error("Setup listeners failed:", err);
    }
}

function updateUI() {
    const total = debts.reduce((acc, t) => acc + t.amount, 0);
    UI.totalOwed.textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    renderList();
}

function renderList() {
    if (debts.length === 0) {
        UI.ledgerList.innerHTML = `<div class="empty-state"><i data-lucide="check-circle"></i><p>Everyone is settled up!</p></div>`;
        lucide.createIcons();
        return;
    }

    UI.ledgerList.innerHTML = debts.map(d => `
        <div class="transaction-item animate-slide-up">
            <div class="transaction-info">
                <div class="category-icon" style="background: rgba(245, 158, 11, 0.2);"><i data-lucide="user" style="color: #f59e0b"></i></div>
                <div><h4>${d.person} owes you for ${d.description}</h4><p>${d.date}</p></div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                <div class="transaction-amount" style="color: #f59e0b">
                    ₹${Math.abs(d.amount).toFixed(2)}
                </div>
                <button onclick="settleDebt('${d.id}')" class="submit-btn" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 8px; background: #10b981;">Settle Up</button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

window.settleDebt = async (id) => {
    const debt = debts.find(d => d.id === id);
    if (!debt) return;

    if (confirm(`Would you like to mark ₹${debt.amount} from ${debt.person} as settled and add it to your income?`)) {
        // Add to main transactions as income
        const txData = {
            amount: debt.amount,
            description: `Repayment from ${debt.person} (${debt.description})`,
            type: 'income',
            category: 'other',
            source: 'account',
            date: new Date().toLocaleDateString('en-IN'),
            createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), txData);

        // Remove from ledger
        await deleteDoc(doc(db, 'users', currentUser.uid, 'ledger', id));
    }
};

// window.addEventListener('load', init); handled by auth state
