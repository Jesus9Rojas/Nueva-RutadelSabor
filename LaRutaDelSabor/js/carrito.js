// Espera a que el DOM esté completamente cargado antes de ejecutar el código principal
document.addEventListener("DOMContentLoaded", () => {
    // Selecciona los elementos del DOM necesarios para interactuar con el carrito
    const carritoGrid = document.getElementById("carrito-grid");
    const subtotalElement = document.getElementById("subtotal");
    const btnComprar = document.getElementById("btn-comprar");
    const btnSeguir = document.getElementById("btn-seguir");

    // Actualiza la visualización del carrito en la página, mostrando productos y subtotal
    function actualizarCarrito() {
        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        carritoGrid.innerHTML = "";
        console.log("Carrito al actualizar:", carrito); // Depuración

        if (carrito.length === 0) {
            carritoGrid.innerHTML = "<p>El carrito está vacío.</p>";
        } else {
            carrito.forEach((item, index) => {
                const itemElement = document.createElement("div");
                itemElement.classList.add("item");
                // Generar un ID único para el input basado en el índice o un identificador único
                const itemId = `cart-${index}-${Date.now()}`; // ID único para evitar conflictos
                itemElement.innerHTML = `
                    <img src="${item.imagen}" alt="${item.nombre}">
                    <div class="item-info">
                        <h3>${item.nombre}</h3>
                        <p class="precio-unitario">S/ ${item.precio.toFixed(2)}</p>
                        <div class="control qty quantity-control quantity-control-initialized">
                            <label for="${itemId}-qty">
                                <span class="label">Cantidad:</span>
                            </label>
                            <button class="qty-control qty-deduce ${item.cantidad === 1 ? 'disabled' : ''}" data-role="qty-deduce" data-index="${index}">
                                <span>-</span>
                            </button>
                            <input id="${itemId}-qty" name="cart[${index}][qty]" data-cart-item-id="${itemId}" value="${item.cantidad}" type="number" size="4" step="1" title="Cantidad" class="input-text qty" data-validate="{required:true,'validate-greater-than-zero':true}" data-item-qty="${item.cantidad}" data-role="cart-item-qty" data-index="${index}">
                            <button class="qty-control qty-add" data-role="qty-add" data-index="${index}">
                                <span>+</span>
                            </button>
                        </div>
                    </div>
                    <button class="eliminar" data-index="${index}">Eliminar<img src="Icon/tacho-eliminar.png" alt=""></button>
                `;
                console.log(`Añadiendo item ${index}: ${item.nombre}`); // Depuración
                carritoGrid.appendChild(itemElement);
            });
        }

        const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
        subtotalElement.textContent = subtotal.toFixed(2);
    }

    // Evento para manejar cambios en la cantidad (input y botones)
    carritoGrid.addEventListener("change", (e) => {
        if (e.target.classList.contains("input-text") && e.target.classList.contains("qty")) {
            const index = parseInt(e.target.dataset.index);
            let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
            const nuevaCantidad = parseInt(e.target.value);
            if (nuevaCantidad >= 1 && !isNaN(index) && index >= 0 && index < carrito.length) {
                carrito[index].cantidad = nuevaCantidad;
                localStorage.setItem("carrito", JSON.stringify(carrito));
                actualizarCarrito(); // Actualiza para reflejar el estado del botón de decremento
            } else {
                console.warn("Cantidad o índice inválido:", nuevaCantidad, index);
                e.target.value = carrito[index].cantidad; // Revertir si es inválido
            }
        }
    });

    // Evento para manejar clics en los botones de incrementar/decrementar
    carritoGrid.addEventListener("click", (e) => {
        if (e.target.closest(".qty-control")) {
            const button = e.target.closest(".qty-control");
            const index = parseInt(button.dataset.index);
            let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
            if (!isNaN(index) && index >= 0 && index < carrito.length) {
                if (button.dataset.role === "qty-add") {
                    carrito[index].cantidad += 1;
                } else if (button.dataset.role === "qty-deduce" && carrito[index].cantidad > 1) {
                    carrito[index].cantidad -= 1;
                }
                localStorage.setItem("carrito", JSON.stringify(carrito));
                actualizarCarrito(); // Actualiza la interfaz
            } else {
                console.warn("Índice inválido:", index);
            }
        }
    });

    // Evento para eliminar un producto del carrito
    carritoGrid.removeEventListener("click", handleClickCarrito); // Evita duplicados
    function handleClickCarrito(e) {
        if (e.target.closest(".eliminar")) {
            e.stopPropagation();
            const index = parseInt(e.target.closest(".eliminar").dataset.index);
            console.log("Índice del botón clicado:", index);
            let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
            console.log("Carrito antes de eliminar:", carrito);
            if (!isNaN(index) && index >= 0 && index < carrito.length) {
                const eliminado = carrito.splice(index, 1);
                console.log("Producto eliminado:", eliminado);
                console.log("Carrito después de eliminar:", carrito);
                localStorage.setItem("carrito", JSON.stringify(carrito));
                actualizarCarrito();
            } else {
                console.warn("Índice inválido:", index);
            }
        }
    }
    carritoGrid.addEventListener("click", handleClickCarrito);

    // Evento para el botón "Comprar": redirige a la página de pago si el carrito no está vacío
    btnComprar.addEventListener("click", () => {
        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        if (carrito.length === 0) {
            alert("No puedes ir a pagar porque el carrito está vacío.");
            return;
        }
        window.location.href = "pago_detalles.html";
    });

    // Evento para el botón "Seguir comprando": redirige a la página del menú
    btnSeguir.addEventListener("click", () => {
        window.location.href = "menu.html";
    });

    // Inicializa el carrito al cargar la página
    actualizarCarrito();
    renderAuthButtons();
});

// Renderiza los botones de autenticación según el estado del usuario (admin o normal)
function renderAuthButtons() {
    const authButtons = document.getElementById('botones-autenticacion');
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    authButtons.innerHTML = '';

    if (token && user && user.email === 'test@test.com') {
        authButtons.innerHTML = `
            <div class="registro">
                <a href="admin.html" class="admin-btn">
                    <i class="bi bi-basket-fill"></i> Registrar Productos
                </a>
            </div>
            <div class="registro">
                <a href="#" onclick="logout()" class="admin-btn">
                    <i class="bi bi-box-arrow-right"></i> Salir Modo Admin
                </a>
            </div>
        `;
    } else if (token && user) {
        authButtons.innerHTML = `
            <div class="registro">
                <a href="#" onclick="logout()"><img src="Icon/cerrar-con-llave.png" alt="Carrito"></a>
            </div>
            <div class="carrito">
                <a href="carrito.html"><img src="Icon/carrito-de-compras.png" alt="Carrito"></a>
            </div>
        `;
    } else {
        authButtons.innerHTML = `
            <div class="registro">
                <a href="login.html"><img src="Icon/iniciar_sesion.png" alt="Iniciar Sesión"></a>
            </div>
            <div class="carrito">
                <a href="carrito.html"><img src="Icon/carrito-de-compras.png" alt="Carrito"></a>
            </div>
        `;
    }
}

// Efecto de explosión en las redes sociales
document.addEventListener("DOMContentLoaded", () => {
    const socialLinks = document.querySelectorAll(".social-link");

    socialLinks.forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const icon = this.querySelector("img");
            icon.classList.add("social-explode");

            setTimeout(() => {
                window.open(this.href, "_blank");
                icon.classList.remove("social-explode");
            }, 500);
        });
    });
});

// Cierra la sesión del usuario y redirige al inicio
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    renderAuthButtons();
    window.location.href = 'index.html';
}