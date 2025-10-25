document.addEventListener("DOMContentLoaded", () => {
  // Selecciona los elementos del DOM que se van a actualizar con la información del pedido.
  const pedidoGrid = document.getElementById("pedido-grid");
  const mensajeEntrega = document.getElementById("mensaje-entrega");
  const clienteNombre = document.getElementById("cliente-nombre");
  const comprobanteElement = document.getElementById("comprobante");
  const subtotalElement = document.getElementById("subtotal");
  const deliveryCostElement = document.getElementById("delivery-cost");
  const totalElement = document.getElementById("total");
  const confirmacionHeader = document.getElementById("confirmacion-header");

  // Recupera el último pedido guardado en el localStorage. Si no existe, inicializa un objeto vacío.
  const ultimoPedido = JSON.parse(localStorage.getItem("ultimo_pedido")) || {};

  /**
   * Muestra el resumen del pedido en la página de confirmación.
   */
  function mostrarResumen() {
    // Si no hay ítems en el pedido, muestra un mensaje y termina la función.
    if (!ultimoPedido.items || ultimoPedido.items.length === 0) {
      pedidoGrid.innerHTML = "<p>No hay items en el pedido.</p>";
      return;
    }

    // Actualiza el encabezado con el nombre del cliente.
    confirmacionHeader.textContent = `Pedido Confirmado, ${ultimoPedido.cliente.nombres} ${ultimoPedido.cliente.apellidos}`;

    // Limpia el contenedor y añade cada ítem del pedido dinámicamente.
    pedidoGrid.innerHTML = "";
    ultimoPedido.items.forEach((item) => {
      const itemElement = document.createElement("div");
      itemElement.className = "columna-pedido margen-inferior-mediano";
      itemElement.innerHTML = `
        <div class="tarjeta-pedido cuerpo-tarjeta sombra-pequena">
          <img src="${item.imagen}" alt="${item.nombre}" 
          class="card-img-top carrito-img" 
          onerror="this.onerror=null;this.src='https://placehold.co/600x400/CCCCCC/FFFFFF?text=${item.nombre}';">
          <h5 class="titulo-tarjeta">${item.nombre}</h5>
          <p class="texto-tarjeta">Precio: S/ ${item.precio.toFixed(2)}</p>
          <p class="texto-tarjeta">Cantidad: ${item.cantidad}</p>
          <p class="texto-tarjeta">Subtotal: S/ ${item.subtotal.toFixed(2)}</p>
        </div>
      `;
      pedidoGrid.appendChild(itemElement);
    });

    // Rellena los detalles del cliente y los costos del pedido.
    clienteNombre.textContent = `${ultimoPedido.cliente.nombres} ${ultimoPedido.cliente.apellidos}`;
    comprobanteElement.textContent =
      ultimoPedido.cliente.comprobante === "boleta"
        ? `Boleta (DNI: ${ultimoPedido.cliente.dni})`
        : `Factura (RUC: ${ultimoPedido.cliente.ruc})`;
    subtotalElement.textContent = ultimoPedido.items
      .reduce((sum, item) => sum + item.subtotal, 0)
      .toFixed(2);
    deliveryCostElement.textContent = ultimoPedido.deliveryCost.toFixed(2);
    totalElement.textContent = ultimoPedido.total.toFixed(2);

    // Muestra el mensaje de entrega según el método seleccionado.
    mensajeEntrega.textContent =
      ultimoPedido.entrega.metodo === "delivery"
        ? "Tu pedido llegará en aproximadamente 15-30 minutos."
        : "Tu pedido estará listo para recojo en aproximadamente 15 minutos.";
  }

  // Muestra el resumen del pedido al cargar la página.
  mostrarResumen();
});