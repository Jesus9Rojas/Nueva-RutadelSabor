// js/index.js
document.addEventListener('DOMContentLoaded', () => {
    renderAuthButtons();
    initializeCarousel();
});

// Carrusel de reseñas
const carrusel = document.getElementById('carruselResenas');
let tarjetas = [];
let posicion = 0;

function mostrar(pos) {
  if (tarjetas.length === 0) return;
  const desplazamiento = tarjetas[pos].offsetLeft || 0;
  carrusel.scrollTo({ left: desplazamiento, behavior: 'smooth' });
}

function siguiente() {
  if (tarjetas.length === 0) return;
  posicion = (posicion + 1) % tarjetas.length;
  mostrar(posicion);
  reiniciar();
}

function anterior() {
  if (tarjetas.length === 0) return;
  posicion = (posicion - 1 + tarjetas.length) % tarjetas.length;
  mostrar(posicion);
  reiniciar();
}

let autoSlide = setInterval(siguiente, 5000);

function reiniciar() {
  clearInterval(autoSlide);
  autoSlide = setInterval(siguiente, 5000);
}

function abrirFormularioComentario() {
  document.getElementById('modalComentario').classList.remove('hidden');
}

function cerrarFormularioComentario() {
  document.getElementById('modalComentario').classList.add('hidden');
}

