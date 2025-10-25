document.addEventListener("DOMContentLoaded", () => {
  // --- Constantes y selección de elementos del DOM ---
  // Define la URL base para las peticiones a la API.
  const API_URL = "https://hamburguer-xmx8.onrender.com/api";

  // Elementos para mostrar los costos del pedido.
  const subtotalElement = document.getElementById("subtotal");
  const deliveryCostElement = document.getElementById("delivery-cost");
  const totalElement = document.getElementById("total");

  // Botón para procesar el pedido.
  const btnProcesar = document.getElementById("btn-procesar");

  // Opciones de tipo de comprobante y sus contenedores.
  const boletaRadio = document.getElementById("boleta");
  const facturaRadio = document.getElementById("factura");
  const dniContainer = document.getElementById("dni-container");
  const rucContainer = document.getElementById("ruc-container");

  // Opciones de método de entrega y sus contenedores.
  const deliveryRadio = document.getElementById("delivery");
  const recogerRadio = document.getElementById("recoger");
  const direccionContainer = document.getElementById("direccion-container");
  const referenciaContainer = document.getElementById("referencia-container");

  // Opciones de método de pago y sus contenedores.
  const tarjetaRadio = document.getElementById("tarjeta");
  const yapeRadio = document.getElementById("yape");
  const tarjetaContainer = document.getElementById("tarjeta-container");
  const fechaVencimientoContainer = document.getElementById("fecha-vencimiento-container");
  const titularContainer = document.getElementById("titular-container");
  const cvvContainer = document.getElementById("cvv-container");
  const yapeNumeroContainer = document.getElementById("yape-numero-container");
  const yapeCodigoContainer = document.getElementById("yape-codigo-container");

  // Barra de progreso del formulario multi-paso.
  const progressBar = document.getElementById("progress-bar");

  // Campos de entrada específicos para validación.
  const dniInput = document.getElementById("dni");
  const rucInput = document.getElementById("ruc");
  const numeroTarjetaInput = document.getElementById("numero-tarjeta");
  const fechaVencimientoInput = document.getElementById("fecha-vencimiento");
  const telefonoInput = document.getElementById("telefono");

  // --- Variables de estado ---
  // Carga el carrito desde localStorage o lo inicializa vacío.
  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  // Controla el paso actual del formulario multi-paso.
  let currentStep = 1;
  // Costo fijo del delivery.
  let deliveryCost = 5.00;

  /**
   * Intenta precargar los datos del usuario en el formulario.
   * Primero busca en localStorage, luego en la API si hay un token.
   */
  function fetchUserData() {
    const token = localStorage.getItem("token");
    const userData = JSON.parse(localStorage.getItem("user"));

    // Asegura que los campos de usuario sean editables.
    document.getElementById("nombre").readOnly = false;
    document.getElementById("apellido").readOnly = false;
    document.getElementById("correo").readOnly = false;
    document.getElementById("telefono").readOnly = false;

    // Si hay datos de usuario en localStorage, los precarga.
    if (userData) {
      document.getElementById("nombre").value = userData.nombre.split(" ")[0] || "";
      document.getElementById("apellido").value = userData.nombre.split(" ").slice(1).join(" ") || "";
      document.getElementById("correo").value = userData.email || "";
      document.getElementById("telefono").value = userData.telefono || "";
      return; // Sale de la función si los datos de localStorage se usaron.
    }

    // Si no hay datos en localStorage pero sí un token, intenta obtener los datos de la API.
    if (token) {
      fetch(`${API_URL}/user`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Envía el token para autenticación.
        },
      })
        .then(response => response.json())
        .then(data => {
          // Si la respuesta de la API es exitosa y contiene datos de usuario, los precarga.
          if (data.success && data.user) {
            document.getElementById("nombre").value = data.user.nombres || "";
            document.getElementById("apellido").value = data.user.apellidos || "";
            document.getElementById("correo").value = data.user.email || "";
            document.getElementById("telefono").value = data.user.telefono || "";
          }
        })
        .catch(error => {
          console.error("Error fetching user data:", error);
        });
    }
  }

  /**
   * Actualiza los valores de subtotal, costo de envío y total en la interfaz.
   * Depende del método de entrega seleccionado para incluir el costo de delivery.
   */
  function updateTotal() {
    // Calcula el subtotal sumando el precio * cantidad de cada ítem en el carrito.
    const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    // Calcula el total: subtotal + costo de delivery si el delivery está seleccionado, de lo contrario solo el subtotal.
    const total = deliveryRadio.checked ? subtotal + deliveryCost : subtotal;

    // Actualiza los elementos HTML con los valores calculados, formateados a 2 decimales.
    subtotalElement.textContent = subtotal.toFixed(2);
    deliveryCostElement.textContent = deliveryRadio.checked ? deliveryCost.toFixed(2) : "0.00";
    totalElement.textContent = total.toFixed(2);
  }

  /**
   * Muestra u oculta los campos de DNI/RUC según el tipo de comprobante seleccionado.
   */
  function toggleComprobanteFields() {
    if (boletaRadio.checked) {
      // Si se selecciona "Boleta", muestra el campo DNI y lo hace requerido.
      dniContainer.classList.remove("d-none");
      rucContainer.classList.add("d-none");
      dniInput.required = true;
      rucInput.required = false;
    } else {
      // Si se selecciona "Factura", muestra el campo RUC y lo hace requerido.
      dniContainer.classList.add("d-none");
      rucContainer.classList.remove("d-none");
      dniInput.required = false;
      rucInput.required = true;
    }
  }

  /**
   * Muestra u oculta los campos de dirección/referencia según el método de entrega.
   * También actualiza el total para incluir o no el costo de delivery.
   */
  function toggleEntregaFields() {
    if (deliveryRadio.checked) {
      // Si se selecciona "Delivery", muestra los campos de dirección y referencia y los hace requeridos.
      direccionContainer.classList.remove("d-none");
      referenciaContainer.classList.remove("d-none");
      document.getElementById("direccion").required = true;
      document.getElementById("referencia").required = true;
    } else {
      // Si se selecciona "Recoger", oculta los campos de dirección y referencia y los hace opcionales.
      direccionContainer.classList.add("d-none");
      referenciaContainer.classList.add("d-none");
      document.getElementById("direccion").required = false;
      document.getElementById("referencia").required = false;
    }
    // Llama a updateTotal para recalcular el costo total (con/sin delivery).
    updateTotal();
  }

  /**
   * Muestra u oculta los campos de pago de tarjeta o Yape según el método seleccionado.
   */
  function togglePagoFields() {
    if (tarjetaRadio.checked) {
      // Si se selecciona "Tarjeta", muestra los campos de tarjeta y los hace requeridos.
      tarjetaContainer.classList.remove("d-none");
      fechaVencimientoContainer.classList.remove("d-none");
      titularContainer.classList.remove("d-none");
      cvvContainer.classList.remove("d-none");
      yapeNumeroContainer.classList.add("d-none"); // Oculta los campos de Yape.
      yapeCodigoContainer.classList.add("d-none");
      numeroTarjetaInput.required = true;
      fechaVencimientoInput.required = true;
      document.getElementById("titular").required = true;
      document.getElementById("cvv").required = true; // Asegura que el campo CVV sea requerido.
      document.getElementById("yape-numero").required = false;
      document.getElementById("yape-codigo").required = false;
    } else {
      // Si se selecciona "Yape", muestra los campos de Yape y los hace requeridos.
      tarjetaContainer.classList.add("d-none"); // Oculta los campos de tarjeta.
      fechaVencimientoContainer.classList.add("d-none");
      titularContainer.classList.add("d-none");
      cvvContainer.classList.add("d-none");
      yapeNumeroContainer.classList.remove("d-none");
      yapeCodigoContainer.classList.remove("d-none");
      numeroTarjetaInput.required = false;
      fechaVencimientoInput.required = false;
      document.getElementById("titular").required = false;
      document.getElementById("cvv").required = false; // Asegura que el campo CVV no sea requerido.
      document.getElementById("yape-numero").required = true;
      document.getElementById("yape-codigo").required = true;
    }
  }

  /**
   * Valida los campos requeridos y el formato de ciertos inputs para un paso específico del formulario.
   * @param {number} step - El número del paso a validar.
   * @returns {boolean} - True si todos los campos son válidos, false en caso contrario.
   */
  function validateStep(step) {
    // Selecciona todos los inputs requeridos dentro del paso actual.
    const inputs = document.querySelectorAll(`#step-${step} input[required]`);
    let isValid = true; // Asume que el paso es válido inicialmente.

    for (let input of inputs) {
      // Validación básica: comprueba si el campo está vacío.
      if (!input.value.trim()) {
        input.classList.add("is-invalid"); // Marca el campo como inválido visualmente.
        isValid = false;
      } else {
        input.classList.remove("is-invalid"); // Remueve el estado inválido.
      }

      // Validaciones específicas para formato numérico y fechas.
      if (input.id === "dni" && input.value && !/^[0-9]{8}$/.test(input.value)) {
        input.classList.add("is-invalid");
        input.setCustomValidity("DNI debe tener 8 dígitos numéricos");
        isValid = false;
      } else if (input.id === "ruc" && input.value && !/^[0-9]{11}$/.test(input.value)) {
        input.classList.add("is-invalid");
        input.setCustomValidity("RUC debe tener 11 dígitos numéricos");
        isValid = false;
      } else if (input.id === "numero-tarjeta" && input.value && !/^[0-9]{16}$/.test(input.value)) {
        input.classList.add("is-invalid");
        input.setCustomValidity("Número de tarjeta debe tener 16 dígitos numéricos");
        isValid = false;
      } else if (input.id === "telefono" && input.value && !/^[0-9]{9}$/.test(input.value)) {
        input.classList.add("is-invalid");
        input.setCustomValidity("Teléfono debe tener 9 dígitos numéricos");
        isValid = false;
      } else if (input.id === "fecha-vencimiento" && input.value) {
        const match = input.value.match(/^(0[1-9]|1[0-2])\/([0-9]{2})$/);
        if (!match) {
          input.classList.add("is-invalid");
          input.setCustomValidity("Fecha de vencimiento debe ser MM/YY (ej. 07/25)");
          isValid = false;
        } else {
          const [_, month, year] = match;
          // Crea una fecha de vencimiento. Se asume año 20xx.
          const inputDate = new Date(`20${year}-${month}-01`);
          // Fecha actual para comparación (Importante: debe ser dinámica en un entorno real).
          const currentDate = new Date('2025-07-01'); // Hardcoded as per prompt context (Ica, July 1, 2025)
          if (inputDate < currentDate) {
            input.classList.add("is-invalid");
            input.setCustomValidity("Fecha de vencimiento debe ser posterior a julio de 2025");
            isValid = false;
          } else {
            input.classList.remove("is-invalid");
            input.setCustomValidity(""); // Limpia el mensaje de validación personalizado.
          }
        }
      } else {
        // Limpia el estado de validación si el campo es válido.
        input.classList.remove("is-invalid");
        input.setCustomValidity("");
      }
    }
    return isValid;
  }

  /**
   * Avanza al siguiente paso del formulario. Realiza validación antes de avanzar.
   * @param {number} step - El número del paso actual desde el cual se avanza.
   */
