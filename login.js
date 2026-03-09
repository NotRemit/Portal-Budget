import { auth } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const UI = {
    form: document.getElementById('login-form'),
    email: document.getElementById('email'),
    password: document.getElementById('password'),
    actionBtn: document.getElementById('action-btn'),
    toggleMode: document.getElementById('toggle-mode'),
    formTitle: document.getElementById('form-title'),
    formSubtitle: document.getElementById('form-subtitle'),
    errorMsg: document.getElementById('error-msg')
};

let isLoginMode = true;

// If already logged in, redirect to index
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.replace("index.html");
    }
});

UI.toggleMode.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        UI.formTitle.textContent = "Welcome Back";
        UI.formSubtitle.textContent = "Enter your details to access your budget.";
        UI.actionBtn.textContent = "Log In";
        UI.toggleMode.innerHTML = `Don't have an account? <span>Sign Up</span>`;
    } else {
        UI.formTitle.textContent = "Create Account";
        UI.formSubtitle.textContent = "Sign up to track your budget securely.";
        UI.actionBtn.textContent = "Sign Up";
        UI.toggleMode.innerHTML = `Already have an account? <span>Log In</span>`;
    }
    UI.errorMsg.style.display = 'none';
});

UI.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = UI.email.value;
    const password = UI.password.value;

    UI.actionBtn.disabled = true;
    UI.actionBtn.textContent = "Please wait...";
    UI.errorMsg.style.display = 'none';

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
        // Redirect drops in automatically via onAuthStateChanged
    } catch (err) {
        UI.errorMsg.textContent = err.message.replace("Firebase: ", "");
        UI.errorMsg.style.display = 'block';
        UI.actionBtn.disabled = false;
        UI.actionBtn.textContent = isLoginMode ? "Log In" : "Sign Up";
    }
});
