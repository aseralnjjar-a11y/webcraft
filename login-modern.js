document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.querySelector('#togglePassword');
    const passwordInput = document.querySelector('#password');
    const loginForm = document.querySelector('#loginForm');

    // 1. Password visibility toggle
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = togglePassword.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    // 2. Parallax effect for floating cards on the visual panel
    document.addEventListener('mousemove', (e) => {
        const visualPanel = document.querySelector('.login-visual-panel');
        if (!visualPanel) return;

        const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
        
        const floatCards = document.querySelectorAll('.floating-card');
        floatCards.forEach(card => {
            const speed = card.dataset.speed;
            // The 'float' animation is handled by CSS. We only add the parallax translation.
            card.style.transform = `translate(${xAxis * speed}px, ${yAxis * speed}px)`;
        });
    });

    // 3. Form submission loading state
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent actual submission for demo
            const btn = loginForm.querySelector('.btn-login-modern');
            
            // Store original content
            const originalContent = btn.innerHTML;

            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>جاري التحميل...</span>';
            btn.disabled = true;
            btn.style.opacity = '0.7';
            
            // Simulate a network request
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.disabled = false;
                btn.style.opacity = '1';
                // Here you would handle the actual login response
            }, 2000);
        });
    }
});
