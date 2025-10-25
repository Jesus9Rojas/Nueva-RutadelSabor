
document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'https://hamburguer-xmx8.onrender.com/api';
  let orders = []; // Array para almacenar las órdenes.
  let products = []; // Array para almacenar los productos.
  let users = []; // Array para almacenar los usuarios.
  let selectedDate = null; // Día seleccionado para el filtro (null para todas las órdenes).
  let salesChart = null; // Referencia al gráfico de ventas
  let productDetailsChart = null; // Referencia al gráfico de detalles de productos
  let topProductsChart = null; // Referencia al gráfico de productos más vendidos
// Variable global para almacenar los estados válidos como colección
  let validStatusesCollection = [];
  // Obtiene el token del localStorage.
  const token = localStorage.getItem('token');
  console.log('Token:', token); // Para depuración
  const authHeader = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  /**
   * Carga las órdenes, productos y usuarios desde la API y el archivo JSON local.
   */
  async function fetchOrdersAndProducts() {
    try {
      // Cargar usuarios desde data/usuarios.json
      const usersRes = await fetch('./data/usuarios.json').catch(e => ({ ok: false, status: 'Network Error', statusText: e.message }));
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // Extraer solo _id y nombre
        users = usersData.map(user => ({
          _id: user._id,
          nombre: user.nombre
        }));
        console.log('Usuarios cargados desde usuarios.json:', users);
      } else {
        console.error('Error al cargar usuarios.json:', usersRes.status, usersRes.statusText);
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
          orders = ordersData.data;
          console.log('Órdenes cargadas:', orders);
          console.log('IDs de órdenes:', orders.map(o => o._id));
        } else {
          errors.push(`Error en la respuesta de /orders: ${ordersData.error || ordersData.msg || 'Error desconocido'}`);
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
          console.log('Productos cargados:', products);
        } else {
          errors.push(`Error en la respuesta de /products: ${productsData.error || productsData.msg || 'Error desconocido'}`);
          products = [];
        }
      } else {
        errors.push(`Error en /products: ${productsRes.status} ${productsRes.statusText}`);
        products = [];
      }

      if (errors.length > 0) {
        console.error('Errores en la carga de datos:', errors);
        alert(`No se pudieron cargar algunos datos del servidor: ${errors.join('; ')}`);
      }

      if (orders.length > 0) {
        populateDateFilter();
        renderOrdersTable();
        updateTotalRevenue();
        renderSalesChart();
        renderTopProductsChart();
      } else {
        console.error('No se cargaron órdenes. Verifica el endpoint /orders.');
        alert('No se cargaron órdenes. Por favor, verifica la conexión con el servidor o contacta al administrador.');
      }
    } catch (error) {
      console.error('Error general al cargar datos:', error);
      alert(`Error general al cargar datos del servidor: ${error.message}`);
    }
  }

  /**
   * Actualiza el estado de una orden en la API.
   */
