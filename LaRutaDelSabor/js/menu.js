document.addEventListener('DOMContentLoaded', async () => {
    // Contenedores principales del DOM
    const categoriasList = document.getElementById("categorias-list");
    const productosContainer = document.getElementById("productos-container");
    const API_URL = 'https://hamburguer-xmx8.onrender.com/api';

    let categories = [];
    let products = [];

    // Inicializa el menú: carga categorías y productos
    async function initMenu() {
        try {
            const catResponse = await fetch(`${API_URL}/categories`);
            const catData = await catResponse.json();
            if (catData.success) {
                categories = catData.data;
                renderCategoriasSidebar(); // Renderiza las categorías en la sidebar
                inicializarMenuResponsive(); // Inicializar funcionalidad responsive
            } else {
                throw new Error('Error al cargar categorías');
            }

            await renderProductos('todo', document.querySelector("#categorias-list button.active"));
        } catch (error) {
            console.log("Error al cargar el menú:", error.message);
            categoriasList.innerHTML = "<p>Error al cargar el menú.</p>";
        }
    }

    // Renderiza los productos según la categoría seleccionada
    async function renderProductos(categoryId, btn) {
        const allBtns = document.querySelectorAll("#categorias-list button");
        allBtns.forEach(b => b.classList.remove("active"));
        if (btn) btn.classList.add("active");

        productosContainer.innerHTML = "<h4>Cargando...</h4>";

        try {
            let url = `${API_URL}/products`;
            if (categoryId !== 'todo') {
                url = `${API_URL}/products?categoria=${categoryId}`;
            }
            const response = await fetch(url);
            const prodData = await response.json();

            if (prodData.success) {
                products = prodData.data;
                productosContainer.innerHTML = "";
                if (products.length === 0) {
                    productosContainer.innerHTML = "<p>No hay productos en esta categoría.</p>";
                }
                products.forEach(producto => {
                    const card = document.createElement("div");
                    card.className = "producto galeria-item";
                    card.innerHTML = `
                        <img src="${producto.imagen}" alt="${producto.nombre}" onerror="this.onerror=null;this.src='https://placehold.co/600x400/CCCCCC/FFFFFF?text=${producto.nombre}';">
                        <h3>${producto.nombre}</h3>
                        <p>${producto.descripcion}</p>
                        <p class="precio">S/ ${producto.precio.toFixed(2)}</p>
                    `;
                    card.addEventListener("click", () => showProductModal(producto));
                    productosContainer.appendChild(card);
                });
            } else {
                productosContainer.innerHTML = "<p>Error al cargar productos.</p>";
            }
        } catch (error) {
            console.log('Error al obtener productos:', error.message);
            productosContainer.innerHTML = "<p>Error de conexión al cargar productos.</p>";
        }

        // Cerrar menú móvil después de seleccionar categoría
        cerrarMenuMovil();
    }

    // Muestra el modal con la información del producto seleccionado
    function showProductModal(producto) {
        document.getElementById("modalNombre").textContent = producto.nombre;
        document.getElementById("modalDesc").textContent = producto.descripcion;
        document.getElementById("modalPrecio").textContent = producto.precio.toFixed(2);
        document.getElementById("modalImg").src = producto.imagen;
        
        const modal = document.getElementById("modalProducto");
        modal.classList.add("show");

        document.getElementById("btnAgregar").onclick = () => addToCart(producto);
        document.getElementById("btnSalir").onclick = () => modal.classList.remove("show");
    }

    // Agrega el producto seleccionado al carrito en localStorage
    function addToCart(producto) {
        const user = JSON.parse(localStorage.getItem("user"));
        const token = localStorage.getItem("token");
        const isAdmin = token && user && user.email === 'test@test.com';

        if (isAdmin) {
            alert('Modo administrador: No puedes agregar productos al carrito.');
            return;
        }

        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        const existente = carrito.find(p => p._id === producto._id);

        if (existente) {
            existente.cantidad += 1;
        } else {
            const nuevoProducto = {
                _id: producto._id,
                nombre: producto.nombre,
                precio: producto.precio,
                imagen: producto.imagen,
                cantidad: 1
            };
            carrito.push(nuevoProducto);
        }
        localStorage.setItem("carrito", JSON.stringify(carrito));
        alert(`${producto.nombre} ha sido agregado al carrito!`);
        document.getElementById("modalProducto").classList.remove("show");
    }

    // Renderiza las categorías en la sidebar
    function renderCategoriasSidebar() {
        categoriasList.innerHTML = "";

        // Botón para ver todos los productos
        const liTodo = document.createElement("li");
        const btnTodo = document.createElement('button');
        btnTodo.className = "active";
        btnTodo.innerHTML = "🍽️ Ver Todo";
        btnTodo.onclick = () => renderProductos("todo", btnTodo);
        liTodo.appendChild(btnTodo);
        categoriasList.appendChild(liTodo);

        // Botones para cada categoría
        categories.forEach(categoria => {
            const li = document.createElement("li");
            const btnCat = document.createElement('button');
            btnCat.innerHTML = `${categoria.icono} ${categoria.nombre}`;
            btnCat.dataset.categoryId = categoria._id;
            btnCat.onclick = () => renderProductos(categoria._id, btnCat);
            li.appendChild(btnCat);
            categoriasList.appendChild(li);
        });
    }

    // Renderiza los botones de autenticación según el estado del usuario
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

    // ============================================
    // FUNCIONALIDAD RESPONSIVE PARA MENÚ MÓVIL
    // ============================================
    function inicializarMenuResponsive() {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('categorias-sidebar');
        
        if (menuToggle && sidebar) {
            // Toggle del menú al hacer click en el botón
            menuToggle.addEventListener('click', function(e) {
                e.stopPropagation(); // Evita que se propague el evento
                sidebar.classList.toggle('active');
                menuToggle.classList.toggle('active');
            });

            // Cerrar menú al hacer click fuera de él
            document.addEventListener('click', function(event) {
                if (window.innerWidth <= 768) {
                    const isClickInsideSidebar = sidebar.contains(event.target);
                    const isClickOnToggle = menuToggle.contains(event.target);
                    
                    if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
                        cerrarMenuMovil();
                    }
                }
            });
        }
    }

    // Función auxiliar para cerrar el menú móvil
    function cerrarMenuMovil() {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('categorias-sidebar');
            const menuToggle = document.getElementById('menu-toggle');
            
            if (sidebar) sidebar.classList.remove('active');
            if (menuToggle) menuToggle.classList.remove('active');
        }
    }

    // Re-inicializar al cambiar el tamaño de ventana
    let resizeMenuTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeMenuTimer);
        resizeMenuTimer = setTimeout(function() {
            const sidebar = document.getElementById('categorias-sidebar');
            const menuToggle = document.getElementById('menu-toggle');
            
            // Remover clase active si pasamos a escritorio
            if (window.innerWidth > 768) {
                if (sidebar) sidebar.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
            }
        }, 250);
    });

    // Inicializar menú y renderizar botones
    renderAuthButtons();
    await initMenu();
});

// Cierra la sesión del usuario y redirige al inicio
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Agrandamiento de las redes al abrir
document.addEventListener("DOMContentLoaded", () => {
    const socialLinks = document.querySelectorAll(".social-link");

    // Efecto de explosión en las redes sociales
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