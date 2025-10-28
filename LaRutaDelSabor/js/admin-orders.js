document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'https://hamburguer-xmx8.onrender.com/api';
  let orders = [];
  let products = [];
  let users = [];
  let selectedStartDate = null;
  let selectedEndDate = null;
  let salesChart = null;
  let productDetailsChart = null;
  let topProductsChart = null;

  const token = localStorage.getItem('token');
  console.log('Token:', token);
  const authHeader = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // ============================================
  // FUNCIÓN DE NORMALIZACIÓN DE ESTADOS
  // ============================================
  function normalizeEstado(estado) {
    if (!estado) return 'pendiente';
    
    const estadoLower = estado.toLowerCase().trim();
    
    const estadosMap = {
      'pendiente': 'pendiente',
      'en camino': 'en camino',
      'en_camino': 'en camino',
      'encamino': 'en camino',
      'entregado': 'entregado',
      'completado': 'entregado',
      'finalizado': 'entregado'
    };
    
    return estadosMap[estadoLower] || 'pendiente';
  }

  // ============================================
  // MAPEO DE ESTADOS PARA UI
  // ============================================
  function getEstadoDisplay(estado) {
    const estadoMap = {
      'pendiente': 'Pendiente',
      'en camino': 'En Camino',
      'entregado': 'Entregado'
    };
    return estadoMap[estado] || 'Pendiente';
  }

  /**
   * Carga las órdenes, productos y usuarios desde la API
   */
  async function fetchOrdersAndProducts() {
    try {
      const usersRes = await fetch('./data/usuarios.json').catch(e => ({ ok: false, status: 'Network Error', statusText: e.message }));
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        users = usersData.map(user => ({
          _id: user._id,
          nombre: user.nombre
        }));
        console.log('✅ Usuarios cargados:', users.length);
      } else {
        console.error('❌ Error al cargar usuarios.json:', usersRes.status, usersRes.statusText);
        users = [];
      }

      const [ordersRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/orders/all`, { headers: authHeader }).catch(e => ({ ok: false, status: 'Network Error', statusText: e.message })),
        fetch(`${API_URL}/products`, { headers: authHeader }).catch(e => ({ ok: false, status: 'Network Error', statusText: e.message }))
      ]);

      let errors = [];
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData.success) {
          // Normalizar estados de todos los pedidos
          orders = ordersData.data.map(order => ({
            ...order,
            estado: normalizeEstado(order.estado),
            estadoOriginal: order.estado
          }));
          console.log('✅ Órdenes cargadas:', orders.length);
          console.log('📊 Estados normalizados:', {
            pendientes: orders.filter(o => o.estado === 'pendiente').length,
            enCamino: orders.filter(o => o.estado === 'en camino').length,
            entregados: orders.filter(o => o.estado === 'entregado').length
          });
        } else {
          errors.push(`Error en /orders: ${ordersData.error || ordersData.msg || 'Error desconocido'}`);
          orders = [];
        }
      } else {
        errors.push(`Error en /orders: ${ordersRes.status} ${ordersRes.statusText}`);
        orders = [];
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        if (productsData.success) {
          products = productsData.data;
          console.log('✅ Productos cargados:', products.length);
        } else {
          errors.push(`Error en /products: ${productsData.error || productsData.msg || 'Error desconocido'}`);
          products = [];
        }
      } else {
        errors.push(`Error en /products: ${productsRes.status} ${productsRes.statusText}`);
        products = [];
      }

      if (errors.length > 0) {
        console.error('❌ Errores en la carga:', errors);
        alert(`No se pudieron cargar algunos datos: ${errors.join('; ')}`);
      }

      if (orders.length > 0) {
        setupDateFilters();
        renderOrdersTable();
        updateTotalRevenue();
        renderSalesChart();
        renderTopProductsChart();
      } else {
        console.error('⚠️ No se cargaron órdenes.');
        alert('No se cargaron órdenes. Verifica la conexión con el servidor.');
      }
    } catch (error) {
      console.error('❌ Error general:', error);
      alert(`Error general al cargar datos: ${error.message}`);
    }
  }

  /**
   * Configura los filtros de fecha (individual y por rango)
   */
  function setupDateFilters() {
    const startDateInput = document.getElementById('startDateFilter');
    const endDateInput = document.getElementById('endDateFilter');
    const applyRangeBtn = document.getElementById('applyRangeFilter');
    const clearFilterBtn = document.getElementById('clearFilter');

    applyRangeBtn.addEventListener('click', () => {
      const startDate = startDateInput.value;
      const endDate = endDateInput.value;

      if (!startDate || !endDate) {
        alert('Por favor, selecciona ambas fechas (inicio y fin)');
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        alert('La fecha de inicio no puede ser mayor a la fecha de fin');
        return;
      }

      selectedStartDate = startDate;
      selectedEndDate = endDate;
      
      renderOrdersTable();
      updateTotalRevenue();
      renderSalesChart();
      renderTopProductsChart();
    });

    clearFilterBtn.addEventListener('click', () => {
      startDateInput.value = '';
      endDateInput.value = '';
      selectedStartDate = null;
      selectedEndDate = null;
      
      renderOrdersTable();
      updateTotalRevenue();
      renderSalesChart();
      renderTopProductsChart();
    });

    const generateReportBtn = document.getElementById('generateReportBtn');
    generateReportBtn.addEventListener('click', generateReport);
  }

  /**
   * Filtra las órdenes según el rango de fechas seleccionado
   */
  function getFilteredOrders() {
    if (!selectedStartDate || !selectedEndDate) {
      return orders;
    }

    return orders.filter(order => {
      const orderDate = new Date(order.fechaPedido).toISOString().split('T')[0];
      return orderDate >= selectedStartDate && orderDate <= selectedEndDate;
    });
  }

  /**
   * Actualiza el estado de una orden
   */
  async function updateOrderStatus(orderId, newStatusDisplay) {
    try {
      // Convertir el estado display (Pendiente) a minúsculas (pendiente)
      const estadoMap = {
        'Pendiente': 'pendiente',
        'En Camino': 'en camino',
        'Entregado': 'entregado'
      };
      
      const newStatus = estadoMap[newStatusDisplay] || 'pendiente';
      
      console.log(`📤 Admin cambiando estado de orden ${orderId} a "${newStatus}"`);
      
      const response = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify({ estado: newStatus }) // Envía en minúsculas
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Estado actualizado exitosamente a "${newStatus}"`);
        
        // Actualizar localmente
        const order = orders.find(o => o._id === orderId);
        if (order) {
          order.estado = newStatus;
          order.estadoOriginal = newStatus;
        }
        
        return true;
      } else {
        console.error('❌ Error al actualizar:', result);
        alert(`Error al actualizar el estado: ${result.error || result.msg}`);
        
        // Revertir el select al estado anterior
        const selectElement = document.querySelector(`.status-select[data-order-id="${orderId}"]`);
        if (selectElement && order) {
          selectElement.value = getEstadoDisplay(order.estado);
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      alert('Error de conexión al actualizar el estado');
      
      // Revertir el select al estado anterior
      const order = orders.find(o => o._id === orderId);
      const selectElement = document.querySelector(`.status-select[data-order-id="${orderId}"]`);
      if (selectElement && order) {
        selectElement.value = getEstadoDisplay(order.estado);
      }
      
      return false;
    }
  }

  /**
   * Renderiza la tabla de órdenes
   */
  function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';

    const filteredOrders = getFilteredOrders();

    if (filteredOrders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay órdenes en el rango seleccionado</td></tr>';
      return;
    }

    filteredOrders.forEach(order => {
      const user = users.find(u => u._id === (order.usuario._id || order.usuario)) || { nombre: 'Usuario desconocido' };
      const tr = document.createElement('tr');
      const formattedDate = new Date(order.fechaPedido).toLocaleString('es-PE', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
      
      const estadoDisplay = getEstadoDisplay(order.estado);
      
      tr.innerHTML = `
        <td>${order._id}</td>
        <td>${user.nombre}</td>
        <td>${formattedDate}</td>
        <td>
          <select class="status-select form-select form-select-sm" data-order-id="${order._id}">
            <option value="Pendiente" ${order.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="En Camino" ${order.estado === 'en camino' ? 'selected' : ''}>En Camino</option>
            <option value="Entregado" ${order.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
          </select>
        </td>
        <td>S/${order.total.toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-naranja view-details-btn"><i class="bi bi-eye"></i> Ver Detalles</button>
        </td>
      `;
      tr.querySelector('.view-details-btn').addEventListener('click', () => showOrderDetails(order));
      tr.querySelector('.status-select').addEventListener('change', (e) => {
        const newStatus = e.target.value;
        updateOrderStatus(order._id, newStatus);
      });
      tbody.appendChild(tr);
    });
  }

  /**
   * Agrega datos de ventas por día
   */
  function aggregateDailySales() {
    const filteredOrders = getFilteredOrders();

    const dailySales = {};
    filteredOrders.forEach(order => {
      const date = new Date(order.fechaPedido);
      const dayKey = date.toLocaleDateString('es-PE');
      dailySales[dayKey] = (dailySales[dayKey] || 0) + order.total;
    });

    const sortedDates = Object.keys(dailySales).sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateA - dateB;
    });

    return {
      labels: sortedDates,
      data: sortedDates.map(date => dailySales[date])
    };
  }

  /**
   * Agrega datos de productos más vendidos
   */
  function aggregateTopProducts() {
    const filteredOrders = getFilteredOrders();

    const productQuantities = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.producto._id || item.producto;
        const product = products.find(p => p._id === productId) || { nombre: item.nombre || 'Producto desconocido' };
        const productName = product.nombre;
        productQuantities[productName] = (productQuantities[productName] || 0) + item.cantidad;
      });
    });

    const sortedProducts = Object.entries(productQuantities)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return {
      labels: sortedProducts.map(p => p.name),
      data: sortedProducts.map(p => p.quantity)
    };
  }

  /**
   * Renderiza el gráfico de ventas por día
   */
  function renderSalesChart() {
    const ctx = document.getElementById('salesChart').getContext('2d');
    const { labels, data } = aggregateDailySales();

    if (salesChart) {
      salesChart.destroy();
    }

    const chartTitle = selectedStartDate && selectedEndDate 
      ? `Ventas del ${new Date(selectedStartDate).toLocaleDateString('es-PE')} al ${new Date(selectedEndDate).toLocaleDateString('es-PE')}`
      : 'Ventas por Día (S/)';

    salesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: chartTitle,
          data: data,
          backgroundColor: 'rgba(255, 102, 0, 0.6)',
          borderColor: 'rgba(255, 102, 0, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Total Ventas (S/)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Fecha'
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        }
      }
    });
  }

  /**
   * Renderiza el gráfico de productos más vendidos
   */
  function renderTopProductsChart() {
    const ctx = document.getElementById('topProductsChart').getContext('2d');
    const { labels, data } = aggregateTopProducts();

    if (topProductsChart) {
      topProductsChart.destroy();
    }

    topProductsChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          label: 'Unidades Vendidas',
          data: data,
          backgroundColor: [
            'rgba(255, 102, 0, 0.8)',
            'rgba(255, 147, 51, 0.8)',
            'rgba(255, 204, 153, 0.8)',
            'rgba(204, 102, 0, 0.8)',
            'rgba(255, 153, 102, 0.8)',
            'rgba(255, 51, 0, 0.8)',
            'rgba(255, 178, 102, 0.8)',
            'rgba(255, 128, 0, 0.8)',
            'rgba(230, 92, 0, 0.8)',
            'rgba(255, 165, 0, 0.8)'
          ],
          borderColor: '#fff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 20
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                return `${label}: ${value} unidades`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Muestra detalles de una orden en un modal
   */
  function showOrderDetails(order) {
    const modalBody = document.getElementById('orderDetailsTableBody');
    const modalFoot = document.getElementById('orderDetailsTableFoot');
    modalBody.innerHTML = '';
    modalFoot.innerHTML = '';

    const productSubtotalSum = order.items.reduce((sum, item) => {
      const subtotal = item.cantidad * item.precio;
      return sum + subtotal;
    }, 0);

    order.items.forEach(item => {
      const product = products.find(p => p._id === (item.producto._id || item.producto)) || {
        nombre: item.nombre || 'Producto desconocido',
        precio: item.precio || 0
      };
      const subtotal = item.cantidad * item.precio;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${product.nombre}</td>
        <td>${item.cantidad}</td>
        <td>S/${item.precio.toFixed(2)}</td>
        <td>S/${subtotal.toFixed(2)}</td>
      `;
      modalBody.appendChild(tr);
    });

    if (Math.abs(productSubtotalSum - order.total) === 5) {
      const deliveryRow = document.createElement('tr');
      deliveryRow.innerHTML = `
        <td><strong>Delivery</strong></td>
        <td>-</td>
        <td>-</td>
        <td><strong>S/5.00</strong></td>
      `;
      modalFoot.appendChild(deliveryRow);
    }

    renderProductDetailsChart(order);

    document.getElementById('orderDetailsModalLabel').textContent = `Detalles de la Orden ${order._id}`;
    
    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    modal.show();
  }

  /**
   * Renderiza gráfico de detalles de productos en una orden
   */
  function renderProductDetailsChart(order) {
    const ctx = document.getElementById('productDetailsChart').getContext('2d');
    const labels = order.items.map(item => {
      const product = products.find(p => p._id === (item.producto._id || item.producto)) || { nombre: item.nombre || 'Producto desconocido' };
      return product.nombre;
    });
    const data = order.items.map(item => item.cantidad * item.precio);

    if (productDetailsChart) {
      productDetailsChart.destroy();
    }

    productDetailsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Subtotal por Producto (S/)',
          data: data,
          backgroundColor: 'rgba(255, 102, 0, 0.6)',
          borderColor: 'rgba(255, 102, 0, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Subtotal (S/)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Producto'
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        }
      }
    });
  }

  /**
   * Calcula y actualiza el total de ingresos
   */
  function updateTotalRevenue() {
    const filteredOrders = getFilteredOrders();
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    document.getElementById('totalRevenue').textContent = `S/${totalRevenue.toFixed(2)}`;
  }

  /**
   * Genera un reporte en formato de impresión con los datos filtrados
   */
  function generateReport() {
    const filteredOrders = getFilteredOrders();
    
    if (filteredOrders.length === 0) {
      alert('No hay órdenes para generar el reporte');
      return;
    }

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filteredOrders.length;
    const averageOrder = totalRevenue / totalOrders;
    
    const { labels: productNames, data: productQuantities } = aggregateTopProducts();
    const { labels: salesDates, data: salesTotals } = aggregateDailySales();

    const reportWindow = window.open('', '_blank');
    
    const dateRange = selectedStartDate && selectedEndDate
      ? `Del ${new Date(selectedStartDate).toLocaleDateString('es-PE')} al ${new Date(selectedEndDate).toLocaleDateString('es-PE')}`
      : 'Todas las fechas';

    let productsList = '';
    productNames.forEach((name, index) => {
      productsList += `
        <tr>
          <td>${index + 1}</td>
          <td>${name}</td>
          <td style="text-align: center;">${productQuantities[index]}</td>
        </tr>
      `;
    });

    let salesList = '';
    salesDates.forEach((date, index) => {
      salesList += `
        <tr>
          <td>${date}</td>
          <td style="text-align: right;">S/ ${salesTotals[index].toFixed(2)}</td>
        </tr>
      `;
    });

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte de Ventas - La Ruta del Sabor</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #ff7f00;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #ff7f00;
            margin-bottom: 10px;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #ff7f00;
          }
          .stat-card h3 {
            color: #333;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .stat-card p {
            color: #ff7f00;
            font-size: 24px;
            font-weight: bold;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h2 {
            color: #333;
            font-size: 18px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #ff7f00;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #ff7f00;
            color: white;
            font-weight: bold;
          }
          tr:hover {
            background-color: #f5f5f5;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
          }
          .print-btn {
            background: #ff7f00;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-bottom: 20px;
          }
          .print-btn:hover {
            background: #e67300;
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="print-btn" onclick="window.print()">🖨️ Imprimir Reporte</button>
        </div>
        
        <div class="header">
          <h1>🍔 La Ruta del Sabor</h1>
          <p>Reporte de Ventas</p>
          <p><strong>${dateRange}</strong></p>
          <p>Generado el: ${new Date().toLocaleString('es-PE')}</p>
        </div>

        <div class="stats">
          <div class="stat-card">
            <h3>Total Ingresos</h3>
            <p>S/ ${totalRevenue.toFixed(2)}</p>
          </div>
          <div class="stat-card">
            <h3>Total Órdenes</h3>
            <p>${totalOrders}</p>
          </div>
          <div class="stat-card">
            <h3>Promedio por Orden</h3>
            <p>S/ ${averageOrder.toFixed(2)}</p>
          </div>
        </div>

        <div class="section">
          <h2>📊 Ventas por Día</h2>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${salesList}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>🏆 Top 10 Productos Más Vendidos</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">#</th>
                <th>Producto</th>
                <th style="text-align: center;">Unidades Vendidas</th>
              </tr>
            </thead>
            <tbody>
              ${productsList}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>© 2025 Restaurant La Ruta del Sabor - Todos los derechos reservados</p>
          <p>Este reporte es confidencial y de uso exclusivo interno</p>
        </div>
      </body>
      </html>
    `);

    reportWindow.document.close();
  }

  // Inicializa la carga de datos
  console.log('═══════════════════════════════════════════════════════');
  console.log('👨‍💼 PANEL DE ADMIN INICIADO');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔗 API:', API_URL);
  console.log('📊 Estados sincronizados con Delivery Panel');
  console.log('═══════════════════════════════════════════════════════');
  
  fetchOrdersAndProducts();
});