function agregarResenaAlCarrusel(nombre, medio, comentario, puntuacion, fecha) {
  const fechaFormateada = new Date(fecha).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const nuevaTarjeta = document.createElement('div');
  nuevaTarjeta.className = "carta-reseña bg-white rounded-lg shadow-md p-4 border border-gray-200 text-black";
  nuevaTarjeta.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <div>
        <p class="font-semibold text-sm">${nombre}</p>
        <p class="text-xs text-gray-500">${medio}</p>
      </div>
      <span class="text-red-600 text-xs font-bold flex items-center gap-1">⭐ USER</span>
    </div>
    <p class="text-sm text-gray-700 mb-4">${comentario}</p>
    <div class="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
      <div class="flex items-center gap-1">
        <span>Rated: ${puntuacion} • ${fechaFormateada}</span>
      </div>
      <a href="#" class="text-blue-600 hover:underline">Ver más</a>
    </div>
  `;

  carrusel.appendChild(nuevaTarjeta);
  tarjetas = document.querySelectorAll('.carta-reseña');
}

async function cargarReviews() {
  try {
    const res = await fetch('data/comentarios.json');
    const data = await res.json();

    // Mostrar desde el JSON original
    data.forEach(cliente => {
      cliente.comentarios.forEach(review => {
        agregarResenaAlCarrusel(
          cliente.nombre_cliente,
          review.medio,
          review.texto,
          review.puntuacion,
          review.fecha
        );
      });
    });

    // Mostrar desde localStorage
    const comentariosExtra = JSON.parse(localStorage.getItem('comentariosExtra')) || [];
    comentariosExtra.forEach(review => {
      agregarResenaAlCarrusel(
        review.nombre,
        review.medio,
        review.comentario,
        review.puntuacion,
        review.fecha
      );
    });

    tarjetas = document.querySelectorAll('.carta-reseña');
    posicion = 0;
    mostrar(posicion);
  } catch (error) {
    console.error('Error al cargar comentarios:', error);
  }
}

function agregarComentario() {
  const nombre = document.getElementById('nombreCritico').value.trim();
  const medio = document.getElementById('medioCritico').value.trim();
  const comentario = document.getElementById('textoComentario').value.trim();
  const puntuacion = document.getElementById('puntuacion').value.trim();

  if (!nombre || !medio || !comentario || !puntuacion) {
    alert("Por favor, completa todos los campos.");
    return;
  }

  const fecha = new Date().toISOString();

  // Mostrar en la vista
  agregarResenaAlCarrusel(nombre, medio, comentario, puntuacion, fecha);

  // Guardar en localStorage
  const nuevo = { nombre, medio, comentario, puntuacion, fecha };
  const comentariosExtra = JSON.parse(localStorage.getItem('comentariosExtra')) || [];
  comentariosExtra.push(nuevo);
  localStorage.setItem('comentariosExtra', JSON.stringify(comentariosExtra));

  cerrarFormularioComentario();

  // Limpiar campos
  document.getElementById('nombreCritico').value = '';
  document.getElementById('medioCritico').value = '';
  document.getElementById('textoComentario').value = '';
  document.getElementById('puntuacion').value = '';
}

// Iniciar
cargarReviews();

// Funcion de carrusel banner
function initializeCarousel() {
    const carousel = document.querySelector('.carrusel-personalizado');
    const items = document.querySelectorAll('.carrusel-item');
    const indicatorsContainer = document.querySelector('.carrusel-indicators');
    const prevBtn = document.querySelector('.carrusel-control.prev');
    const nextBtn = document.querySelector('.carrusel-control.next');
    let currentIndex = 0;
    let interval;

    // Crear indicadores
    items.forEach((_, index) => {
        const button = document.createElement('button');
        button.dataset.index = index;
        if (index === 0) button.classList.add('active');
        indicatorsContainer.appendChild(button);
    });

    // Mostrar slide actual
    function showSlide(index) {
        items.forEach(item => {
            item.classList.remove('active', 'enter-right', 'exit-left');
            item.style.opacity = 0;
        });
        const currentItem = items[index];
        currentItem.classList.add('active');
        currentItem.style.opacity = 1;
        updateIndicators(index);
    }

    // Actualizar indicadores
    function updateIndicators(index) {
        const indicators = document.querySelectorAll('.carrusel-indicators button');
        indicators.forEach((indicator, i) => {
            indicator.classList.toggle('active', i === index);
        });
    }

    // Navegar al siguiente slide
    function nextSlide() {
        currentIndex = (currentIndex + 1) % items.length;
        showSlide(currentIndex);
    }

    // Navegar al slide anterior
    function prevSlide() {
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        showSlide(currentIndex);
    }

    // Automatización
    function startAutoplay() {
        interval = setInterval(nextSlide, 5000); // Cambia cada 5 segundos
    }

    function stopAutoplay() {
        clearInterval(interval);
    }

    // Event listeners
    prevBtn.addEventListener('click', () => {
        stopAutoplay();
        prevSlide();
        startAutoplay();
    });

    nextBtn.addEventListener('click', () => {
        stopAutoplay();
        nextSlide();
        startAutoplay();
    });

    indicatorsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (button) {
            stopAutoplay();
            currentIndex = parseInt(button.dataset.index);
            showSlide(currentIndex);
            startAutoplay();
        }
    });
}

// Renderizar segun el acceso

// REEMPLAZAR LA FUNCIÓN renderAuthButtons en index.js CON ESTA:

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

// Reproduccion del Video
const container = document.querySelector('.video-btn-container');
const video = container.querySelector('video');
container.addEventListener('mouseenter', () => {
    video.play();
});
container.addEventListener('mouseleave', () => {
    video.pause();
    video.currentTime = 0;
});

// Redirigir al hacer clic en el botón "Ver menú completo"
const verMasBtn = container.querySelector('.ver-mas-btn');
if (verMasBtn) {
  verMasBtn.addEventListener('click', () => {
    window.location.href = 'menu.html';
  });
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    renderAuthButtons();
}

// Footer Acordeón - Agregar al final de tu archivo index.js

function inicializarFooterAcordeon() {
  const footerSecciones = document.querySelectorAll('.footer-seccion');
  
  if (window.innerWidth <= 768) {
    footerSecciones.forEach((seccion, index) => {
      const titulo = seccion.querySelector('h3');
      
      if (titulo) {
        const nuevoTitulo = titulo.cloneNode(true);
        titulo.parentNode.replaceChild(nuevoTitulo, titulo);
        
        nuevoTitulo.addEventListener('click', function() {
          seccion.classList.toggle('active');
        });
        
        if (index === 0) {
          seccion.classList.add('active');
        }
      }
    });
  } else {
    footerSecciones.forEach((seccion) => {
      seccion.classList.remove('active');
    });
  }
}

let resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    inicializarFooterAcordeon();
  }, 250);
});

//Agrandamiento de las redes al abrir
document.addEventListener("DOMContentLoaded", () => {
    const socialLinks = document.querySelectorAll(".social-link");
    const logo = document.querySelector(".logo-img");

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
