/**
 * EmailNotificationService - Handles sending emails via EmailJS
 */
class EmailNotificationService {
    constructor() {
        this.publicKey = "YOUR_EMAILJS_PUBLIC_KEY"; // Placeholder
        this.serviceId = "YOUR_SERVICE_ID";
        this.templateId = "YOUR_TEMPLATE_ID";

        if (typeof emailjs !== 'undefined' && this.publicKey !== "YOUR_EMAILJS_PUBLIC_KEY") {
            emailjs.init(this.publicKey);
        }
    }

    async sendLoginNotification(email) {
        console.log(`Attempting to send login notification to ${email}...`);

        if (typeof emailjs === 'undefined' || this.publicKey === "YOUR_EMAILJS_PUBLIC_KEY") {
            console.warn("EmailJS not configured. Notification skipped.");
            // UI Feedback for demo
            this.showFakeNotification(email);
            return;
        }

        try {
            await emailjs.send(this.serviceId, this.templateId, {
                to_email: email,
                login_time: new Date().toLocaleString(),
                app_name: "AlphaTrack"
            });
            console.log("Email notification sent successfully!");
        } catch (err) {
            console.error("Failed to send email notification:", err);
        }
    }

    showFakeNotification(email) {
        // Just for demo purposes since we don't have real keys yet
        const toast = document.createElement('div');
        toast.className = 'glass-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <i data-lucide="mail"></i>
                <span>Security Alert: Login notification sent to ${email} (Simulated)</span>
            </div>
        `;
        document.body.appendChild(toast);
        lucide.createIcons();
        setTimeout(() => toast.remove(), 5000);
    }
}

/**
 * PushNotificationService - Handles browser push notifications
 */
class PushNotificationService {
    constructor() {
        this.hasPermission = false;
        this.init();
    }

    async init() {
        if (!("Notification" in window)) {
            console.warn("This browser does not support desktop notifications");
            return;
        }

        if (Notification.permission === "granted") {
            this.hasPermission = true;
        } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            this.hasPermission = (permission === "granted");
        }
    }

    send(title, body) {
        if (this.hasPermission) {
            new Notification(title, {
                body: body,
                icon: 'logo.png'
            });
        } else {
            console.log("Push notification permission not granted.");
        }
    }
}

/**
 * MockAuthService - Now integrated with Firebase for real cloud connection
 */
class MockAuthService {
    constructor() {
        this.emailService = new EmailNotificationService();
        this.pushService = new PushNotificationService();
        // Initialize Firebase services
        if (typeof firebase !== 'undefined') {
            // Already initialized in firebase-config.js
            this.auth = firebase.auth();
            this.db = firebase.firestore();
        }

        this.users = JSON.parse(localStorage.getItem('alpha_users')) || [];
    }

    // Simulate Network Latency (for local fallbacks)
    async delay(ms = 800) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Hash simulation
    hashPassword(password) {
        return btoa(password.split('').reverse().join(''));
    }

    // Unified session storage helper
    saveSession(user, token) {
        localStorage.setItem('alpha_auth', 'true');
        localStorage.setItem('alpha_auth_token', token);
        localStorage.setItem('alpha_user', user.email);
        localStorage.setItem('alpha_uid', user.uid);
    }

    async register(name, email, password) {
        // Create user in Firebase Auth
        if (this.auth) {
            try {
                const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
                await userCredential.user.updateProfile({ displayName: name });

                // Store additional data in Firestore
                await this.db.collection('users').doc(userCredential.user.uid).set({
                    name,
                    email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                const token = await userCredential.user.getIdToken();
                this.saveSession(userCredential.user, token);
                return { success: true };
            } catch (err) {
                console.error('Registration error:', err);
                if (err.code === 'auth/email-already-in-use') {
                    throw new Error('This email is already registered. Please try logging in.');
                } else if (err.code === 'auth/weak-password') {
                    throw new Error('The password is too weak. Please use at least 6 characters.');
                } else if (err.code === 'auth/invalid-email') {
                    throw new Error('The email address is not valid.');
                }
                throw err;
            }
        }

        // Local Fallback
        await this.delay();
        if (this.users.find(u => u.email === email)) throw new Error('User already exists');
        const newUser = { id: Date.now(), name, email, password: this.hashPassword(password) };
        this.users.push(newUser);
        localStorage.setItem('alpha_users', JSON.stringify(this.users));
        this.saveSession({ email, uid: `mock_${newUser.id}` }, `mock_token_${newUser.id}`);
        return { success: true };
    }

    async login(email, password) {
        if (this.auth) {
            try {
                const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
                const token = await userCredential.user.getIdToken();
                this.saveSession(userCredential.user, token);

                // Send Notifications
                await this.emailService.sendLoginNotification(email);
                this.pushService.send("Login Successful", `Welcome back, ${email}!`);

                return { success: true };
            } catch (err) {
                if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                    throw new Error('Invalid email or password.');
                }
                throw err;
            }
        }

        // Local Fallback
        await this.delay();
        const user = this.users.find(u => u.email === email);
        if (!user || user.password !== this.hashPassword(password)) throw new Error('Invalid email or password');

        this.saveSession({ email, uid: `mock_${user.id}` }, `mock_token_${user.id}`);
        return { success: true };
    }

    async socialLogin(provider) {
        if (!this.auth) {
            alert("Firebase not configured. Using mock login.");
            this.saveSession({ email: `${provider}_user@example.com`, uid: `mock_social_${Date.now()}` }, `mock_social_token_${Date.now()}`);
            return { success: true };
        }

        let authProvider;
        if (provider === 'google') {
            authProvider = new firebase.auth.GoogleAuthProvider();
        } else if (provider === 'facebook') {
            authProvider = new firebase.auth.FacebookAuthProvider();
        }

        try {
            const result = await this.auth.signInWithPopup(authProvider);
            const token = await result.user.getIdToken();
            this.saveSession(result.user, token);
            return { success: true };
        } catch (err) {
            console.error('Social login error:', err);
            let errorMessage = err.message;
            if (err.code === 'auth/operation-not-allowed') {
                errorMessage = `Social login for ${provider} is not enabled in the Firebase Console.`;
            } else if (err.code === 'auth/unauthorized-domain') {
                errorMessage = 'This domain is not authorized for Firebase Authentication. Please add it to "Authorized domains" in the Firebase Console.';
            } else if (err.code === 'auth/invalid-credential') {
                errorMessage = 'Firebase rejected the credential. Ensure the Google/Facebook provider is correctly configured.';
            } else if (err.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Login canceled. Please try again.';
            }
            throw new Error(errorMessage);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const authService = new MockAuthService();

    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const subtitle = document.getElementById('auth-subtitle');

    // Switch to Login
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        subtitle.innerText = 'Sign in to continue your trading journey';
    });

    // Switch to Signup
    signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        subtitle.innerText = 'Create your account to start tracking trades';
    });

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        try {
            submitBtn.innerText = 'Signing in...';
            submitBtn.disabled = true;
            await authService.login(email, password);
            window.location.href = 'index.html';
        } catch (err) {
            console.error('Login error:', err);
            if (err.code === 'auth/invalid-credential') {
                authService.pushService.send("Login Failed", "Incorrect email or password.");
                alert('Account not found or incorrect password. Switching to Sign Up if you need a new account.');
                // Automatically switch to Sign Up tab
                document.getElementById('signup-tab').click();
            } else {
                authService.pushService.send("Login Error", err.message);
                alert(`Login failed: ${err.message}`);
            }
        } finally {
            submitBtn.innerText = 'Login';
            submitBtn.disabled = false;
        }
    });

    // Handle Signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const submitBtn = signupForm.querySelector('button[type="submit"]');

        try {
            submitBtn.innerText = 'Creating account...';
            submitBtn.disabled = true;
            await authService.register(name, email, password);
            // Redirection is usually handled by authService.register -> login, 
            // but we'll ensure it here for consistency.
            window.location.href = 'index.html';
        } catch (err) {
            alert(err.message);
        } finally {
            submitBtn.innerText = 'Create Account';
            submitBtn.disabled = false;
        }
    });

    // Social Login
    const handleSocial = async (provider) => {
        // Check if running via file protocol
        if (window.location.protocol === 'file:') {
            const protocolModal = document.getElementById('protocol-modal');
            protocolModal.classList.add('active');

            // Handle Demo Button inside the modal
            document.getElementById('use-demo-btn').onclick = () => {
                localStorage.setItem('alpha_auth', 'true');
                localStorage.setItem('alpha_auth_token', `demo_${Date.now()}`);
                localStorage.setItem('alpha_user', 'demo_trader@example.com');
                localStorage.setItem('alpha_uid', 'demo_uid_123');
                window.location.href = 'index.html';
            };
            return;
        }

        try {
            await authService.socialLogin(provider);
            window.location.href = 'index.html';
        } catch (err) {
            console.error('Social login error:', err);
            alert(`Social login failed: ${err.message}`);
        }
    };

    document.getElementById('google-login').addEventListener('click', () => handleSocial('google'));
    document.getElementById('facebook-login').addEventListener('click', () => handleSocial('facebook'));
});

