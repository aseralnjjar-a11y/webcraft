const SERVER_URL = 'https://webcraft-bw34.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    initGoogleAuth();
    initManualSignup();
    initPasswordStrengthChecker();
});

/**
 * استجابة تسجيل الدخول بجوجل (تعمل أيضاً للتسجيل)
 */
function handleCredentialResponse(response) {
    const token = response.credential;
    const authError = document.getElementById('signupError');

    fetch(`${SERVER_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
    })
        .then((res) => res.json())
        .then((result) => {
            if (result.user && result.redirectTo) {
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
                window.location.href = result.redirectTo;
            } else {
                authError.textContent = result.message || 'فشل التسجيل باستخدام جوجل.';
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
 * زر Google — عرض مناسب لعرض النموذج (بدون عرض 400px يكسر التخطيط)
 */
function initGoogleAuth() {
    const googleBtn = document.getElementById('googleBtn');
    if (typeof google === 'undefined' || !googleBtn) {
        console.error('Google Identity Services library not loaded.');
        return;
    }

    google.accounts.id.initialize({
        client_id: '377747466694-ov9o47r36odfd7j0mn4di0rldu08fc8g.apps.googleusercontent.com',
        callback: handleCredentialResponse,
        ux_mode: 'popup'
    });

    google.accounts.id.renderButton(googleBtn, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'pill',
        text: 'signup_with',
        width: 320,
        logo_alignment: 'right'
    });
}

/**
 * ربط إظهار/إخفاء كلمة المرور لكلا الحقلين
 */
function bindPasswordToggle(buttonId, inputId) {
    const btn = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener('click', function () {
        const isPassword = input.getAttribute('type') === 'password';
        input.setAttribute('type', isPassword ? 'text' : 'password');
        const icon = this.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye-slash', isPassword);
            icon.classList.toggle('fa-eye', !isPassword);
        }
    });
}

/**
 * إرسال نموذج التسجيل اليدوي
 */
function initManualSignup() {
    const signupForm = document.getElementById('signupForm');
    const signupError = document.getElementById('signupError');

    bindPasswordToggle('togglePassword', 'password');
    bindPasswordToggle('toggleConfirmPassword', 'confirmPassword');

    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        signupError.style.display = 'none';

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!name || !email || !password || !confirmPassword) {
            signupError.textContent = 'الرجاء ملء جميع الحقول.';
            signupError.style.display = 'block';
            return;
        }

        if (password !== confirmPassword) {
            signupError.textContent = 'كلمة المرور وتأكيدها غير متطابقتين.';
            signupError.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(`${SERVER_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    id: email,
                    password: password,
                    role: 'client'
                })
            });
            const result = await response.json();

            if (response.ok) {
                // تغيير: بدلاً من التوجيه المباشر، عرض رسالة التفعيل
                signupForm.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-envelope-open-text fa-4x text-accent-primary mb-4"></i>
                        <h4 class="text-white mb-3">تم إنشاء الحساب بنجاح!</h4>
                        <p class="text-muted-custom">لقد أرسلنا رابط تفعيل إلى بريدك الإلكتروني <strong>${email}</strong>.<br>يرجى التحقق من صندوق الوارد (أو الرسائل غير المرغوب فيها) لتفعيل حسابك وتسجيل الدخول.</p>
                        <a href="login.html" class="btn btn-primary-grad w-100 mt-4">العودة لصفحة الدخول</a>
                    </div>
                `;
            } else {
                signupError.textContent = result.message || 'فشل إنشاء الحساب.';
                signupError.style.display = 'block';
            }
        } catch (err) {
            signupError.textContent = 'خطأ في الاتصال بالخادم.';
            signupError.style.display = 'block';
        }
    });
}

/**
 * مؤشر قوة كلمة المرور — استخدام classList حتى لا تُزال فئات التخطيط (مثل mb-4)
 */
function initPasswordStrengthChecker() {
    const passwordInput = document.getElementById('password');
    const strengthContainer = document.getElementById('password-strength-container');
    const strengthText = document.getElementById('password-strength-text');

    if (!passwordInput || !strengthContainer || !strengthText) return;

    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        let score = 0;
        let feedback = '';

        strengthContainer.classList.remove('weak', 'medium', 'strong');
        strengthText.classList.remove('weak', 'medium', 'strong');

        if (password.length === 0) {
            strengthText.textContent = '';
            return;
        }

        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score <= 2) {
            strengthContainer.classList.add('weak');
            strengthText.classList.add('weak');
            feedback = 'ضعيفة جداً';
        } else if (score === 3) {
            strengthContainer.classList.add('medium');
            strengthText.classList.add('medium');
            feedback = 'متوسطة';
        } else {
            strengthContainer.classList.add('strong');
            strengthText.classList.add('strong');
            feedback = 'قوية';
        }

        strengthText.textContent = `قوة كلمة المرور: ${feedback}`;
    });
}
