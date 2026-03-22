const SERVER_URL = 'https://webcraft-bw34.onrender.com'; // الرابط الفعلي من سجلات Render
const mainNavbar = document.querySelector('.navbar-main');

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

// --- نظام التعليقات: إرسال النموذج ---
function initCommentForm() {
    const form = document.getElementById('commentForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> جاري الإرسال...';
        btn.disabled = true;

        const data = {
            name: document.getElementById('commentName').value,
            email: document.getElementById('commentEmail').value,
            message: document.getElementById('commentMessage').value
        };

        try {
            const response = await fetch(`${SERVER_URL}/api/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                showToast('تم استلام تعليقك بنجاح! شكراً لمشاركتنا رأيك.', 'success');
                form.reset();
            } else {
                showToast(result.message || 'حدث خطأ أثناء الإرسال.', 'danger');
            }
        } catch (error) {
            showToast('خطأ في الاتصال بالخادم.', 'danger');
            console.error(error);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
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

// --- دالة الانتقال السلس بين الصفحات ---
function handlePageTransition(url) {
    const loader = document.getElementById('mainPreloader');
    if (loader) {
        loader.classList.add('active'); // إعادة إظهار شاشة التحميل
        setTimeout(() => {
            window.location.href = url;
        }, 800); // انتظار 0.8 ثانية لاكتمال الأنيميشن
    } else {
        window.location.href = url;
    }
}

// تعريف الدالة المستخدمة في أزرار الباقات
window.openLoginDialog = function() {
    handlePageTransition('login.html');
};

document.addEventListener('DOMContentLoaded', async () => {
    initCommentForm(); // تفعيل نموذج التعليقات
    handleReveal();
    initMatrixEffect();

    // إخفاء شاشة التحميل بعد تحميل المحتوى
    const preloader = document.getElementById('mainPreloader');
    if (preloader) {
        // تأخير بسيط لإعطاء إحساس بالنعومة
        setTimeout(() => {
            preloader.classList.remove('active');
        }, 300);
    }

    // تفعيل الانتقال السلس لجميع الروابط الداخلية (ما عدا الروابط بنفس الصفحة #)
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && link.target !== '_blank') {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                handlePageTransition(href);
            });
        }
    });
});

// دالة مساعدة لعرض التنبيهات (Toast)
function showToast(message, type = 'primary') {
    const toastEl = document.getElementById('orderToast');
    if (!toastEl) return;
    
    const toastBody = document.getElementById('toastMessage');
    toastBody.textContent = message;
    toastEl.className = `toast align-items-center text-white border-0 bg-${type === 'success' ? 'success' : 'danger'}-glass`;
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}