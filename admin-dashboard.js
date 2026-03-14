document.addEventListener('DOMContentLoaded', function() {
    const ordersCountEl = document.getElementById('ordersTotalCount');
    const pendingCountEl = document.getElementById('pendingOrdersCount');
    const completedCountEl = document.getElementById('completedOrdersCount');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const completionRateText = document.getElementById('completionRateText');
    const completionRateProgress = document.getElementById('completionRateProgress');
    const ordersTableBody = document.getElementById('adminOrdersTable');
    const searchInput = document.getElementById('adminSearchInput');
    const statusFilter = document.getElementById('statusFilter');
    const serviceFilter = document.getElementById('serviceFilter');
    const updateOrderModal = new bootstrap.Modal(document.getElementById('updateOrderModal'));
    const saveOrderUpdateBtn = document.getElementById('saveOrderUpdateBtn');

    const SERVER_URL = 'https://webcraft-bw34.onrender.com'; // الرابط الفعلي المحدث
    let allOrders = [];
    let ordersChart, servicesChart;

    // --- التحقق من الصلاحيات وعرض بيانات المدير ---
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    if (user.lastLogin) {
        document.getElementById('adminLastLogin').textContent = `آخر دخول: ${new Date(user.lastLogin).toLocaleString('ar-EG')}`;
    }

    // --- دالة لجلب وعرض الطلبات ---
    async function loadAdminData() {
        try {
            const response = await fetch(`${SERVER_URL}/api/orders/all`);
            if (!response.ok) throw new Error('فشل جلب الطلبات');
            allOrders = await response.json();
            
            updateStats();
            initCharts();
            
            applyFilters(); // عرض البيانات المبدئية

        } catch (error) {
            console.error('Error loading admin data:', error);
        }
    }

    function updateStats() {
        const total = allOrders.length;
        const pending = allOrders.filter(o => o.status === 'pending').length;
        const completed = allOrders.filter(o => o.status === 'completed').length;
        
        ordersCountEl.textContent = total;
        pendingCountEl.textContent = pending;
        document.getElementById('newOrdersBadge').textContent = pending;

        // حساب الأرباح التقريبية
        const revenue = allOrders.reduce((acc, o) => {
            const p = parseFloat(o.price.replace(/[^0-9.]/g, '')) || 0;
            return acc + p;
        }, 0);
        totalRevenueEl.textContent = revenue.toLocaleString('ar-SA') + ' ر.س';

        // نسبة الإنجاز
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        completionRateText.textContent = rate + '%';
        completionRateProgress.style.width = rate + '%';
    }

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value;
        const serviceValue = serviceFilter.value;

        const filtered = allOrders.filter(order => {
            const matchesSearch = order.clientName.toLowerCase().includes(searchTerm) || order.description.toLowerCase().includes(searchTerm);
            const matchesStatus = statusValue === 'all' || order.status === statusValue;
            const matchesService = serviceValue === 'all' || order.serviceType === serviceValue;
            return matchesSearch && matchesStatus && matchesService;
        });

        renderOrdersTable(filtered);
    }

    function renderOrdersTable(orders) {
        if (!ordersTableBody) return;
        ordersTableBody.innerHTML = '';

        if (orders.length === 0) {
            ordersTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-5 opacity-50">لا توجد طلبات تطابق معايير البحث.</td></tr>`;
            return;
        }
        
        const statusText = { 'pending': 'قيد المراجعة', 'in-progress': 'جاري التنفيذ', 'completed': 'مكتمل', 'cancelled': 'ملغي' };
        const statusColors = { 'pending': 'bg-warning text-dark', 'in-progress': 'bg-info text-dark', 'completed': 'bg-success', 'cancelled': 'bg-danger' };
        const serviceText = { 'web': 'موقع ويب', 'mobile': 'تطبيق جوال', 'design': 'UI/UX', 'consulting': 'استشارة' };
        
        orders.forEach(order => {
            const row = `
                <tr>
                    <td class="ps-4">
                        <div class="d-flex align-items-center gap-3">
                            <div class="rounded-circle bg-primary-grad d-flex align-items-center justify-content-center" style="width:38px; height:38px; font-size:12px;">${order.clientName.charAt(0)}</div>
                            <div><div class="fw-bold">${order.clientName}</div><div class="small opacity-50">${order.email}</div></div>
                        </div>
                    </td>
                    <td><span class="badge bg-light text-dark opacity-75">${serviceText[order.serviceType] || order.serviceType}</span></td>
                    <td>
                        <span class="status-badge-modern ${statusColors[order.status]}">${statusText[order.status]}</span>
                    </td>
                    <td class="fw-bold text-tech-green">${order.price}</td>
                    <td>${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td class="text-center pe-4"><button class="btn btn-sm btn-outline-light rounded-pill px-3" onclick="openUpdateModal('${order._id}', '${order.status}', '${order.price}')">إدارة <i class="fas fa-chevron-left ms-1 small"></i></button></td>
                </tr>
            `;
            ordersTableBody.insertAdjacentHTML('beforeend', row);
        });
    }

    function initCharts() {
        const ctx1 = document.getElementById('ordersChart').getContext('2d');
        if(ordersChart) ordersChart.destroy();
        ordersChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'الطلبات',
                    data: [12, 19, 3, 5, 2, 3],
                    borderColor: '#8b5cf6',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(139, 92, 246, 0.1)'
                }]
            },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }
        });

        const ctx2 = document.getElementById('servicesChart').getContext('2d');
        if(servicesChart) servicesChart.destroy();
        servicesChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Web', 'Mobile', 'Design'],
                datasets: [{
                    data: [
                        allOrders.filter(o => o.serviceType === 'web').length,
                        allOrders.filter(o => o.serviceType === 'mobile').length,
                        allOrders.filter(o => o.serviceType === 'design').length
                    ],
                    backgroundColor: ['#8b5cf6', '#06b6d4', '#f43f5e'],
                    borderWidth: 0
                }]
            },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
        });
    }

    // مراقبة المدخلات للفلترة اللحظية
    searchInput.addEventListener('input', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    serviceFilter.addEventListener('change', applyFilters);

    // --- دوال التعامل مع نافذة التعديل ---
    window.openUpdateModal = (id, status, price) => {
        document.getElementById('editOrderId').value = id;
        document.getElementById('editOrderStatus').value = status;
        document.getElementById('editOrderPrice').value = price === 'بانتظار التحديد' ? '' : price;
        updateOrderModal.show();
    };

    saveOrderUpdateBtn.addEventListener('click', async () => {
        const id = document.getElementById('editOrderId').value;
        const status = document.getElementById('editOrderStatus').value;
        const price = document.getElementById('editOrderPrice').value || 'بانتظار التحديد';

        try {
            await fetch(`${SERVER_URL}/api/orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, price })
            });
            updateOrderModal.hide();
            loadAdminData(); // إعادة تحميل البيانات لتحديث الواجهة
        } catch (error) {
            console.error('Failed to update order:', error);
            alert('فشل تحديث الطلب.');
        }
    });

    // استدعاء الدالة الرئيسية عند تحميل الصفحة
    loadAdminData();
});