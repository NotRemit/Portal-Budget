# 💸 Portal Budget

A sleek, intuitive, and modern web application to track personal finances, daily spending patterns, and shared expenses. Built using pure HTML, CSS, JavaScript, and powered by Firebase Firestore for real-time, cross-device synchronization.

## ✨ Key Features

*   **📊 Insightful Dashboards:** Visual "Fuel Meter" for your overall monthly budget and a dynamic Pie Chart breakdown of where your money goes.
*   **🐷 Daily Savings Engine:** Employs a unique ₹50/day spending limit. Automatically rolls over unspent money into a "Daily Savings" badge the following day to gameify saving money!
*   **🤝 Shared Ledger ("Who Owes Me"):** A dedicated tab to track money you've lent to friends. One-click "Settle Up" instantly wipes the debt and logs the incoming money to your main budget as income.
*   **🛜 Offline-First (PWA):** Fully installable as a Progressive Web App (PWA) on iOS and Android. Allows you to add expenses completely offline in airplane mode—syncing them securely to the cloud the moment you regain connection.
*   **🕰️ Automated Archiving:** Automatically detects when a new month begins and safely moves all of last month's transactions into a historical archive to give you a clean slate.
*   **🎨 Glassmorphism UI:** A gorgeous, responsive, dark-themed UI that feels like a native mobile application.

## 🛠️ Technology Stack

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript
*   **Backend / Database:** Firebase Cloud Firestore (NoSQL)
*   **Charting:** Chart.js
*   **Icons:** Lucide Icons
*   **Architecture:** Progressive Web App (PWA) with Service Workers & Web Manifest

## 🚀 Getting Started

To run this project locally, you will need to configure your own Firebase project.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/NotRemit/Portal-Budget.git
   cd Portal-Budget