async function updateOrderStatus(orderId, newStatusName) {
  try {
    // Validar el estado contra la colección cargada
    const isValidStatus = validStatusesCollection.some(status => status.nombre === newStatusName);
    if (!isValidStatus) {
      console.warn(`Estado no válido seleccionado: ${newStatusName} para orden ${orderId}.`);
      return;
    }

    // 1. Cambiar visualmente el select en la UI
    const selectElement = document.querySelector(`.status-select[data-order-id="${orderId}"]`);
    if (selectElement) {
      selectElement.value = newStatusName; // Esto actualiza la selección en el dropdown
      console.log(`Estado de la orden ${orderId} actualizado visualmente a "${newStatusName}".`);
    } else {
      console.warn(`Elemento select para la orden ${orderId} no encontrado al intentar actualizar.`);
    }

    // 2. Guardar el estado simulado en localStorage para persistencia
    localStorage.setItem(`simulated_order_status_${orderId}`, newStatusName);

    // NOTA: NO modificamos el array 'orders' aquí, ni llamamos a renderOrdersTable().
    // El cambio es directo en el DOM y en localStorage.

  } catch (error) {
    console.error('Error al simular la actualización del estado de la orden:', error);
    // No alert, just log the error
  }
}
  /**
   * Configura el filtro de fecha y el botón de "Mostrar Todas".
   */
  function populateDateFilter() {
    const dateFilter = document.getElementById('dateFilter');
    const clearFilter = document.getElementById('clearFilter');

    dateFilter.addEventListener('change', (e) => {
      selectedDate = e.target.value || null; // Si no se selecciona fecha, usar null
      renderOrdersTable();
      updateTotalRevenue();
      renderSalesChart();
      renderTopProductsChart();
    });

    clearFilter.addEventListener('click', () => {
      dateFilter.value = ''; // Limpiar el input
      selectedDate = null; // Mostrar todas las órdenes
      renderOrdersTable();
      updateTotalRevenue();
      renderSalesChart();
      renderTopProductsChart();
    });
  }

  /**
   * Renderiza la tabla de órdenes.
   */
  function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';

    const filteredOrders = selectedDate ? orders.filter(order => {
      const orderDate = new Date(order.fechaPedido).toISOString().split('T')[0];
      return orderDate === selectedDate;
    }) : orders;

    filteredOrders.forEach(order => {
      const user = users.find(u => u._id === (order.usuario._id || order.usuario)) || { nombre: 'Usuario desconocido' };
      const tr = document.createElement('tr');
      const formattedDate = new Date(order.fechaPedido).toLocaleString('es-PE', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
      tr.innerHTML = `
        <td>${order._id}</td>
        <td>${user.nombre}</td>
        <td>${formattedDate}</td>
        <td>
          <select class="status-select form-select form-select-sm" data-order-id="${order._id}">
            <option value="Pendiente" ${order.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="En Camino" ${order.estado === 'En Camino' ? 'selected' : ''}>En Camino</option>
            <option value="Entregado" ${order.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
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
   * Agrega datos de ventas por día para el gráfico.
   */
  function aggregateDailySales() {
    const filteredOrders = selectedDate ? orders.filter(order => {
      const orderDate = new Date(order.fechaPedido).toISOString().split('T')[0];
      return orderDate === selectedDate;
    }) : orders;

    const dailySales = {};
    filteredOrders.forEach(order => {
      const date = new Date(order.fechaPedido);
      const dayKey = date.toLocaleString('es-PE', { day: 'numeric', month: 'numeric', year: 'numeric' });
      dailySales[dayKey] = (dailySales[dayKey] || 0) + order.total;
    });

    const sortedDates = Object.keys(dailySales).sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateA - dateB;
    });

    return {
      labels: selectedDate ? [new Date(selectedDate).toLocaleString('es-PE', { day: 'numeric', month: 'numeric', year: 'numeric' })] : sortedDates,
      data: selectedDate ? [dailySales[new Date(selectedDate).toLocaleString('es-PE', { day: 'numeric', month: 'numeric', year: 'numeric' })] || 0] : sortedDates.map(date => dailySales[date])
    };
  }

  /**
   * Agrega datos de productos más vendidos.
   */
  function aggregateTopProducts() {
    const filteredOrders = selectedDate ? orders.filter(order => {
      const orderDate = new Date(order.fechaPedido).toISOString().split('T')[0];
      return orderDate === selectedDate;
    }) : orders;

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
      .slice(0, 10); // Top 10 productos

    return {
      labels: sortedProducts.map(p => p.name),
      data: sortedProducts.map(p => p.quantity)
    };
  }

  /**
   * Renderiza el gráfico de barras de ventas por día.
   */
  function renderSalesChart() {
    const ctx = document.getElementById('salesChart').getContext('2d');
    const { labels, data } = aggregateDailySales();

    if (salesChart) {
      salesChart.destroy();
    }

    salesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: selectedDate ? 'Ventas del Día (S/)' : 'Ventas por Día (S/)',
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
   * Renderiza el gráfico de pastel de los 10 productos más vendidos.
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
            'rgba(255, 102, 0, 0.8)', // Naranja principal
            'rgba(255, 147, 51, 0.8)', // Naranja claro
            'rgba(255, 204, 153, 0.8)', // Naranja más claro
            'rgba(204, 102, 0, 0.8)', // Naranja oscuro
            'rgba(255, 153, 102, 0.8)', // Naranja intermedio
            'rgba(255, 51, 0, 0.8)', // Rojo-naranja
            'rgba(255, 178, 102, 0.8)', // Naranja cálido
            'rgba(255, 128, 0, 0.8)', // Naranja medio
            'rgba(230, 92, 0, 0.8)', // Naranja profundo
            'rgba(255, 165, 0, 0.8)' // Naranja estándar
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
   * Muestra un modal con los detalles de los productos de una orden y un gráfico.
   */
  function showOrderDetails(order) {
    const modalBody = document.getElementById('orderDetailsTableBody');
    const modalFoot = document.getElementById('orderDetailsTableFoot');
    modalBody.innerHTML = '';
    modalFoot.innerHTML = '';

    // Calcular la suma de los subtotales de los productos
    const productSubtotalSum = order.items.reduce((sum, item) => {
      const subtotal = item.cantidad * item.precio;
      return sum + subtotal;
    }, 0);

    // Renderizar los productos
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

    // Verificar si la suma de los subtotales difiere en 5 soles del total
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
   * Renderiza el gráfico de barras para los productos en una orden.
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
   * Calcula y actualiza el total de ingresos en el pie de la tabla.
   */
  function updateTotalRevenue() {
    const filteredOrders = selectedDate ? orders.filter(order => {
      const orderDate = new Date(order.fechaPedido).toISOString().split('T')[0];
      return orderDate === selectedDate;
    }) : orders;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    document.getElementById('totalRevenue').textContent = `S/${totalRevenue.toFixed(2)}`;
  }

  // Inicializa la carga de datos
  fetchOrdersAndProducts();
});


