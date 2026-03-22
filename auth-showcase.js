/**
 * فيديو خلفية صفحات الدخول / التسجيل:
 * يتوقف التشغيل عند الثانية 6 بالضبط ويبقى على هذه الإطار (بدون loop).
 * يتضمن أيضاً تشغيل حركة فتح اللابتوب في صفحة التسجيل.
 */
document.addEventListener('DOMContentLoaded', () => {
    initVideoControl();
    initLaptopAnimation();
    // --- جديد: تفعيل إخفاء شاشة التحميل والانتقال بين الصفحات ---
    initPageTransitions();
});

function initVideoControl() {
    const videos = document.querySelectorAll('video.background-video');
    const FREEZE_AT = 7; // الثانية التي نريد التوقف عندها

    videos.forEach(video => {
        video.loop = false;

        const checkTime = () => {
            if (video.currentTime >= FREEZE_AT) {
                video.pause();
                video.currentTime = FREEZE_AT; // تثبيت الإطار بدقة
                video.removeEventListener('timeupdate', checkTime);
            }
        };

        video.addEventListener('timeupdate', checkTime);

        // محاولة التشغيل التلقائي
        video.play().catch(e => console.log('Autoplay blocked:', e));
    });
}

function initLaptopAnimation() {
    const laptop = document.getElementById('laptopDevice');
    if (laptop) {
        // تأخير بسيط لإعطاء جمالية لفتح الجهاز
        setTimeout(() => {
            laptop.classList.add('laptop-device--animating');
        }, 500);
    }
}

/**
 * --- جديد: نظام الانتقال بين الصفحات ---
 * 1. إخفاء شاشة التحميل عند تحميل الصفحة.
 * 2. إظهار شاشة التحميل عند النقر على رابط للانتقال.
 */
function initPageTransitions() {
    const preloader = document.getElementById('mainPreloader');
    if (!preloader) return;

    // إخفاء شاشة التحميل عند اكتمال تحميل الصفحة
    setTimeout(() => {
        preloader.classList.remove('active');
    }, 300);

    // إظهار شاشة التحميل عند محاولة الانتقال لصفحة أخرى
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && link.target !== '_blank') {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                preloader.classList.add('active');
                setTimeout(() => { window.location.href = href; }, 600); // انتظار اكتمال الأنيميشن
            });
        }
    });
}
