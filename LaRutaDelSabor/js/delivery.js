// delivery.js - Gestión del Panel de Delivery
// VERSIÓN CORREGIDA: Sincronización completa con Admin Panel

document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'https://hamburguer-xmx8.onrender.com/api';
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  // ============================================
  // VALIDACIÓN DE ACCESO
  // ============================================
  if (!token || !user || user.email !== 'delivery1@vendedorRS.com') {
    alert('Acceso denegado. Solo el personal de delivery puede acceder a este panel.');
    window.location.href = 'login.html';
    return;
  }

  // Mostrar nombre del usuario
  document.getElementById('deliveryUserName').textContent = user.nombre || 'Repartidor';

  // Headers de autorización
  const authHeader = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  let pedidos = [];

  // ============================================
  // FUNCIÓN DE NORMALIZACIÓN DE ESTADOS
  // ============================================
  /**
   * Normaliza el estado del pedido a minúsculas para consistencia
   * Maneja: "Pendiente", "pendiente", "PENDIENTE" → "pendiente"
   */
  function normalizeEstado(estado) {
    if (!estado) return 'pendiente';
    
    const estadoLower = estado.toLowerCase().trim();
    
    // Mapeo de variaciones posibles
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
  // NAVEGACIÓN ENTRE SECCIONES
  // ============================================
  const menuItems = document.querySelectorAll('.menu-item');
  const sections = document.querySelectorAll('.delivery-section');
  const sidebar = document.getElementById('deliverySidebar');
  const toggleBtn = document.getElementById('sidebarToggle');

  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = item.getAttribute('data-target');

      menuItems.forEach(mi => mi.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));

      item.classList.add('active');
      document.getElementById(`section-${target}`).classList.add('active');

      // Cerrar sidebar en móvil
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
      }
    });
  });

  // Toggle sidebar en móvil
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }

  // Cerrar sidebar al hacer click fuera (móvil)
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      const isClickInside = sidebar.contains(e.target) || toggleBtn.contains(e.target);
      if (!isClickInside && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    }
  });

  // ============================================
  // CARGAR PEDIDOS DESDE LA API
  // ============================================
  async function cargarPedidos() {
    try {
      console.log('🔄 Cargando pedidos desde la API...');
      
      const response = await fetch(`${API_URL}/orders`, {
        headers: authHeader
      });

      const result = await response.json();

      if (result.success) {
        // Normalizar estados de todos los pedidos
        pedidos = result.data.map(pedido => ({
          ...pedido,
          estado: normalizeEstado(pedido.estado),
          estadoOriginal: pedido.estado // Guardar estado original para debugging
        }));
        
        console.log(`✅ ${pedidos.length} pedidos cargados desde la API`);
        console.log('📊 Desglose de estados:', {
          pendientes: pedidos.filter(p => p.estado === 'pendiente').length,
          enCamino: pedidos.filter(p => p.estado === 'en camino').length,
          entregados: pedidos.filter(p => p.estado === 'entregado').length
        });
        
        // Log de los primeros 3 pedidos para debugging
        if (pedidos.length > 0) {
          console.log('🔍 Muestra de pedidos:', pedidos.slice(0, 3).map(p => ({
            id: p._id,
            estadoOriginal: p.estadoOriginal,
            estadoNormalizado: p.estado,
            fecha: p.fecha
          })));
        }
        
        renderizarPedidos();
        actualizarContadores();
      } else {
        console.error('❌ Error al cargar pedidos:', result.error);
        mostrarAlerta('error', 'No se pudieron cargar los pedidos');
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      mostrarAlerta('error', 'Error de conexión. Reintentando...');
    }
  }

  // ============================================
  // RENDERIZAR PEDIDOS POR SECCIÓN
  // ============================================
  function renderizarPedidos() {
    const hoy = new Date().toDateString();

    // Filtrar pedidos por estado (usando estados normalizados)
    const pendientes = pedidos.filter(p => p.estado === 'pendiente');
    const enCamino = pedidos.filter(p => p.estado === 'en camino');
    const entregados = pedidos.filter(p => {
      const fechaPedido = new Date(p.fecha || p.fechaPedido).toDateString();
      return p.estado === 'entregado' && fechaPedido === hoy;
    });

    console.log(`📊 Pedidos filtrados:
      - Pendientes: ${pendientes.length}
      - En Camino: ${enCamino.length}
      - Entregados Hoy: ${entregados.length}
    `);

    // Renderizar cada sección
    renderizarSeccion('listaPendientes', pendientes, 'pendiente');
    renderizarSeccion('listaEnCamino', enCamino, 'en-camino');
    renderizarSeccion('listaEntregados', entregados, 'entregado');
  }

  function renderizarSeccion(containerId, pedidosArray, tipo) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (pedidosArray.length === 0) {
      const mensajes = {
        'pendiente': 'No hay pedidos pendientes por entregar',
        'en-camino': 'No tienes pedidos en camino actualmente',
        'entregado': 'No has entregado pedidos hoy'
      };
      
      container.innerHTML = `
        <div class="mensaje-vacio">
          <i class="bi bi-inbox"></i>
          <p>${mensajes[tipo]}</p>
        </div>
      `;
      return;
    }

    // Ordenar por fecha (más recientes primero)
    pedidosArray.sort((a, b) => new Date(b.fecha || b.fechaPedido) - new Date(a.fecha || a.fechaPedido));

    pedidosArray.forEach(pedido => {
      const card = crearTarjetaPedido(pedido, tipo);
      container.appendChild(card);
    });
  }

  // ============================================
  // CREAR TARJETA DE PEDIDO
  // ============================================
  function crearTarjetaPedido(pedido, tipo) {
    const card = document.createElement('div');
    card.className = 'pedido-card';
    card.setAttribute('data-pedido-id', pedido._id);

    const fecha = new Date(pedido.fecha || pedido.fechaPedido);
    const fechaFormateada = fecha.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const horaFormateada = fecha.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Calcular total de productos (compatibilidad con 'productos' o 'items')
    const items = pedido.productos || pedido.items || [];
    const totalProductos = items.reduce((sum, item) => sum + item.cantidad, 0);

    // Obtener primeros 3 productos para vista previa
    const productosHTML = items.slice(0, 3).map(item => `
      <div class="producto-item">
        • ${item.cantidad}x ${item.producto?.nombre || item.nombre || 'Producto'} - S/${(item.precio * item.cantidad).toFixed(2)}
      </div>
    `).join('');

    const masProductos = items.length > 3 
      ? `<div class="producto-item" style="color: #666; font-style: italic;">
          + ${items.length - 3} productos más
        </div>` 
      : '';

    // Obtener datos del usuario/cliente
    const cliente = pedido.usuario || pedido.cliente || {};
    const nombreCliente = cliente.nombre || `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente';
    const direccionCliente = cliente.direccion || pedido.entrega?.direccion || 'No especificada';
    const telefonoCliente = cliente.telefono || cliente.email || 'No disponible';

    // Botones según el estado
    let botonesHTML = '';
    if (tipo === 'pendiente') {
      botonesHTML = `
        <button class="btn-action btn-tomar" onclick="tomarPedido('${pedido._id}')">
          <i class="bi bi-truck"></i> Tomar Pedido
        </button>
        <button class="btn-action btn-detalles" onclick="verDetalles('${pedido._id}')">
          <i class="bi bi-eye"></i> Ver Detalles
        </button>
      `;
    } else if (tipo === 'en-camino') {
      botonesHTML = `
        <button class="btn-action btn-entregar" onclick="marcarEntregado('${pedido._id}')">
          <i class="bi bi-check-circle"></i> Marcar Entregado
        </button>
        <button class="btn-action btn-detalles" onclick="verDetalles('${pedido._id}')">
          <i class="bi bi-eye"></i> Ver Detalles
        </button>
      `;
    } else {
      botonesHTML = `
        <button class="btn-action btn-detalles" onclick="verDetalles('${pedido._id}')">
          <i class="bi bi-eye"></i> Ver Detalles
        </button>
      `;
    }

    card.innerHTML = `
      <div class="pedido-header">
        <div class="pedido-id">
          <i class="bi bi-receipt"></i> #${pedido._id.slice(-6).toUpperCase()}
        </div>
        <span class="pedido-estado estado-${tipo}">
          ${tipo === 'pendiente' ? '⏳ Pendiente' : tipo === 'en-camino' ? '🚚 En Camino' : '✅ Entregado'}
        </span>
      </div>

      <div class="pedido-info">
        <div class="info-row">
          <i class="bi bi-person-fill"></i>
          <strong>Cliente:</strong> ${nombreCliente}
        </div>
        <div class="info-row">
          <i class="bi bi-geo-alt-fill"></i>
          <strong>Dirección:</strong> ${direccionCliente}
        </div>
        <div class="info-row">
          <i class="bi bi-telephone-fill"></i>
          <strong>Teléfono:</strong> ${telefonoCliente}
        </div>
        <div class="info-row">
          <i class="bi bi-clock-fill"></i>
          <strong>Fecha:</strong> ${fechaFormateada} a las ${horaFormateada}
        </div>
        <div class="info-row">
          <i class="bi bi-box-seam"></i>
          <strong>Productos:</strong> ${totalProductos} item${totalProductos !== 1 ? 's' : ''}
        </div>
      </div>

      <div class="pedido-productos">
        <h6><i class="bi bi-bag-check-fill"></i> Detalle del pedido:</h6>
        ${productosHTML}
        ${masProductos}
      </div>

      <div class="pedido-total">
        💰 Total: S/${pedido.total.toFixed(2)}
      </div>

      <div class="pedido-actions">
        ${botonesHTML}
      </div>
    `;

    return card;
  }

  // ============================================
  // ACTUALIZAR CONTADORES
  // ============================================
  function actualizarContadores() {
    const hoy = new Date().toDateString();

    const pendientesCount = pedidos.filter(p => p.estado === 'pendiente').length;
    const enCaminoCount = pedidos.filter(p => p.estado === 'en camino').length;
    const entregadosCount = pedidos.filter(p => {
      const fechaPedido = new Date(p.fecha || p.fechaPedido).toDateString();
      return p.estado === 'entregado' && fechaPedido === hoy;
    }).length;

    document.getElementById('badgePendientes').textContent = pendientesCount;
    document.getElementById('badgeEnCamino').textContent = enCaminoCount;
    document.getElementById('badgeEntregados').textContent = entregadosCount;
    document.getElementById('totalEntregasHoy').textContent = entregadosCount;
  }

  // ============================================
  // TOMAR PEDIDO (Pendiente → En Camino)
  // ============================================
  window.tomarPedido = async function(pedidoId) {
    const pedido = pedidos.find(p => p._id === pedidoId);
    if (!pedido) {
      console.error('❌ Pedido no encontrado:', pedidoId);
      return;
    }

    const cliente = pedido.usuario || pedido.cliente || {};
    const nombreCliente = cliente.nombre || `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente';
    const direccionCliente = cliente.direccion || pedido.entrega?.direccion || 'No especificada';

    const confirmar = confirm(`¿Deseas tomar el pedido #${pedidoId.slice(-6).toUpperCase()} para entrega?\n\nCliente: ${nombreCliente}\nDirección: ${direccionCliente}`);
    
    if (!confirmar) return;

    try {
      console.log(`🚚 Tomando pedido: ${pedidoId}`);
      console.log(`📤 Cambiando estado de "${pedido.estado}" a "en camino"`);
      
      const response = await fetch(`${API_URL}/orders/${pedidoId}`, {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify({ estado: 'en camino' }) // IMPORTANTE: minúsculas
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Pedido actualizado a "en camino"');
        mostrarAlerta('success', '¡Pedido tomado! Ahora está en camino 🚚');
        
        // Actualizar localmente antes de recargar
        pedido.estado = 'en camino';
        
        // Recargar pedidos desde API
        await cargarPedidos();
        
        // Cambiar automáticamente a la sección "En Camino"
        menuItems.forEach(mi => mi.classList.remove('active'));
        sections.forEach(sec => sec.classList.remove('active'));
        document.querySelector('[data-target="en-camino"]').classList.add('active');
        document.getElementById('section-en-camino').classList.add('active');
      } else {
        console.error('❌ Error:', result.error || result.msg);
        mostrarAlerta('error', 'Error al tomar el pedido: ' + (result.error || result.msg));
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      mostrarAlerta('error', 'Error de conexión al actualizar el pedido');
    }
  };

  // ============================================
  // MARCAR COMO ENTREGADO (En Camino → Entregado)
  // ============================================
  window.marcarEntregado = async function(pedidoId) {
    const pedido = pedidos.find(p => p._id === pedidoId);
    if (!pedido) {
      console.error('❌ Pedido no encontrado:', pedidoId);
      return;
    }

    const cliente = pedido.usuario || pedido.cliente || {};
    const nombreCliente = cliente.nombre || `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente';

    const confirmar = confirm(`¿Confirmar que el pedido #${pedidoId.slice(-6).toUpperCase()} ha sido entregado?\n\nCliente: ${nombreCliente}\nTotal: S/${pedido.total.toFixed(2)}`);
    
    if (!confirmar) return;

    try {
      console.log(`✅ Marcando como entregado: ${pedidoId}`);
      console.log(`📤 Cambiando estado de "${pedido.estado}" a "entregado"`);
      
      const response = await fetch(`${API_URL}/orders/${pedidoId}`, {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify({ estado: 'entregado' }) // IMPORTANTE: minúsculas
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Pedido marcado como entregado');
        mostrarAlerta('success', '¡Pedido entregado exitosamente! ✅');
        
        // Actualizar localmente antes de recargar
        pedido.estado = 'entregado';
        
        // Recargar pedidos desde API
        await cargarPedidos();
        
        // Cambiar automáticamente a la sección "Entregados"
        menuItems.forEach(mi => mi.classList.remove('active'));
        sections.forEach(sec => sec.classList.remove('active'));
        document.querySelector('[data-target="entregados"]').classList.add('active');
        document.getElementById('section-entregados').classList.add('active');
      } else {
        console.error('❌ Error:', result.error || result.msg);
        mostrarAlerta('error', 'Error al marcar como entregado: ' + (result.error || result.msg));
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      mostrarAlerta('error', 'Error de conexión al actualizar el pedido');
    }
  };

  // ============================================
  // VER DETALLES DEL PEDIDO (MODAL)
  // ============================================
  window.verDetalles = function(pedidoId) {
    const pedido = pedidos.find(p => p._id === pedidoId);
    if (!pedido) {
      console.error('❌ Pedido no encontrado:', pedidoId);
      return;
    }

    const fecha = new Date(pedido.fecha || pedido.fechaPedido);
    const fechaFormateada = fecha.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const items = pedido.productos || pedido.items || [];
    const productosDetalleHTML = items.map(item => `
      <tr>
        <td>${item.producto?.nombre || item.nombre || 'Producto'}</td>
        <td class="text-center">${item.cantidad}</td>
        <td class="text-end">S/${item.precio.toFixed(2)}</td>
        <td class="text-end fw-bold">S/${(item.cantidad * item.precio).toFixed(2)}</td>
      </tr>
    `).join('');

    const estadoInfo = {
      'pendiente': { badge: 'bg-warning', icon: 'clock-history', text: 'Pendiente' },
      'en camino': { badge: 'bg-primary', icon: 'truck', text: 'En Camino' },
      'entregado': { badge: 'bg-success', icon: 'check-circle-fill', text: 'Entregado' }
    };

    const estado = estadoInfo[pedido.estado] || estadoInfo['pendiente'];

    const cliente = pedido.usuario || pedido.cliente || {};
    const nombreCliente = cliente.nombre || `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || 'Cliente';
    const emailCliente = cliente.email || 'No disponible';
    const telefonoCliente = cliente.telefono || 'No disponible';
    const direccionCliente = cliente.direccion || pedido.entrega?.direccion || 'No especificada';

    document.getElementById('detallesPedidoBody').innerHTML = `
      <div class="row mb-4">
        <div class="col-md-6">
          <h6 class="text-primary mb-3">
            <i class="bi bi-person-circle"></i> Información del Cliente
          </h6>
          <p class="mb-2"><strong>👤 Nombre:</strong> ${nombreCliente}</p>
          <p class="mb-2"><strong>📧 Email:</strong> ${emailCliente}</p>
          <p class="mb-2"><strong>📞 Teléfono:</strong> ${telefonoCliente}</p>
          <p class="mb-2"><strong>📍 Dirección:</strong> ${direccionCliente}</p>
        </div>
        <div class="col-md-6">
          <h6 class="text-primary mb-3">
            <i class="bi bi-receipt"></i> Información del Pedido
          </h6>
          <p class="mb-2"><strong>🔖 ID:</strong> #${pedido._id.slice(-6).toUpperCase()}</p>
          <p class="mb-2"><strong>📅 Fecha:</strong> ${fechaFormateada}</p>
          <p class="mb-2"><strong>📊 Estado:</strong> 
            <span class="badge ${estado.badge}">
              <i class="bi bi-${estado.icon}"></i> ${estado.text}
            </span>
          </p>
          <p class="mb-2"><strong>💰 Total:</strong> 
            <span class="text-primary fw-bold fs-5">S/${pedido.total.toFixed(2)}</span>
          </p>
        </div>
      </div>

      <h6 class="text-primary mb-3">
        <i class="bi bi-bag-check"></i> Detalle de Productos
      </h6>
      <div class="table-responsive">
        <table class="table table-bordered table-hover">
          <thead class="table-light">
            <tr>
              <th>Producto</th>
              <th class="text-center" style="width: 100px;">Cantidad</th>
              <th class="text-end" style="width: 120px;">Precio Unit.</th>
              <th class="text-end" style="width: 120px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${productosDetalleHTML}
          </tbody>
          <tfoot>
            <tr class="table-light">
              <td colspan="3" class="text-end fw-bold">TOTAL:</td>
              <td class="text-end fw-bold text-primary fs-5">S/${pedido.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('detallesPedidoModal'));
    modal.show();
  };

  // ============================================
  // CERRAR SESIÓN
  // ============================================
  window.cerrarSesion = function(event) {
    event.preventDefault();
    
    const confirmar = confirm('¿Estás seguro de que deseas cerrar sesión?');
    
    if (confirmar) {
      console.log('🔒 Cerrando sesión...');
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      alert('Sesión cerrada exitosamente. ¡Hasta pronto! 👋');
      
      window.location.href = 'index.html';
    }
  };

  // ============================================
  // MOSTRAR ALERTAS
  // ============================================
  function mostrarAlerta(tipo, mensaje) {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
    alerta.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    alerta.innerHTML = `
      <strong>${tipo === 'success' ? '✅ Éxito!' : '❌ Error!'}</strong> ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alerta);
    
    setTimeout(() => {
      alerta.remove();
    }, 5000);
  }

  // ============================================
  // FUNCIÓN GLOBAL PARA ACTUALIZAR
  // ============================================
  window.cargarPedidos = cargarPedidos;

  // ============================================
  // INICIALIZAR Y AUTO-REFRESH
  // ============================================
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚚 PANEL DE DELIVERY INICIADO');
  console.log('═══════════════════════════════════════════════════════');
  console.log('👤 Usuario:', user.nombre);
  console.log('📧 Email:', user.email);
  console.log('🔄 Auto-refresh: cada 30 segundos');
  console.log('🔗 API:', API_URL);
  console.log('📊 Estados soportados:');
  console.log('   • pendiente (cualquier variación)');
  console.log('   • en camino (cualquier variación)');
  console.log('   • entregado (cualquier variación)');
  console.log('═══════════════════════════════════════════════════════');
  
  // Carga inicial
  cargarPedidos();

  // Auto-actualizar cada 30 segundos
  setInterval(() => {
    console.log('🔄 [Auto-refresh] Actualizando pedidos...');
    cargarPedidos();
  }, 30000);
});