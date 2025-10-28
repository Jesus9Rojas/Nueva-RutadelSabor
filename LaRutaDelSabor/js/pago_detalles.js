// ==========================================
// GOOGLE PAY CONFIGURATION
// ==========================================

const merchantInfo = {
  merchantId: '12345678901234567890',
  merchantName: 'La Ruta del Sabor'
};

const baseGooglePayRequest = {
  apiVersion: 2,
  apiVersionMinor: 0,
  allowedPaymentMethods: [
    {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
        allowedCardNetworks: ["AMEX", "DISCOVER", "MASTERCARD", "VISA"]
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          gateway: 'example',
          gatewayMerchantId: 'exampleGatewayMerchantId'
        }
      }
    }
  ],
  merchantInfo
};

Object.freeze(baseGooglePayRequest);

let paymentsClient = null;
let googlePayToken = null;

function getGooglePaymentsClient() {
  if (paymentsClient === null) {
    paymentsClient = new google.payments.api.PaymentsClient({
      environment: 'TEST', // Cambiar a 'PRODUCTION' en producción
      merchantInfo
    });
  }
  return paymentsClient;
}

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

function onGooglePayLoaded() {
  const req = deepCopy(baseGooglePayRequest);
  
  getGooglePaymentsClient()
    .isReadyToPay(req)
    .then(function(res) {
      if (res.result) {
        console.log('Google Pay está disponible');
      } else {
        console.log('Google Pay no está disponible para este usuario');
      }
    })
    .catch(console.error);
}

function renderGooglePayButton(totalAmount) {
  const container = document.getElementById('gpay-container');
  container.innerHTML = '';
  
  const button = getGooglePaymentsClient().createButton({
    onClick: () => onGooglePaymentButtonClicked(totalAmount),
    buttonColor: 'black',
    buttonType: 'pay',
    buttonSizeMode: 'fill'
  });

  container.appendChild(button);
  container.classList.add('active');
}

function onGooglePaymentButtonClicked(totalAmount) {
  const req = {
    ...deepCopy(baseGooglePayRequest),
    transactionInfo: {
      countryCode: 'PE',
      currencyCode: 'PEN',
      totalPriceStatus: 'FINAL',
      totalPrice: totalAmount.toFixed(2),
    }
  };

  console.log('Solicitud Google Pay:', req);

  getGooglePaymentsClient()
    .loadPaymentData(req)
    .then(function (res) {
      console.log('Respuesta Google Pay:', res);
      googlePayToken = res.paymentMethodData.tokenizationData.token;
      
      document.getElementById('pago-exitoso').classList.add('active');
      document.getElementById('gpay-container').style.display = 'none';
      document.getElementById('campos-tarjeta-manual').style.display = 'none';
      
      // Deshabilitar campos manuales ya que se usó Google Pay
      document.getElementById('numero-tarjeta').required = false;
      document.getElementById('fecha-vencimiento').required = false;
      document.getElementById('cvv').required = false;
      document.getElementById('titular').required = false;
    })
    .catch(function(err) {
      console.error('Error en Google Pay:', err);
      alert('Error al procesar el pago con Google Pay. Puedes ingresar los datos manualmente.');
    });
}

