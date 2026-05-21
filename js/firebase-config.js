// ============================================================
//  FIREBASE CONFIGURATION
//  Replace the values below with your Firebase project config.
//
//  How to get your config:
//  1. Go to https://console.firebase.google.com
//  2. Create or select your project
//  3. Click the gear icon → Project settings → General
//  4. Scroll to "Your apps" → click your web app (or add one)
//  5. Copy the firebaseConfig object shown there
//
//  In Firebase Console, also enable:
//  - Authentication → Sign-in method → Email/Password ✅
//  - Firestore Database → Create database (start in test mode for now) ✅
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyAJ7D6SzTdt7l_tE2PHaw7cNxRCyDES8C8",
  authDomain: "album-copa-d6da8.firebaseapp.com",
  projectId: "album-copa-d6da8",
  storageBucket: "album-copa-d6da8.firebasestorage.app",
  messagingSenderId: "727994022124",
  appId: "1:727994022124:web:4601663b0f1c140d5c4dc9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Expose globally
window.db   = firebase.firestore();
window.auth = firebase.auth();

// Detect unconfigured state
window.FIREBASE_CONFIGURED = firebaseConfig.apiKey !== "YOUR_API_KEY";
