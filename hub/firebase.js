// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBQU-ZII5ndeK7hbPtxiyq5-WnGw-jVZhc",
  authDomain: "needawitness-hub.firebaseapp.com",
  projectId: "needawitness-hub",
  storageBucket: "needawitness-hub.firebasestorage.app",
  messagingSenderId: "132865136242",
  appId: "1:132865136242:web:8f143b64f0be14727d14eb"
};

// --- Initialize Firebase ---
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
