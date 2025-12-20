/**
 * MockAuthService - Now integrated with Firebase for real cloud connection
 */
class MockAuthService {
    constructor() {
        // Initialize Firebase
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
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

    async register(name, email, password) {
        // Create user in Firebase Auth
        if (this.auth) {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: name });

            // Store additional data in Firestore
            await this.db.collection('users').doc(userCredential.user.uid).set({
                name,
                email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return this.login(email, password);
        }

        // Local Fallback
        await this.delay();
        if (this.users.find(u => u.email === email)) throw new Error('User already exists');
        this.users.push({ id: Date.now(), name, email, password: this.hashPassword(password) });
        localStorage.setItem('alpha_users', JSON.stringify(this.users));
        return this.login(email, password);
    }

    async login(email, password) {
        if (this.auth) {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const token = await userCredential.user.getIdToken();

            localStorage.setItem('alpha_auth', 'true');
            localStorage.setItem('alpha_auth_token', token);
            localStorage.setItem('alpha_user', email);
            localStorage.setItem('alpha_uid', userCredential.user.uid);

            return { success: true };
        }

        // Local Fallback
        await this.delay();
        const user = this.users.find(u => u.email === email);
        if (!user || user.password !== this.hashPassword(password)) throw new Error('Invalid email or password');

        localStorage.setItem('alpha_auth', 'true');
        localStorage.setItem('alpha_auth_token', `mock_${Date.now()}`);
        localStorage.setItem('alpha_user', email);
        return { success: true };
    }

    async socialLogin(provider) {
        if (!this.auth) {
            alert("Firebase not configured. Using mock login.");
            localStorage.setItem('alpha_auth', 'true');
            localStorage.setItem('alpha_auth_token', `mock_social_${Date.now()}`);
            localStorage.setItem('alpha_user', `${provider}_user@example.com`);
            return { success: true };
        }

        let authProvider;
        if (provider === 'google') {
            authProvider = new firebase.auth.GoogleAuthProvider();
        } else if (provider === 'facebook') {
            authProvider = new firebase.auth.FacebookAuthProvider();
        }

        const result = await this.auth.signInWithPopup(authProvider);
        const token = await result.user.getIdToken();

        localStorage.setItem('alpha_auth', 'true');
        localStorage.setItem('alpha_auth_token', token);
        localStorage.setItem('alpha_user', result.user.email);
        localStorage.setItem('alpha_uid', result.user.uid);

        return { success: true };
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
            alert(err.message);
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
            alert('Social Login (Google/Facebook) typically does not work when opening the HTML file directly (file://). Please use a local server or host your files on Firebase Hosting/GitHub Pages.');
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

