document.addEventListener('DOMContentLoaded', async () => {
    // Contenedores principales del DOM
    const categoriasList = document.getElementById("categorias-list");
    const productosContainer = document.getElementById("productos-container");
    const API_URL = 'https://hamburguer-xmx8.onrender.com/api';

    let categories = [];
    let products = [];

    // ============================================
    // SISTEMA DE CACHÉ CON EXPIRACIÓN
    // ============================================
    const CACHE_EXPIRATION = 5 * 60 * 1000; // 5 minutos

    function getCachedData(key) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            
            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            
            // Verificar si el caché expiró
            if (now - timestamp > CACHE_EXPIRATION) {
                localStorage.removeItem(key);
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('Error al leer caché:', error);
            return null;
        }
    }

    function setCachedData(key, data) {
        try {
            const cacheObject = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(cacheObject));
        } catch (error) {
            console.error('Error al guardar caché:', error);
        }
    }

    // ============================================
    // LOADER VISUAL
    // ============================================
    function showLoader(container, message = "Cargando...") {
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem; width: 100%; grid-column: 1/-1;">
                <div style="display: inline-block; width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #ff7f00; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
                <h4 style="margin-top: 1rem; color: #333;">${message}</h4>
            </div>
        `;
    }

    // ============================================
    // CARGA PARALELA Y OPTIMIZADA
    // ============================================
    async function initMenu() {
        try {
            // Mostrar loader mientras carga
            showLoader(productosContainer, "Cargando menú...");
            
            // Intentar cargar desde caché primero
            const cachedCategories = getCachedData('menu_categories');
            const cachedProducts = getCachedData('menu_products_all');
            
            // Si hay datos en caché, mostrarlos inmediatamente
            if (cachedCategories && cachedProducts) {
                categories = cachedCategories;
                products = cachedProducts;
                
                // Renderizar inmediatamente desde caché
                renderCategoriasSidebar();
                renderProductosFromCache(products);
                inicializarMenuResponsive();
                
                // Actualizar en segundo plano
                updateDataInBackground();
                return;
            }
            
            // Si no hay caché, cargar en paralelo
            const [catResponse, prodResponse] = await Promise.all([
                fetch(`${API_URL}/categories`),
                fetch(`${API_URL}/products`)
            ]);

            const catData = await catResponse.json();
            const prodData = await prodResponse.json();

            if (catData.success && prodData.success) {
                categories = catData.data;
                products = prodData.data;
                
                // Guardar en caché
                setCachedData('menu_categories', categories);
                setCachedData('menu_products_all', products);
                
                // Renderizar
                renderCategoriasSidebar();
                renderProductosFromCache(products);
                inicializarMenuResponsive();
            } else {
                throw new Error('Error al cargar datos');
            }
        } catch (error) {
            console.error("Error al cargar el menú:", error);
            productosContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #d32f2f; grid-column: 1/-1;">
                    <h4>⚠️ Error al cargar el menú</h4>
                    <p>Por favor, recarga la página</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 1rem 2rem; background: #ff7f00; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Recargar
                    </button>
                </div>
            `;
        }
    }

    // Actualizar datos en segundo plano
    async function updateDataInBackground() {
        try {
            const [catResponse, prodResponse] = await Promise.all([
                fetch(`${API_URL}/categories`),
                fetch(`${API_URL}/products`)
            ]);

            const catData = await catResponse.json();
            const prodData = await prodResponse.json();

            if (catData.success && prodData.success) {
                // Actualizar caché silenciosamente
                setCachedData('menu_categories', catData.data);
                setCachedData('menu_products_all', prodData.data);
                
                categories = catData.data;
                products = prodData.data;
            }
        } catch (error) {
            console.log('Error al actualizar en segundo plano:', error);
        }
    }

    // Renderizar productos desde caché (sin hacer fetch)
    function renderProductosFromCache(productsToShow) {
        productosContainer.innerHTML = "";
        
        if (productsToShow.length === 0) {
            productosContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; grid-column: 1/-1;">
                    <p>No hay productos disponibles</p>
                </div>
            `;
            return;
        }

        productsToShow.forEach(producto => {
            const card = document.createElement("div");
            card.className = "producto galeria-item";
            card.innerHTML = `
                <img src="${producto.imagen}" 
                     alt="${producto.nombre}" 
                     loading="lazy"
                     onerror="this.onerror=null;this.src='https://placehold.co/600x400/CCCCCC/FFFFFF?text=${encodeURIComponent(producto.nombre)}';">
                <h3>${producto.nombre}</h3>
                <p>${producto.descripcion}</p>
                <p class="precio">S/ ${producto.precio.toFixed(2)}</p>
            `;
            card.addEventListener("click", () => showProductModal(producto));
            productosContainer.appendChild(card);
        });
    }

    // Renderiza los productos según la categoría seleccionada (OPTIMIZADO)
    async function renderProductos(categoryId, btn) {
        const allBtns = document.querySelectorAll("#categorias-list button");
        allBtns.forEach(b => b.classList.remove("active"));
        if (btn) btn.classList.add("active");

        // Filtrar desde datos ya cargados en lugar de hacer fetch
        let productsToShow;
        
        if (categoryId === 'todo') {
            productsToShow = products;
        } else {
            // Filtrar por múltiples criterios para asegurar compatibilidad
            productsToShow = products.filter(p => {
                // Verificar si el producto tiene el campo categoria como ID, nombre o _id
                return p.categoria === categoryId || 
                       p.categoria?._id === categoryId || 
                       p.categoriaId === categoryId ||
                       p.categoria_id === categoryId;
            });
            
            // Debug: mostrar en consola si no hay productos
            if (productsToShow.length === 0) {
                console.log('No se encontraron productos para categoryId:', categoryId);
                console.log('Productos disponibles:', products);
                console.log('Estructura de categoria en productos:', products[0]?.categoria);
            }
        }

        renderProductosFromCache(productsToShow);
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

        // ADMINISTRADOR - Cuenta específica test@test.com
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
        } 
        // VENDEDOR - Cuenta específica vendedor1@vendedorRS.com
        else if (token && user && user.email === 'vendedor1@vendedorRS.com') {
            authButtons.innerHTML = `
                <div class="registro">
                    <a href="vendedor.html" class="admin-btn">
                        <i class="bi bi-cart-plus-fill"></i> Sistema POS
                    </a>
                </div>
                <div class="registro">
                    <a href="#" onclick="logout()" class="admin-btn">
                        <i class="bi bi-box-arrow-right"></i> Cerrar Sesión
                    </a>
                </div>
            `;
        }
        // CLIENTE AUTENTICADO (cualquier otro usuario)
        else if (token && user) {
            authButtons.innerHTML = `
                <div class="registro">
                    <a href="#" onclick="logout()"><img src="Icon/cerrar-con-llave.png" alt="Cerrar Sesión"></a>
                </div>
                <div class="carrito">
                    <a href="carrito.html"><img src="Icon/carrito-de-compras.png" alt="Carrito"></a>
                </div>
            `;
        } 
        // USUARIO NO AUTENTICADO
        else {
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
            menuToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                sidebar.classList.toggle('active');
                menuToggle.classList.toggle('active');
            });

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

    function cerrarMenuMovil() {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('categorias-sidebar');
            const menuToggle = document.getElementById('menu-toggle');
            
            if (sidebar) sidebar.classList.remove('active');
            if (menuToggle) menuToggle.classList.remove('active');
        }
    }

    let resizeMenuTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeMenuTimer);
        resizeMenuTimer = setTimeout(function() {
            const sidebar = document.getElementById('categorias-sidebar');
            const menuToggle = document.getElementById('menu-toggle');
            
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
    // Limpiar caché al cerrar sesión
    localStorage.removeItem('menu_categories');
    localStorage.removeItem('menu_products_all');
    window.location.href = 'index.html';
}

// Agrandamiento de las redes al abrir
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