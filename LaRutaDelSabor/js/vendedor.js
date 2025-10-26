// vendedor.js - Sistema POS

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://hamburguer-xmx8.onrender.com/api';
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Validación de acceso - Solo la cuenta específica de vendedor
    if (!token || !user) {
        alert('Debes iniciar sesión para acceder al sistema POS.');
        window.location.href = 'login.html';
        return;
    }

    // Solo permite acceso a vendedor1@vendedorRS.com
    if (user.email !== 'vendedor1@vendedorRS.com') {
        alert('No tienes permisos para acceder al sistema POS.');
        window.location.href = 'index.html';
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
                items: ordenActual.map(item => ({
                    producto: item._id,
                    cantidad: item.cantidad,
                    precio: item.precio
                })),
                total: parseFloat(total.toFixed(2)),
                estado: 'Pendiente',
                metodoPago: metodoPago
            };

            console.log('Datos enviados:', ordenData);

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
                throw new Error(result.msg || result.error || 'Error al procesar la venta');
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

            console.log('Órdenes recibidas:', data);

            if (data.success) {
                const hoy = new Date();
                const hoyStr = hoy.toISOString().split('T')[0];
                
                const ordenesHoy = data.data.filter(orden => {
                    const fechaOrden = orden.fechaPedido || orden.createdAt || orden.fecha;
                    if (!fechaOrden) return false;
                    
                    const fechaOrdenStr = new Date(fechaOrden).toISOString().split('T')[0];
                    return fechaOrdenStr === hoyStr;
                });

                console.log('Órdenes de hoy:', ordenesHoy);

                renderizarOrdenesTabla(ordenesHoy);
                actualizarEstadisticas(ordenesHoy);
            } else {
                console.error('Error al cargar órdenes:', data);
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
            const fechaOrden = new Date(orden.fechaPedido || orden.createdAt || orden.fecha);
            const hora = fechaOrden.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
            const nombreCliente = orden.usuario?.nombre || orden.cliente || 'Cliente General';
            const estado = orden.estado || 'Pendiente';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${orden._id.slice(-6)}</td>
                <td>${hora}</td>
                <td>${nombreCliente}</td>
                <td>S/ ${orden.total.toFixed(2)}</td>
                <td><span class="badge badge-success">${estado}</span></td>
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
        const ventasHoy = ordenes.reduce((sum, orden) => sum + (orden.total || 0), 0);

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
        const items = orden.items || orden.productos || orden.products || [];
        
        console.log('Orden completa:', orden);
        console.log('Items de la orden:', items);
        
        body.innerHTML = `
            <div class="orden-detalle">
                <h5>Orden #${orden._id.slice(-6)}</h5>
                <p><strong>Cliente:</strong> ${orden.usuario?.nombre || orden.cliente || 'Cliente General'}</p>
                <p><strong>Fecha:</strong> ${new Date(orden.fechaPedido || orden.createdAt || orden.fecha).toLocaleString('es-ES')}</p>
                <p><strong>Método de Pago:</strong> ${orden.metodoPago || 'Efectivo'}</p>
                <p><strong>Estado:</strong> ${orden.estado || 'Pendiente'}</p>
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
                        ${items.length > 0 ? items.map(item => {
                            const nombreProducto = item.producto?.nombre || item.nombre || 'Producto';
                            const cantidad = item.cantidad || 1;
                            const precio = item.precio || item.producto?.precio || 0;
                            const subtotal = cantidad * precio;
                            
                            return `
                                <tr>
                                    <td>${nombreProducto}</td>
                                    <td>${cantidad}</td>
                                    <td>S/ ${precio.toFixed(2)}</td>
                                    <td>S/ ${subtotal.toFixed(2)}</td>
                                </tr>
                            `;
                        }).join('') : '<tr><td colspan="4" class="text-center">No hay productos</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr class="table-total">
                            <td colspan="3"><strong>TOTAL:</strong></td>
                            <td><strong>S/ ${(orden.total || 0).toFixed(2)}</strong></td>
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

            console.log('Órdenes para arqueo:', data);

            if (data.success) {
                const hoy = new Date();
                const hoyStr = hoy.toISOString().split('T')[0];
                
                const ordenesHoy = data.data.filter(orden => {
                    const fechaOrden = orden.fechaPedido || orden.createdAt || orden.fecha;
                    if (!fechaOrden) return false;
                    
                    const fechaOrdenStr = new Date(fechaOrden).toISOString().split('T')[0];
                    const estado = (orden.estado || '').toLowerCase();
                    
                    return fechaOrdenStr === hoyStr && 
                           (estado === 'completado' || estado === 'entregado' || estado === 'pendiente' || estado === 'en camino');
                });

                console.log('Órdenes del día para arqueo:', ordenesHoy);
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
            const total = parseFloat(orden.total) || 0;
            const metodo = (orden.metodoPago || 'efectivo').toLowerCase();
            
            console.log(`Orden: ${orden._id.slice(-6)}, Total: ${total}, Método: ${metodo}`);
            
            switch(metodo) {
                case 'efectivo':
                    efectivo += total;
                    break;
                case 'tarjeta':
                    tarjeta += total;
                    break;
                case 'yape':
                case 'plin':
                    yape += total;
                    break;
                default:
                    efectivo += total;
            }
        });

        const totalCaja = efectivo + tarjeta + yape;

        console.log('Arqueo calculado:', { numOrdenes, efectivo, tarjeta, yape, totalCaja });

        document.getElementById('arqueNumOrdenes').textContent = numOrdenes;
        document.getElementById('arqueEfectivo').textContent = `S/ ${efectivo.toFixed(2)}`;
        document.getElementById('arqueTarjeta').textContent = `S/ ${tarjeta.toFixed(2)}`;
        document.getElementById('arqueYape').textContent = `S/ ${yape.toFixed(2)}`;
        document.getElementById('arqueTotalCaja').textContent = `S/ ${totalCaja.toFixed(2)}`;
    }

    // ==========================================
    // IMPRIMIR ARQUEO - VERSIÓN PROFESIONAL
    // ==========================================
    window.imprimirArqueo = function() {
        const vendedor = document.getElementById('arqueVendedor').textContent;
        const fecha = document.getElementById('arqueFecha').textContent;
        const numOrdenes = document.getElementById('arqueNumOrdenes').textContent;
        const efectivo = document.getElementById('arqueEfectivo').textContent;
        const tarjeta = document.getElementById('arqueTarjeta').textContent;
        const yape = document.getElementById('arqueYape').textContent;
        const totalCaja = document.getElementById('arqueTotalCaja').textContent;
        
        const ahora = new Date();
        const horaImpresion = ahora.toLocaleTimeString('es-ES');
        
        const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');
        
        ventanaImpresion.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Arqueo de Caja - ${fecha}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        padding: 20px;
                        background: white;
                        color: #000;
                        font-size: 14px;
                    }
                    
                    .reporte-container {
                        max-width: 800px;
                        margin: 0 auto;
                        border: 3px solid #ff7f00;
                        padding: 30px;
                        border-radius: 10px;
                        position: relative;
                    }
                    
                    .header {
                        text-align: center;
                        border-bottom: 3px solid #ff7f00;
                        padding-bottom: 20px;
                        margin-bottom: 25px;
                        background: linear-gradient(135deg, #ffc640 0%, #ff7f00 100%);
                        padding: 25px;
                        border-radius: 8px;
                        color: white;
                    }
                    
                    .header img {
                        width: 100px;
                        height: 100px;
                        margin-bottom: 15px;
                        border-radius: 50%;
                        border: 4px solid white;
                        background: white;
                        padding: 5px;
                    }
                    
                    .header h1 {
                        font-size: 32px;
                        font-weight: bold;
                        margin-bottom: 8px;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
                    }
                    
                    .header h2 {
                        font-size: 22px;
                        margin-bottom: 10px;
                        font-weight: 600;
                        letter-spacing: 2px;
                    }
                    
                    .header p {
                        font-size: 14px;
                        opacity: 0.95;
                    }
                    
                    .info-section {
                        margin: 25px 0;
                        padding: 20px;
                        background: linear-gradient(135deg, #fff5e6 0%, #ffe6cc 100%);
                        border: 2px solid #ffc640;
                        border-radius: 8px;
                    }
                    
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 12px 0;
                        border-bottom: 1px dotted #ff7f00;
                    }
                    
                    .info-row:last-child {
                        border-bottom: none;
                    }
                    
                    .info-label {
                        font-weight: bold;
                        color: #c1440e;
                        font-size: 15px;
                    }
                    
                    .info-value {
                        color: #000;
                        font-size: 15px;
                        font-weight: 600;
                    }
                    
                    .detalles-section {
                        margin: 30px 0;
                    }
                    
                    .detalles-section h3 {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 15px;
                        padding: 12px;
                        background: #ff7f00;
                        color: white;
                        border-radius: 5px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    
                    table th {
                        background: #1a1a1a;
                        color: white;
                        padding: 15px;
                        text-align: left;
                        font-weight: bold;
                        font-size: 14px;
                        border-bottom: 3px solid #ff7f00;
                    }
                    
                    table td {
                        padding: 12px 15px;
                        border-bottom: 1px solid #e0e0e0;
                        font-size: 14px;
                    }
                    
                    table tr:nth-child(even) {
                        background: #fff5e6;
                    }
                    
                    table tr:hover {
                        background: #ffe6cc;
                    }
                    
                    .total-row {
                        background: linear-gradient(135deg, #ff7f00 0%, #c1440e 100%) !important;
                        color: white !important;
                        font-weight: bold;
                        font-size: 16px;
                    }
                    
                    .total-row td {
                        padding: 18px 15px;
                        border: none;
                        font-size: 16px;
                    }
                    
                    .resumen-metodos {
                        margin: 30px 0;
                        padding: 25px;
                        background: white;
                        border: 3px solid #ff7f00;
                        border-radius: 10px;
                        box-shadow: 0 4px 12px rgba(255, 127, 0, 0.15);
                    }
                    
                    .resumen-metodos h3 {
                        color: #ff7f00;
                        font-size: 18px;
                        margin-bottom: 20px;
                        padding-bottom: 10px;
                        border-bottom: 2px solid #ffc640;
                    }
                    
                    .metodo-pago {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 14px 10px;
                        font-size: 15px;
                        border-bottom: 1px solid #f0f0f0;
                    }
                    
                    .metodo-pago:last-child {
                        border-bottom: none;
                    }
                    
                    .metodo-pago.destacado {
                        font-size: 20px;
                        font-weight: bold;
                        color: white;
                        background: linear-gradient(135deg, #28a745 0%, #218838 100%);
                        padding: 20px;
                        margin-top: 15px;
                        border-radius: 8px;
                        border: none;
                        box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
                    }
                    
                    .footer {
                        margin-top: 50px;
                        padding-top: 25px;
                        border-top: 3px solid #ff7f00;
                        text-align: center;
                    }
                    
                    .firma-section {
                        margin-top: 60px;
                        display: flex;
                        justify-content: space-around;
                        gap: 30px;
                    }
                    
                    .firma-box {
                        text-align: center;
                        width: 45%;
                        padding: 20px;
                        border: 2px dashed #ff7f00;
                        border-radius: 8px;
                        background: #fff5e6;
                    }
                    
                    .firma-linea {
                        border-top: 2px solid #1a1a1a;
                        margin-top: 70px;
                        margin-bottom: 12px;
                    }
                    
                    .firma-box p {
                        margin: 5px 0;
                    }
                    
                    .firma-box strong {
                        color: #c1440e;
                        font-size: 15px;
                    }
                    
                    .nota {
                        font-size: 12px;
                        color: #666;
                        font-style: italic;
                        margin-top: 25px;
                        line-height: 1.6;
                    }
                    
                    .sello-confidencial {
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        padding: 10px 20px;
                        border: 3px solid #c1440e;
                        border-radius: 5px;
                        transform: rotate(15deg);
                        color: #c1440e;
                        font-weight: bold;
                        font-size: 12px;
                        opacity: 0.6;
                    }
                    
                    @media print {
                        body {
                            padding: 0;
                        }
                        
                        .reporte-container {
                            border: 2px solid #ff7f00;
                            max-width: 100%;
                            page-break-inside: avoid;
                        }
                        
                        .info-section, .resumen-metodos {
                            break-inside: avoid;
                        }
                        
                        table {
                            break-inside: avoid;
                        }
                        
                        .firma-section {
                            break-before: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="reporte-container">
                    <div class="sello-confidencial">USO INTERNO</div>
                    
                    <!-- Header -->
                    <div class="header">
                        <img src="Icon/logo.png" alt="Logo" onerror="this.style.display='none'">
                        <h1>🍔 LA RUTA DEL SABOR</h1>
                        <h2>REPORTE DE ARQUEO DE CAJA</h2>
                        <p>Sistema de Punto de Venta - Control Diario de Operaciones</p>
                    </div>
                    
                    <!-- Información General -->
                    <div class="info-section">
                        <div class="info-row">
                            <span class="info-label">👤 Responsable del Turno:</span>
                            <span class="info-value">${vendedor}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">📅 Fecha de Operación:</span>
                            <span class="info-value">${fecha}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">🕐 Hora de Cierre y Generación:</span>
                            <span class="info-value">${horaImpresion}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">⏰ Turno de Trabajo:</span>
                            <span class="info-value">Turno Día - Completo</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">📄 N° de Reporte:</span>
                            <span class="info-value">ARQ-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-001</span>
                        </div>
                    </div>
                    
                    <!-- Detalles de Ventas -->
                    <div class="detalles-section">
                        <h3>📊 RESUMEN DE OPERACIONES DEL DÍA</h3>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>Concepto</th>
                                    <th style="text-align: right;">Cantidad/Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>📋 Total de Órdenes Procesadas</strong></td>
                                    <td style="text-align: right; font-weight: bold;">${numOrdenes} órdenes</td>
                                </tr>
                                <tr>
                                    <td>Promedio por Orden</td>
                                    <td style="text-align: right;">${numOrdenes > 0 ? 'S/ ' + (parseFloat(totalCaja.replace('S/ ','')) / parseInt(numOrdenes)).toFixed(2) : 'S/ 0.00'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Resumen por Método de Pago -->
                    <div class="resumen-metodos">
                        <h3>💰 DESGLOSE DETALLADO POR MÉTODO DE PAGO</h3>
                        
                        <div class="metodo-pago">
                            <span><strong>💵 Efectivo (Cash):</strong></span>
                            <span style="font-weight: bold; color: #28a745;">${efectivo}</span>
                        </div>
                        
                        <div class="metodo-pago">
                            <span><strong>💳 Tarjeta Crédito/Débito:</strong></span>
                            <span style="font-weight: bold; color: #007bff;">${tarjeta}</span>
                        </div>
                        
                        <div class="metodo-pago">
                            <span><strong>📱 Yape / Plin (Transferencias):</strong></span>
                            <span style="font-weight: bold; color: #9c27b0;">${yape}</span>
                        </div>
                        
                        <div class="metodo-pago destacado">
                            <span>💎 TOTAL GENERAL EN CAJA:</span>
                            <span>${totalCaja}</span>
                        </div>
                    </div>
                    
                    <!-- Observaciones -->
                    <div class="info-section">
                        <div class="info-row">
                            <span class="info-label">📝 Observaciones:</span>
                            <span class="info-value">_________________________________________________</span>
                        </div>
                        <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 5px;">
                            <p style="font-size: 13px; color: #666; margin: 0;">
                                <strong>Notas Adicionales:</strong><br>
                                ________________________________________________________________<br>
                                ________________________________________________________________<br>
                                ________________________________________________________________
                            </p>
                        </div>
                    </div>
                    
                    <!-- Sección de Firmas -->
                    <div class="firma-section">
                        <div class="firma-box">
                            <div class="firma-linea"></div>
                            <p><strong>Firma del Vendedor/Cajero</strong></p>
                            <p style="font-size: 13px; color: #666;">${vendedor}</p>
                            <p style="font-size: 11px; color: #999;">Elaboró y Verificó</p>
                        </div>
                        
                        <div class="firma-box">
                            <div class="firma-linea"></div>
                            <p><strong>Firma del Supervisor/Gerente</strong></p>
                            <p style="font-size: 13px; color: #666;">Autorización y Visto Bueno</p>
                            <p style="font-size: 11px; color: #999;">Revisó y Aprobó</p>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div class="footer">
                        <p style="font-weight: bold; color: #ff7f00; margin-bottom: 10px;">
                            ⚠️ DOCUMENTO CONFIDENCIAL - USO INTERNO EXCLUSIVO
                        </p>
                        <p class="nota">
                            Este documento constituye un comprobante interno de arqueo de caja y control de efectivo.<br>
                            Los datos presentados son de carácter confidencial y para uso administrativo exclusivo.<br>
                            Generado automáticamente por el Sistema POS - La Ruta del Sabor<br>
                            <strong>© ${new Date().getFullYear()} La Ruta del Sabor - Todos los derechos reservados</strong><br>
                            Documento generado el ${new Date().toLocaleString('es-ES')}
                        </p>
                    </div>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
        
        ventanaImpresion.document.close();
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