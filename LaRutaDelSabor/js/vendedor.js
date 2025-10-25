// vendedor.js - Sistema POS

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://hamburguer-xmx8.onrender.com/api';
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Validación de acceso - Solo usuarios autenticados que NO sean admin
    if (!token || !user) {
        alert('Debes iniciar sesión para acceder al sistema POS.');
        window.location.href = 'login.html';
        return;
    }

    if (user.email === 'test@test.com' && user.rol === 'admin') {
        alert('Los administradores deben usar el panel de administración.');
        window.location.href = 'admin.html';
        return;
    }

    // Variables globales
    let categories = [];
    let products = [];
    let ordenActual = [];
    let ordenSeleccionada = null;

    const authHeader = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================
    async function init() {
        mostrarNombreVendedor();
        actualizarFechaHora();
        setInterval(actualizarFechaHora, 1000);
        await cargarDatos();
        inicializarNavegacion();
        configurarModalPago();
    }

    function mostrarNombreVendedor() {
        document.getElementById('vendedorNombre').textContent = user.nombre || 'Vendedor';
        document.getElementById('arqueVendedor').textContent = user.nombre || 'Vendedor';
    }

    function actualizarFechaHora() {
        const ahora = new Date();
        const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('fechaActual').textContent = ahora.toLocaleDateString('es-ES', opciones);
        document.getElementById('horaActual').textContent = ahora.toLocaleTimeString('es-ES');
        document.getElementById('arqueFecha').textContent = ahora.toLocaleDateString('es-ES');
    }

    // ==========================================
    // CARGA DE DATOS
    // ==========================================
    async function cargarDatos() {
        try {
            const [catRes, prodRes] = await Promise.all([
                fetch(`${API_URL}/categories`),
                fetch(`${API_URL}/products`)
            ]);

            const catData = await catRes.json();
            const prodData = await prodRes.json();

            if (catData.success) categories = catData.data;
            if (prodData.success) products = prodData.data;

            renderizarCategorias();
            renderizarProductos();
            await cargarOrdenesDelDia();
            await cargarArqueoCaja();
        } catch (error) {
            console.error('Error al cargar datos:', error);
            alert('Error al conectar con el servidor.');
        }
    }

    // ==========================================
    // NUEVA VENTA - PRODUCTOS
    // ==========================================
    function renderizarCategorias() {
        const container = document.getElementById('categorias-filtro');
        container.innerHTML = '';

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'btn-categoria';
            btn.dataset.categoria = cat._id;
            btn.innerHTML = `${cat.icono} ${cat.nombre}`;
            btn.onclick = () => filtrarPorCategoria(cat._id);
            container.appendChild(btn);
        });
    }

    function filtrarPorCategoria(categoriaId) {
        const botones = document.querySelectorAll('.btn-categoria');
        botones.forEach(btn => btn.classList.remove('active'));

        if (categoriaId === 'todo') {
            document.querySelector('[data-categoria="todo"]').classList.add('active');
            renderizarProductos(products);
        } else {
            document.querySelector(`[data-categoria="${categoriaId}"]`).classList.add('active');
            const productosFiltrados = products.filter(p => {
                const catId = typeof p.categoria === 'object' ? p.categoria._id : p.categoria;
                return catId === categoriaId;
            });
            renderizarProductos(productosFiltrados);
        }
    }

    function renderizarProductos(productosArray = products) {
        const grid = document.getElementById('productosGrid');
        grid.innerHTML = '';

        if (productosArray.length === 0) {
            grid.innerHTML = '<p class="text-muted text-center">No hay productos disponibles</p>';
            return;
        }

        productosArray.forEach(producto => {
            const card = document.createElement('div');
            card.className = 'producto-card';
            card.innerHTML = `
                <img src="${producto.imagen}" alt="${producto.nombre}" 
                     onerror="this.src='https://placehold.co/200x150/CCCCCC/FFFFFF?text=${producto.nombre}'">
                <h4>${producto.nombre}</h4>
                <p class="precio">S/ ${producto.precio.toFixed(2)}</p>
            `;
            card.onclick = () => agregarAOrden(producto);
            grid.appendChild(card);
        });
    }

    // Búsqueda de productos
    document.getElementById('buscarProducto').addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const productosFiltrados = products.filter(p => 
            p.nombre.toLowerCase().includes(termino)
        );
        renderizarProductos(productosFiltrados);
    });

    // ==========================================
    // CARRITO - ORDEN ACTUAL
    // ==========================================
    function agregarAOrden(producto) {
        const existente = ordenActual.find(item => item._id === producto._id);

        if (existente) {
            existente.cantidad++;
        } else {
            ordenActual.push({
                _id: producto._id,
                nombre: producto.nombre,
                precio: producto.precio,
                imagen: producto.imagen,
                cantidad: 1
            });
        }

        renderizarOrden();
    }

    function renderizarOrden() {
        const container = document.getElementById('ordenItems');
        
        if (ordenActual.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No hay productos en la orden</p>';
            actualizarTotales();
            return;
        }

        container.innerHTML = '';
        ordenActual.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'orden-item';
            div.innerHTML = `
                <div class="item-info">
                    <h5>${item.nombre}</h5>
                    <span class="item-precio">S/ ${item.precio.toFixed(2)}</span>
                    <div class="item-cantidad">
                        <button class="btn-qty" onclick="cambiarCantidad(${index}, -1)">-</button>
                        <span>${item.cantidad}</span>
                        <button class="btn-qty" onclick="cambiarCantidad(${index}, 1)">+</button>
                    </div>
                </div>
                <div>
                    <p><strong>S/ ${(item.precio * item.cantidad).toFixed(2)}</strong></p>
                    <button class="btn-remove" onclick="eliminarItem(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(div);
        });

        actualizarTotales();
    }

    window.cambiarCantidad = function(index, cambio) {
        ordenActual[index].cantidad += cambio;
        if (ordenActual[index].cantidad <= 0) {
            ordenActual.splice(index, 1);
        }
        renderizarOrden();
    };

    window.eliminarItem = function(index) {
        ordenActual.splice(index, 1);
        renderizarOrden();
    };

    function actualizarTotales() {
        const subtotal = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        document.getElementById('subtotal').textContent = `S/ ${subtotal.toFixed(2)}`;
        document.getElementById('total').textContent = `S/ ${subtotal.toFixed(2)}`;
    }

    window.limpiarOrden = function() {
        if (confirm('¿Deseas limpiar la orden actual?')) {
            ordenActual = [];
            renderizarOrden();
        }
    };

    // ==========================================
    // MODAL DE PAGO
    // ==========================================
    function configurarModalPago() {
        const metodoPago = document.getElementById('metodoPago');
        const pagoEfectivo = document.getElementById('pagoEfectivo');
        const montoRecibido = document.getElementById('montoRecibido');

        metodoPago.addEventListener('change', (e) => {
            if (e.target.value === 'efectivo') {
                pagoEfectivo.style.display = 'block';
            } else {
                pagoEfectivo.style.display = 'none';
            }
        });

        montoRecibido.addEventListener('input', (e) => {
            const total = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
            const recibido = parseFloat(e.target.value) || 0;
            const cambio = recibido - total;
            document.getElementById('cambioMonto').textContent = `S/ ${cambio.toFixed(2)}`;
        });
    }

    window.abrirModalPago = function() {
        if (ordenActual.length === 0) {
            alert('Agrega productos a la orden primero.');
            return;
        }

        const total = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        document.getElementById('pagoTotal').textContent = `S/ ${total.toFixed(2)}`;
        document.getElementById('metodoPago').value = 'efectivo';
        document.getElementById('nombreCliente').value = '';
        document.getElementById('montoRecibido').value = '';
        document.getElementById('cambioMonto').textContent = 'S/ 0.00';
        document.getElementById('pagoEfectivo').style.display = 'block';

        const modal = new bootstrap.Modal(document.getElementById('modalPago'));
        modal.show();
    };

    window.confirmarPago = async function() {
        const metodoPago = document.getElementById('metodoPago').value;
        const nombreCliente = document.getElementById('nombreCliente').value.trim() || 'Cliente General';
        const total = ordenActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

        if (metodoPago === 'efectivo') {
            const montoRecibido = parseFloat(document.getElementById('montoRecibido').value);
            if (!montoRecibido || montoRecibido < total) {
                alert('El monto recibido debe ser mayor o igual al total.');
                return;
            }
        }

        try {
            const ordenData = {
                productos: ordenActual.map(item => ({
                    producto: item._id,
                    cantidad: item.cantidad,
                    precio: item.precio
                })),
                total: total,
                estado: 'completado',
                metodoPago: metodoPago,
                cliente: nombreCliente
            };

            const response = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: authHeader,
                body: JSON.stringify(ordenData)
            });

            const result = await response.json();

            if (result.success) {
                alert('¡Venta realizada con éxito!');
                ordenActual = [];
                renderizarOrden();
                await cargarOrdenesDelDia();
                await cargarArqueoCaja();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalPago'));
                modal.hide();
            } else {
                throw new Error(result.msg || 'Error al procesar la venta');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al procesar la venta: ' + error.message);
        }
    };

    // ==========================================
    // MIS ÓRDENES
    // ==========================================
    async function cargarOrdenesDelDia() {
        try {
            const response = await fetch(`${API_URL}/orders`, {
                headers: authHeader
            });
            const data = await response.json();

            if (data.success) {
                const hoy = new Date().toDateString();
                const ordenesHoy = data.data.filter(orden => {
                    const fechaOrden = new Date(orden.createdAt).toDateString();
                    return fechaOrden === hoy;
                });

                renderizarOrdenesTabla(ordenesHoy);
                actualizarEstadisticas(ordenesHoy);
            }
        } catch (error) {
            console.error('Error al cargar órdenes:', error);
        }
    }

    function renderizarOrdenesTabla(ordenes) {
        const tbody = document.getElementById('ordenesTableBody');
        tbody.innerHTML = '';

        if (ordenes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay órdenes hoy</td></tr>';
            return;
        }

        ordenes.forEach(orden => {
            const fecha = new Date(orden.createdAt);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${orden._id.slice(-6)}</td>
                <td>${fecha.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}</td>
                <td>${orden.usuario?.nombre || 'Cliente General'}</td>
                <td>S/ ${orden.total.toFixed(2)}</td>
                <td><span class="badge badge-success">${orden.estado}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="verDetalleOrden('${orden._id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function actualizarEstadisticas(ordenes) {
        const totalOrdenes = ordenes.length;
        const ventasHoy = ordenes.reduce((sum, orden) => sum + orden.total, 0);

        document.getElementById('totalOrdenes').textContent = totalOrdenes;
        document.getElementById('ventasHoy').textContent = `S/ ${ventasHoy.toFixed(2)}`;
    }

    window.verDetalleOrden = async function(ordenId) {
        try {
            const response = await fetch(`${API_URL}/orders/${ordenId}`, {
                headers: authHeader
            });
            const data = await response.json();

            if (data.success) {
                ordenSeleccionada = data.data;
                mostrarDetalleOrden(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    function mostrarDetalleOrden(orden) {
        const body = document.getElementById('detalleOrdenBody');
        body.innerHTML = `
            <div class="orden-detalle">
                <h5>Orden #${orden._id.slice(-6)}</h5>
                <p><strong>Cliente:</strong> ${orden.usuario?.nombre || 'Cliente General'}</p>
                <p><strong>Fecha:</strong> ${new Date(orden.createdAt).toLocaleString('es-ES')}</p>
                <p><strong>Método de Pago:</strong> ${orden.metodoPago || 'Efectivo'}</p>
                <hr>
                <h6>Productos:</h6>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orden.productos.map(item => `
                            <tr>
                                <td>${item.producto?.nombre || 'Producto'}</td>
                                <td>${item.cantidad}</td>
                                <td>S/ ${item.precio.toFixed(2)}</td>
                                <td>S/ ${(item.cantidad * item.precio).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="table-total">
                            <td colspan="3"><strong>TOTAL:</strong></td>
                            <td><strong>S/ ${orden.total.toFixed(2)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('modalDetalleOrden'));
        modal.show();
    }

    // ==========================================
    // ARQUEO DE CAJA
    // ==========================================
    async function cargarArqueoCaja() {
        try {
            const response = await fetch(`${API_URL}/orders`, {
                headers: authHeader
            });
            const data = await response.json();

            if (data.success) {
                const hoy = new Date().toDateString();
                const ordenesHoy = data.data.filter(orden => {
                    const fechaOrden = new Date(orden.createdAt).toDateString();
                    return fechaOrden === hoy && orden.estado === 'completado';
                });

                calcularArqueo(ordenesHoy);
            }
        } catch (error) {
            console.error('Error al cargar arqueo:', error);
        }
    }

    function calcularArqueo(ordenes) {
        const numOrdenes = ordenes.length;
        let efectivo = 0, tarjeta = 0, yape = 0;

        ordenes.forEach(orden => {
            const metodo = orden.metodoPago || 'efectivo';
            switch(metodo) {
                case 'efectivo':
                    efectivo += orden.total;
                    break;
                case 'tarjeta':
                    tarjeta += orden.total;
                    break;
                case 'yape':
                    yape += orden.total;
                    break;
            }
        });

        const total = efectivo + tarjeta + yape;

        document.getElementById('arqueNumOrdenes').textContent = numOrdenes;
        document.getElementById('arqueEfectivo').textContent = `S/ ${efectivo.toFixed(2)}`;
        document.getElementById('arqueTarjeta').textContent = `S/ ${tarjeta.toFixed(2)}`;
        document.getElementById('arqueYape').textContent = `S/ ${yape.toFixed(2)}`;
        document.getElementById('arqueTotalCaja').textContent = `S/ ${total.toFixed(2)}`;
    }

    window.imprimirArqueo = function() {
        window.print();
    };

    window.imprimirOrden = function() {
        if (ordenSeleccionada) {
            window.print();
        }
    };

    // ==========================================
    // NAVEGACIÓN
    // ==========================================
    function inicializarNavegacion() {
        const menuItems = document.querySelectorAll('.menu-item');
        const sections = document.querySelectorAll('.pos-section');
        const sidebar = document.getElementById('posSidebar');
        const toggleBtn = document.getElementById('sidebarToggle');

        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = item.getAttribute('data-target');

                menuItems.forEach(mi => mi.classList.remove('active'));
                sections.forEach(sec => sec.classList.remove('active'));

                item.classList.add('active');
                document.getElementById(`section-${target}`).classList.add('active');

                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                }
            });
        });

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const isClickInside = sidebar.contains(e.target) || toggleBtn.contains(e.target);
                if (!isClickInside && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }

    // Iniciar aplicación
    init();
});

// Cerrar sesión
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}