window.nextStep = function (step) {
    if (validateStep(step)) { // Si el paso actual es válido
        // Oculta el paso actual
        document.getElementById(`step-${step}`).classList.remove("active");
        document.getElementById(`step-${step}`).classList.add("d-none");
        currentStep++; // Incrementa el número del paso
        // Muestra el siguiente paso
        document.getElementById(`step-${currentStep}`).classList.remove("d-none", "oculto"); // Elimina ambas clases
        document.getElementById(`step-${currentStep}`).classList.add("active");
        // Actualiza la barra de progreso
        progressBar.style.width = `${(currentStep / 3) * 100}%`;
        progressBar.textContent = `Paso ${currentStep} de 3`;
    } else {
        alert("Por favor, completa todos los campos requeridos correctamente.");
    }
};

  /**
   * Retrocede al paso anterior del formulario.
   * @param {number} step - El número del paso actual desde el cual se retrocede.
   */
  window.prevStep = function (step) {
    // Oculta el paso actual.
    document.getElementById(`step-${step}`).classList.remove("active");
    document.getElementById(`step-${step}`).classList.add("d-none");
    currentStep--; // Decrementa el número del paso.
    // Muestra el paso anterior.
    document.getElementById(`step-${currentStep}`).classList.remove("oculto", "d-none");
    document.getElementById(`step-${currentStep}`).classList.add("active");
    // Actualiza la barra de progreso.
    progressBar.style.width = `${(currentStep / 3) * 100}%`;
    progressBar.textContent = `Paso ${currentStep} de 3`;
  };

  /**
   * Procesa el pago y envía la orden a la API.
   * Recolecta todos los datos del formulario, los valida y realiza una petición POST.
   */
  async function procesarPago() {
    // Valida el último paso antes de procesar el pago.
    if (!validateStep(3)) {
      alert("Por favor, completa todos los campos requeridos correctamente.");
      return;
    }

    // Verifica si el usuario está autenticado.
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Necesitas iniciar sesión para poder confirmar tu pedido.");
      window.location.href = "login.html"; // Redirige a la página de login si no hay token.
      return;
    }

    // Verifica si el carrito está vacío.
    if (carrito.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    // --- Recolección de datos del formulario ---
    const cliente = {
      nombres: document.getElementById("nombre").value,
      apellidos: document.getElementById("apellido").value,
      email: document.getElementById("correo").value,
      telefono: document.getElementById("telefono").value,
      comprobante: boletaRadio.checked ? "boleta" : "factura",
      dni: boletaRadio.checked ? dniInput.value : "",
      ruc: facturaRadio.checked ? rucInput.value : "",
    };

    const entrega = {
      metodo: deliveryRadio.checked ? "delivery" : "recoger",
      direccion: deliveryRadio.checked ? document.getElementById("direccion").value : "",
      referencia: deliveryRadio.checked ? document.getElementById("referencia").value : "",
    };

    const pago = {
      metodo: tarjetaRadio.checked ? "tarjeta" : "yape",
      numero_tarjeta: tarjetaRadio.checked ? numeroTarjetaInput.value : "",
      fecha_vencimiento: tarjetaRadio.checked ? fechaVencimientoInput.value : "",
      titular: tarjetaRadio.checked ? document.getElementById("titular").value : "",
      cvv: tarjetaRadio.checked ? document.getElementById("cvv").value : "",
      yape_numero: yapeRadio.checked ? document.getElementById("yape-numero").value : "",
      yape_codigo: yapeRadio.checked ? document.getElementById("yape-codigo").value : "",
    };

    // Mapea los ítems del carrito al formato esperado por la API de órdenes.
    const orderItems = carrito.map((item) => ({
      producto: item._id, // ID del producto en la base de datos.
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
      subtotal: item.precio * item.cantidad,
    }));

    // Calcula el total final del pedido, incluyendo el costo de delivery si aplica.
    const total = deliveryRadio.checked ?
      carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0) + deliveryCost :
      carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

    // Deshabilita el botón de procesamiento y cambia su texto para indicar que se está procesando.
    btnProcesar.disabled = true;
    btnProcesar.textContent = "Procesando...";

    try {
      // Realiza la petición POST a la API para crear una nueva orden.
      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Envía el token de autenticación.
        },
        // Envía los datos del pedido en formato JSON.
        body: JSON.stringify({
          items: orderItems,
          total: total,
          cliente: cliente,
          entrega: entrega,
          pago: pago,
        }),
      });

      const data = await response.json(); // Parsea la respuesta JSON de la API.

      if (data.success) {
        // Si el pedido se procesó exitosamente:
        // Guarda los detalles del último pedido en localStorage para la página de confirmación.
        localStorage.setItem("ultimo_pedido", JSON.stringify({
          cliente: cliente,
          entrega: entrega,
          items: orderItems,
          total: total,
          deliveryCost: deliveryRadio.checked ? deliveryCost : 0,
        }));
        // Limpia el carrito de localStorage.
        localStorage.removeItem("carrito");
        // Redirige a la página de confirmación.
        window.location.href = "confirmacion.html";
      } else {
        // Si la API devuelve un error, muestra una alerta.
        alert(`Error al procesar el pedido: ${data.msg}`);
        // Habilita y restaura el texto del botón.
        btnProcesar.disabled = false;
        btnProcesar.textContent = "Procesar Pago";
      }
    } catch (error) {
      // Captura errores de red o del servidor y muestra una alerta genérica.
      console.error("Error al procesar pago:", error);
      alert("Hubo un error de conexión. Por favor, intenta de nuevo.");
      // Habilita y restaura el texto del botón.
      btnProcesar.disabled = false;
      btnProcesar.textContent = "Procesar Pago";
    }
  }

  // --- Escuchadores de eventos para validación en tiempo real (input event) ---
  // Estos escuchadores validan los campos a medida que el usuario escribe.
  dniInput.addEventListener("input", () => {
    if (dniInput.value && !/^[0-9]{8}$/.test(dniInput.value)) {
      dniInput.classList.add("is-invalid");
      dniInput.setCustomValidity("DNI debe tener 8 dígitos numéricos");
    } else {
      dniInput.classList.remove("is-invalid");
      dniInput.setCustomValidity("");
    }
  });

  rucInput.addEventListener("input", () => {
    if (rucInput.value && !/^[0-9]{11}$/.test(rucInput.value)) {
      rucInput.classList.add("is-invalid");
      rucInput.setCustomValidity("RUC debe tener 11 dígitos numéricos");
    } else {
      rucInput.classList.remove("is-invalid");
      rucInput.setCustomValidity("");
    }
  });

  numeroTarjetaInput.addEventListener("input", () => {
    if (numeroTarjetaInput.value && !/^[0-9]{16}$/.test(numeroTarjetaInput.value)) {
      numeroTarjetaInput.classList.add("is-invalid");
      numeroTarjetaInput.setCustomValidity("Número de tarjeta debe tener 16 dígitos numéricos");
    } else {
      numeroTarjetaInput.classList.remove("is-invalid");
      numeroTarjetaInput.setCustomValidity("");
    }
  });

  telefonoInput.addEventListener("input", () => {
    if (telefonoInput.value && !/^[0-9]{9}$/.test(telefonoInput.value)) {
      telefonoInput.classList.add("is-invalid");
      telefonoInput.setCustomValidity("Teléfono debe tener 9 dígitos numéricos");
    } else {
      telefonoInput.classList.remove("is-invalid");
      telefonoInput.setCustomValidity("");
    }
  });

  // Validación y formateo de la fecha de vencimiento de la tarjeta (MM/YY).
  fechaVencimientoInput.addEventListener("input", () => {
    let value = fechaVencimientoInput.value.replace(/[^0-9]/g, ""); // Elimina no-dígitos.
    if (value.length >= 2) {
      const month = value.slice(0, 2);
      if (parseInt(month) >= 1 && parseInt(month) <= 12) {
        value = `${month}/${value.slice(2)}`; // Añade el '/' después del mes.
        fechaVencimientoInput.value = value;
      } else {
        fechaVencimientoInput.classList.add("is-invalid");
        fechaVencimientoInput.setCustomValidity("Mes debe ser entre 01 y 12");
        return;
      }
    } else {
      fechaVencimientoInput.value = value;
    }

    const match = value.match(/^(0[1-9]|1[0-2])\/([0-9]{2})$/);
    if (!match && value.length >= 5) {
      fechaVencimientoInput.classList.add("is-invalid");
      fechaVencimientoInput.setCustomValidity("Fecha de vencimiento debe ser MM/YY (ej. 07/25)");
    } else if (match) {
      const [_, month, year] = match;
      const inputDate = new Date(`20${year}-${month}-01`);
      const currentDate = new Date('2025-07-01'); // Fecha actual hardcoded (debería ser dinámica).
      if (inputDate < currentDate) {
        fechaVencimientoInput.classList.add("is-invalid");
        fechaVencimientoInput.setCustomValidity("Fecha de vencimiento debe ser posterior a julio de 2025");
      } else {
        fechaVencimientoInput.classList.remove("is-invalid");
        fechaVencimientoInput.setCustomValidity("");
      }
    } else {
      fechaVencimientoInput.classList.remove("is-invalid");
      fechaVencimientoInput.setCustomValidity("");
    }
  });

  // --- Escuchadores de eventos para toggles de campos ---
  // Cambian la visibilidad y requerimiento de campos según la opción seleccionada.
  boletaRadio.addEventListener("change", toggleComprobanteFields);
  facturaRadio.addEventListener("change", toggleComprobanteFields);
  deliveryRadio.addEventListener("change", toggleEntregaFields);
  recogerRadio.addEventListener("change", toggleEntregaFields);
  tarjetaRadio.addEventListener("change", togglePagoFields);
  yapeRadio.addEventListener("change", togglePagoFields);

  // --- Escuchador de evento para el botón final de procesamiento ---
  btnProcesar.addEventListener("click", procesarPago);


    // Fetch user data on load
    fetchUserData();
    updateTotal();
    toggleComprobanteFields();
    toggleEntregaFields();
    togglePagoFields();
});