document.addEventListener('DOMContentLoaded', function() {
    const ordersCountEl = document.getElementById('ordersTotalCount');
    const pendingCountEl = document.getElementById('pendingOrdersCount');
    const ordersTableBody = document.getElementById('adminOrdersTable');
    const updateOrderModal = new bootstrap.Modal(document.getElementById('updateOrderModal'));
    const saveOrderUpdateBtn = document.getElementById('saveOrderUpdateBtn');

    const SERVER_URL = 'https://webcraft-bw34.onrender.com'; // الرابط الفعلي المحدث

    // --- دالة لجلب وعرض الطلبات ---
    async function loadAdminData() {
        try {
            const response = await fetch(`${SERVER_URL}/api/orders/all`);
            if (!response.ok) throw new Error('فشل جلب الطلبات');
            const orders = await response.json();
            
            // تحديث بطاقات الإحصائيات
            ordersCountEl.textContent = orders.length;
            pendingCountEl.textContent = orders.filter(o => o.status === 'pending').length;
            
            // عرض الطلبات في الجدول
            renderOrdersTable(orders);

        } catch (error) {
            console.error('Error loading admin data:', error);
            ordersCountEl.textContent = '-';
            pendingCountEl.textContent = '-';
            if (ordersTableBody) {
                ordersTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">فشل تحميل الطلبات.</td></tr>`;
            }
        }
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
        
        orders.forEach(order => {
            const row = `
                <tr>
                    <td>${order.clientName}</td>
                    <td><span class="badge bg-light text-dark border">${order.serviceType}</span></td>
                    <td title="${order.description}"><small>${order.description.substring(0, 30)}...</small></td>
                    <td><span class="badge ${statusColors[order.status] || 'bg-secondary'}">${statusText[order.status] || order.status}</span></td>
                    <td>${order.price}</td>
                    <td>${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td><button class="btn btn-sm btn-outline-primary" onclick="openUpdateModal('${order._id}', '${order.status}', '${order.price}')">إدارة</button></td>
                </tr>
            `;
            ordersTableBody.insertAdjacentHTML('beforeend', row);
        });
    }

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