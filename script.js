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

// --- جلب المشاريع من السيرفر وعرضها ديناميكياً ---
async function loadProjects() {
    const container = document.getElementById('portfolioContainer');
    const loader = document.getElementById('portfolioLoader');
    if (!container) return;

    try {
        const response = await fetch(`${SERVER_URL}/api/projects`);
        const projects = await response.json();
        
        if (loader) loader.remove();

        if (!projects || projects.length === 0) {
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
    await loadProjects();
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

    // تفعيل الانتقال السلس لجميع الروابط المؤدية لصفحة الدخول
    document.querySelectorAll('a[href="login.html"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // منع الانتقال الفوري
            handlePageTransition('login.html');
        });
    });
});