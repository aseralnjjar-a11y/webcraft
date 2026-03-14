document.addEventListener('DOMContentLoaded', function() {
    const ordersCountEl = document.getElementById('ordersTotalCount');
    const pendingCountEl = document.getElementById('pendingOrdersCount');
    const completedCountEl = document.getElementById('completedOrdersCount');
    const totalClientsEl = document.getElementById('totalClientsCount');
    const ordersTableBody = document.getElementById('adminOrdersTable');
    const searchInput = document.getElementById('adminSearchInput');
    const statusFilter = document.getElementById('statusFilter');
    const serviceFilter = document.getElementById('serviceFilter');
    const updateOrderModal = new bootstrap.Modal(document.getElementById('updateOrderModal'));
    const saveOrderUpdateBtn = document.getElementById('saveOrderUpdateBtn');

    const SERVER_URL = 'https://webcraft-bw34.onrender.com'; // الرابط الفعلي المحدث
    let allOrders = [];

    // --- دالة لجلب وعرض الطلبات ---
    async function loadAdminData() {
        try {
            const response = await fetch(`${SERVER_URL}/api/orders/all`);
            if (!response.ok) throw new Error('فشل جلب الطلبات');
            allOrders = await response.json();
            
            // تحديث الإحصائيات
            ordersCountEl.textContent = allOrders.length;
            pendingCountEl.textContent = allOrders.filter(o => o.status === 'pending').length;
            completedCountEl.textContent = allOrders.filter(o => o.status === 'completed').length;
            
            // جلب عدد العملاء المميزين
            const uniqueClients = new Set(allOrders.map(o => o.clientId)).size;
            totalClientsEl.textContent = uniqueClients;
            
            applyFilters(); // عرض البيانات المبدئية

        } catch (error) {
            console.error('Error loading admin data:', error);
        }
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
            ordersTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">لا توجد طلبات واردة حالياً.</td></tr>`;
            return;
        }
        
        const statusText = { 'pending': 'قيد المراجعة', 'in-progress': 'جاري التنفيذ', 'completed': 'مكتمل', 'cancelled': 'ملغي' };
        const statusColors = { 'pending': 'bg-warning text-dark', 'in-progress': 'bg-info text-dark', 'completed': 'bg-success', 'cancelled': 'bg-danger' };
        const serviceText = { 'web': 'موقع ويب', 'mobile': 'تطبيق جوال', 'design': 'UI/UX', 'consulting': 'استشارة' };
        
        orders.forEach(order => {
            const row = `
                <tr>
                    <td><div class="fw-bold">${order.clientName}</div><div class="small opacity-50">${order.email}</div></td>
                    <td><span class="badge bg-light text-dark border">${serviceText[order.serviceType] || order.serviceType}</span></td>
                    <td class="d-none d-md-table-cell" title="${order.description}"><small>${order.description.substring(0, 40)}...</small></td>
                    <td>
                        <span class="status-dot ${order.status === 'pending' ? 'bg-warning' : order.status === 'completed' ? 'bg-success' : 'bg-info'}"></span>
                        <span class="small">${statusText[order.status] || order.status}</span>
                    </td>
                    <td class="fw-bold text-tech-green">${order.price}</td>
                    <td>${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td class="text-center"><button class="btn btn-sm btn-primary-grad" onclick="openUpdateModal('${order._id}', '${order.status}', '${order.price}')"><i class="fas fa-edit"></i></button></td>
                </tr>
            `;
            ordersTableBody.insertAdjacentHTML('beforeend', row);
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