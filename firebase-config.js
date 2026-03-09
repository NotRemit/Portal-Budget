import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// REPLACEMENT REQUIRED: User must provide their own Firebase Config
// I will provide instructions on how to get this.
const firebaseConfig = {
  apiKey: "AIzaSyDLtRqxLrL4hqgJnN5c0DAd655cGinGUSE",
  authDomain: "dear-future-me-51642.firebaseapp.com",
  databaseURL: "https://dear-future-me-51642-default-rtdb.firebaseio.com",
  projectId: "dear-future-me-51642",
  storageBucket: "dear-future-me-51642.firebasestorage.app",
  messagingSenderId: "107188224919",
  appId: "1:107188224919:web:cf22a1a866f9ba9ffabad2"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const auth = getAuth(app);
