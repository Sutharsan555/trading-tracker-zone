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

// Initialize Performance Monitoring globally
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    // Initialize Performance Monitoring
    const perf = firebase.performance();
    console.log("Firebase Performance Monitoring initialized");

    // Initialize Analytics
    const analytics = firebase.analytics();
    console.log("Firebase Analytics initialized");
}

