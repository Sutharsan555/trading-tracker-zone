// Firebase Configuration provided by user
const firebaseConfig = {
    apiKey: "AIzaSyAfkbZtkjirqTr3DQf6BQX9two_A6II5cM",
    authDomain: "project-951625271372.firebaseapp.com",
    projectId: "project-951625271372",
    storageBucket: "project-951625271372.firebasestorage.app",
    messagingSenderId: "951625271372",
    appId: "1:951625271372:web:219d0dbc412576b9d78ce9",
    measurementId: "G-N59EWLZJG5"
};

// Initialize Firebase once globally
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    if (!firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase initialized successfully");
        } catch (err) {
            console.error("Firebase initialization failed:", err);
        }
    }

    // Initialize services if app exists
    if (firebase.apps.length) {
        try {
            firebase.performance();
            console.log("Firebase Performance Monitoring initialized");
            firebase.analytics();
            console.log("Firebase Analytics initialized");
        } catch (err) {
            console.warn("Non-critical Firebase services failed to initialize:", err);
        }
    }
}

