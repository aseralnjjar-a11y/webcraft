const SERVER_URL = 'https://webcraft-bw34.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const clientNameEl = document.getElementById('clientName');
    const ordersTableBody = document.getElementById('ordersTableBody');
    const ordersLoader = document.getElementById('ordersLoader');
    const newOrderForm = document.getElementById('newOrderForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const serviceSelectionContainer = document.getElementById('serviceSelection');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    const totalOrdersEl = document.getElementById('totalOrders');
    const inProgressOrdersEl = document.getElementById('inProgressOrders');
    const completedOrdersEl = document.getElementById('completedOrders');

    const toastEl = document.getElementById('appToast');
    const toast = new bootstrap.Toast(toastEl);
    const toastMessage = document.getElementById('toastMessage');

    let currentUser = null;

    // --- Services Data ---
    const services = [
        { id: 'web-dev', name: 'تطوير ويب', icon: 'fas fa-laptop-code', color: '#8b5cf6' },
        { id: 'mobile-app', name: 'تطبيق جوال', icon: 'fas fa-mobile-alt', color: '#06b6d4' },
        { id: 'ui-ux', name: 'تصميم واجهات', icon: 'fas fa-drafting-compass', color: '#ec4899' },
        { id: 'lms', name: 'منصة تعليمية', icon: 'fas fa-graduation-cap', color: '#f59e0b' },
        { id: 'consulting', name: 'استشارة تقنية', icon: 'fas fa-headset', color: '#10b981' },
        { id: 'other', name: 'خدمة أخرى', icon: 'fas fa-cogs', color: '#64748b' }
    ];

    // --- Initialization ---
    function init() {
        // 1. Authenticate user
        const userData = sessionStorage.getItem('currentUser');
        if (!userData) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = JSON.parse(userData);

        // 2. Populate UI
        clientNameEl.textContent = currentUser.name.split(' ')[0]; // Show first name
        populateServiceCards();
        fetchOrders();

        // 3. Setup Event Listeners
        newOrderForm.addEventListener('submit', handleNewOrder);
        logoutBtn.addEventListener('click', handleLogout);
        sidebarToggleBtn.addEventListener('click', toggleSidebar);
        if(sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // --- Data Fetching ---
    async function fetchOrders() {
        ordersLoader.style.display = 'block';
        ordersTableBody.innerHTML = '';
        try {
            const response = await fetch(`${SERVER_URL}/api/orders/client/${currentUser.id}`);
            if (!response.ok) throw new Error('Failed to fetch orders');
            const orders = await response.json();
            displayOrders(orders);
            updateStats(orders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            ordersTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">فشل تحميل الطلبات.</td></tr>`;
        } finally {
            ordersLoader.style.display = 'none';
        }
    }

    // --- UI Rendering ---
    function displayOrders(orders) {
        if (orders.length === 0) {
            ordersTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">ليس لديك أي طلبات بعد.</td></tr>`;
            return;
        }

        orders.forEach(order => {
            const row = `
                <tr class="animate-fade-in">
                    <td>#${order._id.substring(order._id.length - 6).toUpperCase()}</td>
                    <td>${getServiceName(order.serviceType)}</td>
                    <td>${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td>${order.price}</td>
                    <td>${renderStatusBadge(order.status)}</td>
                </tr>
            `;
            ordersTableBody.insertAdjacentHTML('beforeend', row);
        });
    }

    function populateServiceCards() {
        services.forEach(service => {
            const cardHTML = `
                <label class="service-card" style="--card-color: ${service.color};">
                    <input type="radio" name="serviceType" value="${service.id}" required>
                    <div class="card-content">
                        <i class="${service.icon}"></i>
                        <span>${service.name}</span>
                    </div>
                </label>
            `;
            serviceSelectionContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    function updateStats(orders) {
        totalOrdersEl.textContent = orders.length;
        inProgressOrdersEl.textContent = orders.filter(o => o.status === 'in-progress').length;
        completedOrdersEl.textContent = orders.filter(o => o.status === 'completed').length;
    }

    // --- Event Handlers ---
    async function handleNewOrder(e) {
        e.preventDefault();
        const formError = document.getElementById('orderFormError');
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const submitBtnText = document.getElementById('submitBtnText');
        const submitBtnSpinner = document.getElementById('submitBtnSpinner');

        formError.style.display = 'none';
        submitBtn.disabled = true;
        submitBtnText.style.display = 'none';
        submitBtnSpinner.style.display = 'inline-block';

        const formData = new FormData(e.target);
        const serviceType = formData.get('serviceType');
        const description = document.getElementById('orderDescription').value;

        if (!serviceType) {
            showError('الرجاء اختيار نوع الخدمة.');
            resetSubmitButton();
            return;
        }

        const orderData = {
            clientId: currentUser.id,
            clientName: currentUser.name,
            email: currentUser.id, // Assuming email is the ID
            phone: 'N/A', // Can be added to user profile later
            serviceType: serviceType,
            description: description
        };

        try {
            const response = await fetch(`${SERVER_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message || 'Failed to create order');

            showToast('success', 'تم إرسال طلبك بنجاح!');
            bootstrap.Modal.getInstance(document.getElementById('newOrderModal')).hide();
            e.target.reset();
            fetchOrders();

        } catch (error) {
            showError(error.message);
        } finally {
            resetSubmitButton();
        }

        function showError(message) {
            formError.textContent = message;
            formError.style.display = 'block';
        }

        function resetSubmitButton() {
            submitBtn.disabled = false;
            submitBtnText.style.display = 'inline-block';
            submitBtnSpinner.style.display = 'none';
        }
    }

    function handleLogout(e) {
        e.preventDefault();
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        if(sidebarOverlay) sidebarOverlay.classList.toggle('active');
    }

    // --- Utility Functions ---
    function renderStatusBadge(status) {
        const statuses = {
            'pending': { text: 'بانتظار المراجعة', class: 'secondary' },
            'in-progress': { text: 'قيد التنفيذ', class: 'primary' },
            'completed': { text: 'مكتمل', class: 'success' },
            'cancelled': { text: 'ملغي', class: 'danger' }
        };
        const s = statuses[status] || { text: status, class: 'light' };
        return `<span class="badge rounded-pill bg-${s.class}-soft text-${s.class}">${s.text}</span>`;
    }

    function getServiceName(serviceId) {
        const service = services.find(s => s.id === serviceId);
        return service ? service.name : serviceId;
    }

    function showToast(type, message) {
        toastEl.classList.remove('bg-success-glass', 'bg-danger-glass');
        toastEl.classList.add(type === 'success' ? 'bg-success-glass' : 'bg-danger-glass');
        toastMessage.textContent = message;
        toast.show();
    }

    // --- Start the app ---
    init();
});