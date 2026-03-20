const SERVER_URL = 'https://webcraft-bw34.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    initGoogleAuth();
    initManualLogin();
});

/**
 * Handles the response from Google's One Tap login.
 * @param {object} response - The credential response from Google.
 */
function handleCredentialResponse(response) {
    const token = response.credential;
    const authError = document.getElementById('loginError');

    fetch(`${SERVER_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
    })
    .then(res => res.json())
    .then(result => {
        if (result.user && result.redirectTo) {
            sessionStorage.setItem('currentUser', JSON.stringify(result.user));
            window.location.href = result.redirectTo;
        } else {
            authError.textContent = result.message || 'فشل تسجيل الدخول باستخدام جوجل.';
            authError.style.display = 'block';
        }
    })
    .catch((err) => {
        console.error('Google Auth Fetch Error:', err);
        authError.textContent = 'خطأ في الاتصال بالخادم.';
        authError.style.display = 'block';
    });
}

/**
 * Initializes the Google Sign-In button.
 */
function initGoogleAuth() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "377747466694-ov9o47r36odfd7j0mn4di0rldu08fc8g.apps.googleusercontent.com",
            callback: handleCredentialResponse,
            ux_mode: 'popup',
        });
        google.accounts.id.renderButton(
            document.getElementById("googleBtn"), 
            { 
                theme: "filled_blue",   // لون أزرق جذاب يتماشى مع الخلفية الداكنة
                size: "large",          // حجم كبير وواضح
                type: "standard",       // عرض الأيقونة مع النص
                shape: "pill",          // حواف دائرية
                text: "continue_with",  // نص "المتابعة باستخدام جوجل"
                width: "400",           // جعل الزر عريضاً ليملأ المكان (سيتم تعديله تلقائياً حسب الشاشة)
                logo_alignment: "left"
            }
        );
    } else {
        console.error("Google Identity Services library not loaded.");
    }
}

/**
 * Handles the manual email/password login form submission.
 */
function initManualLogin() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');

    // Password toggle logic
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye-slash');
            icon.classList.toggle('fa-eye');
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.style.display = 'none';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${SERVER_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: email, password: password })
            });
            const result = await response.json();

            if (result.user && result.redirectTo) {
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
                setTimeout(() => window.location.href = result.redirectTo, 1000);
            } else {
                loginError.textContent = result.message || 'فشل تسجيل الدخول.';
                loginError.style.display = 'block';
            }
        } catch (err) {
            loginError.textContent = 'خطأ في الاتصال بالخادم.';
            loginError.style.display = 'block';
        }
    });
}