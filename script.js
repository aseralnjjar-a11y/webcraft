const SERVER_URL = 'https://web-craft-backend.onrender.com'; // استبدل هذا برابط Render الخاص بك
const mainNavbar = document.querySelector('.navbar-main');

function openLoginDialog(role) { // أعدنا role مؤقتاً للتوافق مع الاستدعاء القديم
    const dialog = document.getElementById('loginDialog');
    dialog.classList.add('visible');
}
function closeLoginDialog() {
    const dialog = document.getElementById('loginDialog');
    dialog.classList.remove('visible');
}

const authError = document.getElementById('dialogAuthError');

// --- نظام جوجل لتسجيل الدخول ---
function handleCredentialResponse(response) {
    const token = response.credential;
    
    fetch(`${SERVER_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
    })
    .then(res => res.json())
    .then(result => {
        if (result.user) {
            sessionStorage.setItem('currentUser', JSON.stringify(result.user));
            if (result.redirectTo) {
                window.location.href = result.redirectTo;
            } else {
                authError.textContent = 'خطأ في تحديد وجهة الدخول.';
                authError.style.display = 'block';
            }
        } else {
            authError.textContent = result.message || 'فشل تسجيل الدخول بجوجل.';
            authError.style.display = 'block';
        }
    })
    .catch((err) => {
        console.error('Fetch Error:', err);
        authError.textContent = 'خطأ في الاتصال بالخادم.';
        authError.style.display = 'block';
    });
}

function initGoogleAuth() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "377747466694-ov9o47r36odfd7j0mn4di0rldu08fc8g.apps.googleusercontent.com",
            callback: handleCredentialResponse
        });
        google.accounts.id.renderButton(
            document.getElementById("googleBtn"),
            { theme: "filled_blue", size: "large", width: "100%", text: "signin_with" }
        );
    }
}

// --- نظام التحريك عند التمرير الموحد ---
function handleReveal() {
    const reveals = document.querySelectorAll(".reveal");
    reveals.forEach(el => {
        const windowHeight = window.innerHeight;
        const elementTop = el.getBoundingClientRect().top;
        const elementVisible = 100;
        if (elementTop < windowHeight - elementVisible) {
            el.classList.add("active");
        }
    });
}

window.addEventListener('scroll', () => {
    handleReveal();
    if (window.scrollY > 50) {
        mainNavbar?.classList.add('scrolled');
        mainNavbar.style.padding = "0.8rem 0";
    } else {
        mainNavbar?.classList.remove('scrolled');
        mainNavbar.style.padding = "1.5rem 0";
    }
});

// --- جديد: معالجة نموذج الطلبات وربطه بالسيرفر ---
const orderForm = document.getElementById('orderForm');
if (orderForm) {
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('orderSubmitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const spinner = submitBtn.querySelector('.spinner-border');
        const toastEl = document.getElementById('orderToast');
        const toastMsg = document.getElementById('toastMessage');
        const toast = new bootstrap.Toast(toastEl);
        
        const orderData = {
            clientId: "GUEST_" + Date.now(),
            clientName: document.getElementById('orderClientName').value,
            email: document.getElementById('orderEmail').value,
            phone: document.getElementById('orderPhone').value,
            serviceType: document.querySelector('input[name="serviceType"]:checked')?.value || '',
            description: document.getElementById('orderDescription').value
        };

        // التحقق البسيط
        if (orderData.phone.length < 8) {
            showToast('الرجاء إدخال رقم هاتف صحيح', 'bg-danger-glass');
            return;
        }

        try {
            // تفعيل مؤشر التحميل
            submitBtn.disabled = true;
            btnText.textContent = 'جاري الإرسال...';
            spinner.classList.remove('d-none');

            const response = await fetch(`${SERVER_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                showToast('تم إرسال طلبك بنجاح! سنتواصل معك قريباً.', 'bg-success-glass');
                orderForm.reset();
            } else {
                throw new Error();
            }
        } catch (error) {
            showToast('فشل إرسال الطلب. يرجى التحقق من الاتصال.', 'bg-danger-glass');
        } finally {
            submitBtn.disabled = false;
            btnText.textContent = 'إرسال الطلب الآن';
            spinner.classList.add('d-none');
        }

        function showToast(msg, bgClass) {
            toastEl.className = `toast align-items-center text-white border-0 ${bgClass}`;
            toastMsg.textContent = msg;
            toast.show();
        }
    });
}

// --- جلب المشاريع من السيرفر وعرضها ديناميكياً ---
async function loadProjects() {
    const container = document.getElementById('portfolioContainer');
    const loader = document.getElementById('portfolioLoader');
    if (!container) return;

    try {
        const response = await fetch(`${SERVER_URL}/api/projects`);
        const projects = await response.json();
        
        if (loader) loader.remove();

        if (projects.length === 0) {
            container.innerHTML = '<p class="text-center opacity-50">لا توجد مشاريع مضافة حالياً.</p>';
            return;
        }

        projects.forEach(proj => {
            const html = `
                <div class="col-md-4">
                    <div class="project-item">
                        <img src="${proj.imageUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=500'}" class="img-fluid w-100 h-100 object-fit-cover" alt="${proj.title}">
                        <div class="project-overlay">
                            <span class="badge bg-info mb-2 w-fit">${proj.category}</span>
                            <h5 class="fw-bold">${proj.title}</h5>
                            <p class="small opacity-75">${proj.description || ''}</p>
                            <a href="${proj.link || '#'}" class="btn btn-sm btn-light mt-2">عرض المشروع</a>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
        handleReveal(); // تفعيل التحريك للمشاريع الجديدة
    } catch (e) { console.error("Error fetching projects", e); }
}

// --- نظام تأثير خيوط البرمجة (Matrix Effect) ---
function initMatrixEffect() {
    const canvas = document.getElementById('matrixCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width, height, columns, drops;
    const fontSize = 16;
    const letters = "01<>{}[]/\\*;:+-"; // رموز برمجية

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        columns = Math.floor(width / fontSize);
        drops = new Array(columns).fill(1);
    }

    function draw() {
        // رسم طبقة شفافة سوداء لإنشاء تأثير التلاشي (Trail)
        ctx.fillStyle = "rgba(3, 7, 18, 0.1)"; 
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "rgba(139, 92, 246, 0.4)"; // لون بنفسجي نيون خفيف
        ctx.font = fontSize + "px monospace";

        for (let i = 0; i < drops.length; i++) {
            const text = letters[Math.floor(Math.random() * letters.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            // إعادة التعيين عشوائياً عند الوصول للنهاية
            if (drops[i] * fontSize > height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    resize();
    window.addEventListener('resize', resize);
    setInterval(draw, 50); // سرعة حركة متزنة
}

document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    handleReveal();
    initMatrixEffect();
    setTimeout(initGoogleAuth, 1000); // إعطاء وقت للمكتبة للتحميل
});