// ==========================================
// SISTEMA DE PAGO - PAGO_DETALLES.JS
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  // --- Constantes y selección de elementos del DOM ---
  const API_URL = "https://hamburguer-xmx8.onrender.com/api";

  // Elementos para mostrar los costos del pedido
  const subtotalElement = document.getElementById("subtotal");
  const deliveryCostElement = document.getElementById("delivery-cost");
  const totalElement = document.getElementById("total");

  // Botón para procesar el pedido
  const btnProcesar = document.getElementById("btn-procesar");

  // Opciones de tipo de comprobante y sus contenedores
  const boletaRadio = document.getElementById("boleta");
  const facturaRadio = document.getElementById("factura");
  const dniContainer = document.getElementById("dni-container");
  const rucContainer = document.getElementById("ruc-container");

  // Opciones de método de entrega y sus contenedores
  const deliveryRadio = document.getElementById("delivery");
  const recogerRadio = document.getElementById("recoger");
  const direccionContainer = document.getElementById("direccion-container");
  const referenciaContainer = document.getElementById("referencia-container");
  const localInfo = document.getElementById("local-info");

  // Opciones de método de pago y sus contenedores
  const tarjetaRadio = document.getElementById("tarjeta");
  const yapeRadio = document.getElementById("yape");
  const tarjetaSection = document.getElementById("tarjeta-section");
  const yapeNumeroContainer = document.getElementById("yape-numero-container");
  const yapeCodigoContainer = document.getElementById("yape-codigo-container");

  // Barra de progreso del formulario multi-paso
  const progressBar = document.getElementById("progress-bar");

  // Campos de entrada específicos para validación
  const dniInput = document.getElementById("dni");
  const rucInput = document.getElementById("ruc");
  const numeroTarjetaInput = document.getElementById("numero-tarjeta");
  const fechaVencimientoInput = document.getElementById("fecha-vencimiento");
  const telefonoInput = document.getElementById("telefono");

  // --- Variables de estado ---
  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  let currentStep = 1;
  let deliveryCost = 5.00;

  /**
   * Intenta precargar los datos del usuario en el formulario.
   */
  function fetchUserData() {
    const token = localStorage.getItem("token");
    const userData = JSON.parse(localStorage.getItem("user"));

    document.getElementById("nombre").readOnly = false;
    document.getElementById("apellido").readOnly = false;
    document.getElementById("correo").readOnly = false;
    document.getElementById("telefono").readOnly = false;

    if (userData) {
      document.getElementById("nombre").value = userData.nombre.split(" ")[0] || "";
      document.getElementById("apellido").value = userData.nombre.split(" ").slice(1).join(" ") || "";
      document.getElementById("correo").value = userData.email || "";
      document.getElementById("telefono").value = userData.telefono || "";
      return;
    }

    if (token) {
      fetch(`${API_URL}/user`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then(response => response.json())
        .then(data => {
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
   */
  function updateTotal() {
    const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const total = deliveryRadio.checked ? subtotal + deliveryCost : subtotal;

    subtotalElement.textContent = subtotal.toFixed(2);
    deliveryCostElement.textContent = deliveryRadio.checked ? deliveryCost.toFixed(2) : "0.00";
    totalElement.textContent = total.toFixed(2);
    
    // Actualizar el monto en la sección de Google Pay
    document.getElementById('monto-gpay').textContent = total.toFixed(2);
    
    // Si Google Pay está activo, actualizar el botón
    if (tarjetaRadio.checked && document.getElementById('gpay-container').classList.contains('active')) {
      renderGooglePayButton(total);
    }
  }

  /**
   * Muestra u oculta los campos de DNI/RUC según el tipo de comprobante.
   */
  function toggleComprobanteFields() {
    if (boletaRadio.checked) {
      dniContainer.classList.remove("d-none");
      rucContainer.classList.add("d-none");
      dniInput.required = true;
      rucInput.required = false;
    } else {
      dniContainer.classList.add("d-none");
      rucContainer.classList.remove("d-none");
      dniInput.required = false;
      rucInput.required = true;
    }
  }

  /**
   * Muestra u oculta los campos de dirección según el método de entrega.
   */
  function toggleEntregaFields() {
    if (deliveryRadio.checked) {
      direccionContainer.classList.remove("d-none");
      referenciaContainer.classList.remove("d-none");
      localInfo.classList.remove("active");
      document.getElementById("direccion").required = true;
      document.getElementById("referencia").required = true;
    } else {
      direccionContainer.classList.add("d-none");
      referenciaContainer.classList.add("d-none");
      localInfo.classList.add("active");
      document.getElementById("direccion").required = false;
      document.getElementById("referencia").required = false;
    }
    updateTotal();
  }

  /**
   * Muestra u oculta los campos de pago según el método seleccionado.
   */
  function togglePagoFields() {
    if (tarjetaRadio.checked) {
      tarjetaSection.classList.remove("d-none");
      yapeNumeroContainer.classList.add("d-none");
      yapeCodigoContainer.classList.add("d-none");
      document.getElementById("yape-numero").required = false;
      document.getElementById("yape-codigo").required = false;
      
      // Renderizar botón de Google Pay
      const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
      const totalFinal = deliveryRadio.checked ? total + deliveryCost : total;
      
      setTimeout(() => {
        renderGooglePayButton(totalFinal);
      }, 100);
    } else {
      tarjetaSection.classList.add("d-none");
      yapeNumeroContainer.classList.remove("d-none");
      yapeCodigoContainer.classList.remove("d-none");
      document.getElementById("yape-numero").required = true;
      document.getElementById("yape-codigo").required = true;
      
      // Ocultar Google Pay
      document.getElementById('gpay-container').classList.remove('active');
      document.getElementById('pago-exitoso').classList.remove('active');
    }
  }

  /**
   * Valida los campos requeridos para un paso específico.
   */
  function validateStep(step) {
    const inputs = document.querySelectorAll(`#step-${step} input[required]`);
    let isValid = true;

    for (let input of inputs) {
      if (!input.value.trim()) {
        input.classList.add("is-invalid");
        isValid = false;
      } else {
        input.classList.remove("is-invalid");
      }

      if (input.id === "dni" && input.value && !/^[0-9]{8}$/.test(input.value)) {
        input.classList.add("is-invalid");
        input.setCustomValidity("DNI debe tener 8 dígitos numéricos");
        isValid = false;
      } else if (input.id === "ruc" && input.value && !/^[0-9]{11}$/.test(input.value)) {
        input.classList.add("is-invalid");
        input.setCustomValidity("RUC debe tener 11 dígitos numéricos");
        isValid = false;
      } else if (input.id === "numero-tarjeta" && input.value && !/^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}$/.test(input.value)) {
        input.classList.add("is-invalid");
        input.setCustomValidity("Número de tarjeta debe tener el formato 1234-5678-9012-3456");
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
          const inputDate = new Date(`20${year}-${month}-01`);
          const currentDate = new Date();
          if (inputDate < currentDate) {
            input.classList.add("is-invalid");
            input.setCustomValidity("Fecha de vencimiento debe ser posterior a la fecha actual");
            isValid = false;
          } else {
            input.classList.remove("is-invalid");
            input.setCustomValidity("");
          }
        }
      } else {
        input.classList.remove("is-invalid");
        input.setCustomValidity("");
      }
    }
    return isValid;
  }

  /**
   * Avanza al siguiente paso del formulario.
   */
  window.nextStep = function (step) {
    if (validateStep(step)) {
      document.getElementById(`step-${step}`).classList.remove("active");
      document.getElementById(`step-${step}`).classList.add("d-none");
      currentStep++;
      document.getElementById(`step-${currentStep}`).classList.remove("d-none", "oculto");
      document.getElementById(`step-${currentStep}`).classList.add("active");
      progressBar.style.width = `${(currentStep / 3) * 100}%`;
      progressBar.textContent = `Paso ${currentStep} de 3`;
    } else {
      alert("Por favor, completa todos los campos requeridos correctamente.");
    }
  };

  /**
   * Retrocede al paso anterior del formulario.
   */
  window.prevStep = function (step) {
    document.getElementById(`step-${step}`).classList.remove("active");
    document.getElementById(`step-${step}`).classList.add("d-none");
    currentStep--;
    document.getElementById(`step-${currentStep}`).classList.remove("oculto", "d-none");
    document.getElementById(`step-${currentStep}`).classList.add("active");
    progressBar.style.width = `${(currentStep / 3) * 100}%`;
    progressBar.textContent = `Paso ${currentStep} de 3`;
  };

  /**
   * Procesa el pago y envía la orden a la API.
   */
  async function procesarPago() {
    // Si se está usando tarjeta y NO se usó Google Pay, validar campos manuales
    if (tarjetaRadio.checked && !googlePayToken) {
      if (!validateStep(3)) {
        alert("Por favor, completa todos los campos requeridos correctamente o usa Google Pay.");
        return;
      }
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Necesitas iniciar sesión para poder confirmar tu pedido.");
      window.location.href = "login.html";
      return;
    }

    if (carrito.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    // Recolección de datos del formulario
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
      direccion: deliveryRadio.checked ? document.getElementById("direccion").value : "MegaPlaza Ica, Av. de los Maestros, Ica",
      referencia: deliveryRadio.checked ? document.getElementById("referencia").value : "Recojo en local",
    };

    const pago = {
      metodo: tarjetaRadio.checked ? "tarjeta" : "yape",
      numero_tarjeta: tarjetaRadio.checked && !googlePayToken ? numeroTarjetaInput.value : "",
      fecha_vencimiento: tarjetaRadio.checked && !googlePayToken ? fechaVencimientoInput.value : "",
      titular: tarjetaRadio.checked && !googlePayToken ? document.getElementById("titular").value : "",
      cvv: tarjetaRadio.checked && !googlePayToken ? document.getElementById("cvv").value : "",
      yape_numero: yapeRadio.checked ? document.getElementById("yape-numero").value : "",
      yape_codigo: yapeRadio.checked ? document.getElementById("yape-codigo").value : "",
      ...(googlePayToken && { googlePayToken: googlePayToken, paymentMethod: 'google_pay' })
    };

    const orderItems = carrito.map((item) => ({
      producto: item._id,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
      subtotal: item.precio * item.cantidad,
      imagen: item.imagen
    }));

    const total = deliveryRadio.checked ?
      carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0) + deliveryCost :
      carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

    btnProcesar.disabled = true;
    btnProcesar.textContent = "Procesando...";

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: orderItems,
          total: total,
          cliente: cliente,
          entrega: entrega,
          pago: pago,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("ultimo_pedido", JSON.stringify({
          cliente: cliente,
          entrega: entrega,
          items: orderItems,
          total: total,
          deliveryCost: deliveryRadio.checked ? deliveryCost : 0,
        }));
        localStorage.removeItem("carrito");
        googlePayToken = null; // Limpiar el token
        window.location.href = "confirmacion.html";
      } else {
        alert(`Error al procesar el pedido: ${data.msg}`);
        btnProcesar.disabled = false;
        btnProcesar.textContent = "Procesar Pago";
      }
    } catch (error) {
      console.error("Error al procesar pago:", error);
      alert("Hubo un error de conexión. Por favor, intenta de nuevo.");
      btnProcesar.disabled = false;
      btnProcesar.textContent = "Procesar Pago";
    }
  }

  // ==========================================
  // VALIDACIONES EN TIEMPO REAL
  // ==========================================

  // Validación DNI
  dniInput.addEventListener("input", () => {
    if (dniInput.value && !/^[0-9]{8}$/.test(dniInput.value)) {
      dniInput.classList.add("is-invalid");
      dniInput.setCustomValidity("DNI debe tener 8 dígitos numéricos");
    } else {
      dniInput.classList.remove("is-invalid");
      dniInput.setCustomValidity("");
    }
  });

  // Validación RUC
  rucInput.addEventListener("input", () => {
    if (rucInput.value && !/^[0-9]{11}$/.test(rucInput.value)) {
      rucInput.classList.add("is-invalid");
      rucInput.setCustomValidity("RUC debe tener 11 dígitos numéricos");
    } else {
      rucInput.classList.remove("is-invalid");
      rucInput.setCustomValidity("");
    }
  });

  // Validación y formateo de número de tarjeta (1234-5678-9012-3456)
  numeroTarjetaInput.addEventListener("input", () => {
    let value = numeroTarjetaInput.value.replace(/[^0-9]/g, "");
    
    // Formatear con guiones cada 4 dígitos
    if (value.length > 0) {
      const chunks = value.match(/.{1,4}/g) || [];
      value = chunks.join("-");
    }
    
    numeroTarjetaInput.value = value;
    
    // Validar formato completo
    if (value && !/^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}$/.test(value)) {
      if (value.replace(/-/g, "").length === 16) {
        numeroTarjetaInput.classList.remove("is-invalid");
        numeroTarjetaInput.setCustomValidity("");
      } else {
        numeroTarjetaInput.classList.add("is-invalid");
        numeroTarjetaInput.setCustomValidity("Número de tarjeta debe tener 16 dígitos");
      }
    } else if (value.replace(/-/g, "").length === 16) {
      numeroTarjetaInput.classList.remove("is-invalid");
      numeroTarjetaInput.setCustomValidity("");
    }
  });

  // Validación teléfono
  telefonoInput.addEventListener("input", () => {
    if (telefonoInput.value && !/^[0-9]{9}$/.test(telefonoInput.value)) {
      telefonoInput.classList.add("is-invalid");
      telefonoInput.setCustomValidity("Teléfono debe tener 9 dígitos numéricos");
    } else {
      telefonoInput.classList.remove("is-invalid");
      telefonoInput.setCustomValidity("");
    }
  });

  // Validación y formateo de fecha de vencimiento (MM/YY)
  fechaVencimientoInput.addEventListener("input", () => {
    let value = fechaVencimientoInput.value.replace(/[^0-9]/g, "");
    
    if (value.length >= 2) {
      const month = value.slice(0, 2);
      if (parseInt(month) >= 1 && parseInt(month) <= 12) {
        value = `${month}/${value.slice(2)}`;
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
      const currentDate = new Date();
      if (inputDate < currentDate) {
        fechaVencimientoInput.classList.add("is-invalid");
        fechaVencimientoInput.setCustomValidity("Fecha de vencimiento debe ser posterior a la fecha actual");
      } else {
        fechaVencimientoInput.classList.remove("is-invalid");
        fechaVencimientoInput.setCustomValidity("");
      }
    } else {
      fechaVencimientoInput.classList.remove("is-invalid");
      fechaVencimientoInput.setCustomValidity("");
    }
  });

  // ==========================================
  // EVENT LISTENERS
  // ==========================================

  boletaRadio.addEventListener("change", toggleComprobanteFields);
  facturaRadio.addEventListener("change", toggleComprobanteFields);
  deliveryRadio.addEventListener("change", toggleEntregaFields);
  recogerRadio.addEventListener("change", toggleEntregaFields);
  tarjetaRadio.addEventListener("change", togglePagoFields);
  yapeRadio.addEventListener("change", togglePagoFields);
  btnProcesar.addEventListener("click", procesarPago);

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  fetchUserData();
  updateTotal();
  toggleComprobanteFields();
  toggleEntregaFields();
  togglePagoFields();
});