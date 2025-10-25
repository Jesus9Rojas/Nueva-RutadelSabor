

document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'https://hamburguer-xmx8.onrender.com/api'; // URL base de la API.
  let categories = []; // Array para almacenar las categorías.
  let products = []; // Array para almacenar los productos.
  let editingProductId = null; // ID del producto que se está editando (null si se está creando uno nuevo).
  let editingCategoryId = null; // ID de la categoría que se está editando (null si se está creando una nueva).

  // Obtiene el token y los datos del usuario del localStorage.
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  // --- Validación de Acceso (Solo Admin) ---
  // Redirige al usuario a la página de login si no cumple los requisitos de administrador.
  if (!token || !user || user.email !== 'test@test.com' || user.rol !== 'admin') {
    alert('Acceso denegado. Solo el usuario con correo test@test.com y rol administrador puede acceder.');
    window.location.href = 'login.html';
    return; // Detiene la ejecución del script.
  }

  // Configura los encabezados de autorización para todas las solicitudes a la API.
  const authHeader = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // --- Funciones de Carga Inicial ---
  /**
   * Carga categorías y productos desde la API de forma asíncrona.
   * Actualiza las variables `categories` y `products`.
   */
  async function fetchData() {
    try {
      // Realiza peticiones concurrentes para categorías y productos.
      const [catRes, prodRes] = await Promise.all([
        fetch(`${API_URL}/categories`),
        fetch(`${API_URL}/products`)
      ]);

      const catData = await catRes.json();
      const prodData = await prodRes.json();

      // Si las respuestas son exitosas, actualiza los arrays de datos.
      if (catData.success) categories = catData.data;
      if (prodData.success) products = prodData.data;

      renderAll(); // Vuelve a renderizar todas las secciones de la interfaz.
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('No se pudieron cargar los datos del servidor.');
    }
  }

  /**
   * Renderiza todas las secciones de la interfaz de administración.
   */
  function renderAll() {
    renderCategoryList(); // Lista de categorías.
    renderProductTable(); // Tabla de productos.
    updateCategoryDropdown(); // Dropdown de categorías en el formulario de productos.
  }

  // --- Gestión de Productos ---
  /**
   * Renderiza la tabla de productos en la interfaz.
   */
  function renderProductTable() {
    const tbody = document.getElementById('foodTableBody');
    tbody.innerHTML = ''; // Limpia la tabla antes de renderizar.

    // Itera sobre cada producto y crea una fila en la tabla.
    products.forEach(product => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${product.nombre}</td>
        <td>${product.descripcion}</td>
        <td>S/${product.precio.toFixed(2)}</td>
        <td><img src="${product.imagen}" alt="${product.nombre}" style="width:60px;height:40px;object-fit:cover;" onerror="this.style.display='none'"></td>
        <td>
        <button class="btn btn-sm btn-warning"><i class="bi bi-pencil"></i> Editar</button>
        <button class="btn btn-sm btn-danger"><i class="bi bi-trash"></i> Eliminar</button>
        </td>
      `;
      // Asigna eventos a los botones de Editar y Eliminar.
      tr.querySelector('.btn-warning').addEventListener('click', () => populateProductForm(product));
      tr.querySelector('.btn-danger').addEventListener('click', () => deleteProduct(product._id));
      tbody.appendChild(tr);
    });
  }

  /**
   * Maneja el envío del formulario de productos (creación o actualización).
   */
  async function handleProductFormSubmit(e) {
    e.preventDefault(); // Evita el comportamiento por defecto del formulario.

    // Recolecta los datos del formulario.
    const productData = {
      nombre: document.getElementById('foodName').value.trim(),
      descripcion: document.getElementById('foodDesc').value.trim(),
      precio: parseFloat(document.getElementById('foodPrice').value),
      imagen: document.getElementById('foodImage').value.trim(),
      categoria: document.getElementById('foodCategory').value,
    };

    // Validación básica de campos obligatorios.
    if (!productData.nombre || !productData.precio || !productData.categoria) {
      return alert('Nombre, precio y categoría son obligatorios.');
    }

    try {
      let response;
      // Determina si se está editando o creando un producto.
      if (editingProductId) {
        // Petición PUT para actualizar un producto existente.
        response = await fetch(`${API_URL}/products/${editingProductId}`, {
          method: 'PUT',
          headers: authHeader,
          body: JSON.stringify(productData)
        });
      } else {
        // Petición POST para crear un nuevo producto.
        response = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify(productData)
        });
      }
      const result = await response.json();
      if (result.success) {
        await fetchData(); // Recarga los datos para actualizar la interfaz.
        resetProductForm(); // Limpia el formulario.
      } else {
        alert(`Error: ${result.error || result.msg}`);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error de conexión al guardar el producto.');
    }
  }

  /**
   * Elimina un producto de la base de datos.
   * @param {string} id - El ID del producto a eliminar.
   */
  async function deleteProduct(id) {
    if (confirm('¿Seguro que deseas eliminar este producto?')) {
      try {
        const response = await fetch(`${API_URL}/products/${id}`, {
          method: 'DELETE',
          headers: authHeader
        });
        const result = await response.json();
        if (result.success) {
          await fetchData(); // Recarga los datos.
        } else {
          alert(`Error: ${result.error || result.msg}`);
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error de conexión al eliminar.');
      }
    }
  }

  /**
   * Rellena el formulario de productos con los datos de un producto para edición.
   * @param {object} product - El objeto producto con los datos a cargar.
   */
  function populateProductForm(product) {
    document.getElementById('foodName').value = product.nombre;
    document.getElementById('foodDesc').value = product.descripcion;
    document.getElementById('foodPrice').value = product.precio;
    document.getElementById('foodImage').value = product.imagen;
    document.getElementById('foodCategory').value = product.categoria._id || product.categoria; // Maneja si categoria es un objeto o solo un ID.
    editingProductId = product._id; // Establece el ID del producto que se está editando.
    // Cambia el texto del botón del formulario y muestra el botón de cancelar.
    document.querySelector('#foodForm button[type="submit"]').textContent = 'Actualizar Producto';
    document.getElementById('cancelBtn').style.display = 'inline-block';
  }

  /**
   * Restablece el formulario de productos a su estado inicial.
   */
  function resetProductForm() {
    document.getElementById('foodForm').reset(); // Limpia todos los campos del formulario.
    editingProductId = null; // Resetea el ID de edición.
    // Restaura el texto del botón y oculta el botón de cancelar.
    document.querySelector('#foodForm button[type="submit"]').textContent = 'Agregar Producto';
    document.getElementById('cancelBtn').style.display = 'none';
  }

  // --- Gestión de Categorías ---
  /**
   * Renderiza la lista de categorías en la interfaz.
   */
  function renderCategoryList() {
    const ul = document.getElementById('category-list-ul');
    ul.innerHTML = ''; // Limpia la lista.

    // Itera sobre cada categoría y crea un elemento de lista.
    categories.forEach(cat => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `
        ${cat.icono} ${cat.nombre}
        <div>
          <button class="btn btn-sm btn-warning"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button>
        </div>`;
      // Asigna eventos a los botones de Editar y Eliminar.
      li.querySelector('.btn-warning').addEventListener('click', () => populateCategoryForm(cat));
      li.querySelector('.btn-danger').addEventListener('click', () => deleteCategory(cat._id));
      ul.appendChild(li);
    });
  }

  /**
   * Maneja el envío del formulario de categorías (creación o actualización).
   */
  async function handleCategoryFormSubmit(e) {
    e.preventDefault(); // Evita el comportamiento por defecto del formulario.

    // Recolecta los datos del formulario.
    const categoryData = {
      nombre: document.getElementById('categoryName').value.trim(),
      icono: document.getElementById('categoryIcon').value.trim()
    };

    // Validación básica de campos obligatorios.
    if (!categoryData.nombre || !categoryData.icono) {
      return alert('Nombre e ícono son obligatorios para la categoría.');
    }

    try {
      let response;
      // Determina si se está editando o creando una categoría.
      if (editingCategoryId) {
        // Petición PUT para actualizar una categoría existente.
        response = await fetch(`${API_URL}/categories/${editingCategoryId}`, {
          method: 'PUT',
          headers: authHeader,
          body: JSON.stringify(categoryData)
        });
      } else {
        // Petición POST para crear una nueva categoría.
        response = await fetch(`${API_URL}/categories`, {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify(categoryData)
        });
      }
      const result = await response.json();
      if (result.success) {
        await fetchData(); // Recarga los datos.
        resetCategoryForm(); // Limpia el formulario.
      } else {
        alert(`Error: ${result.error || result.msg}`);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error de conexión al guardar la categoría.');
    }
  }

  /**
   * Elimina una categoría y sus productos asociados de la base de datos.
   * @param {string} id - El ID de la categoría a eliminar.
   */
  async function deleteCategory(id) {
    if (confirm('¿Seguro? Se eliminará la categoría y TODOS sus productos.')) {
      try {
        const response = await fetch(`${API_URL}/categories/${id}`, {
          method: 'DELETE',
          headers: authHeader
        });
        const result = await response.json();
        if (result.success) {
          await fetchData(); // Recarga los datos.
        } else {
          alert(`Error: ${result.error || result.msg}`);
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error de conexión al eliminar.');
      }
    }
  }

  /**
   * Rellena el formulario de categorías con los datos de una categoría para edición.
   * @param {object} category - El objeto categoría con los datos a cargar.
   */
  function populateCategoryForm(category) {
    document.getElementById('categoryName').value = category.nombre;
    document.getElementById('categoryIcon').value = category.icono;
    editingCategoryId = category._id; // Establece el ID de la categoría que se está editando.
    // Cambia el texto del botón del formulario y muestra el botón de cancelar.
    document.querySelector('#categoryForm button[type="submit"]').innerHTML = '<i class="bi bi-pencil-fill me-1"></i>Actualizar Categoría';
    document.getElementById('cancelCategoryBtn').style.display = 'inline-block';
  }

  /**
   * Restablece el formulario de categorías a su estado inicial.
   */
  function resetCategoryForm() {
    document.getElementById('categoryForm').reset(); // Limpia los campos del formulario.
    editingCategoryId = null; // Resetea el ID de edición.
    // Restaura el texto del botón y oculta el botón de cancelar.
    document.querySelector('#categoryForm button[type="submit"]').innerHTML = '<i class="bi bi-plus-circle me-1"></i>Agregar Categoría';
    document.getElementById('cancelCategoryBtn').style.display = 'none';
  }

  /**
   * Actualiza las opciones del dropdown de categorías en el formulario de productos.
   */
  function updateCategoryDropdown() {
    const categorySelect = document.getElementById('foodCategory');
    categorySelect.innerHTML = '<option value="" disabled selected>Seleccionar categoría</option>'; // Limpia y añade la opción predeterminada.
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat._id;
      option.textContent = cat.nombre;
      categorySelect.appendChild(option);
    });
  }

  // --- Inicialización y Event Listeners ---
  // Asocia las funciones a los eventos de submit y click de los formularios y botones.
  document.getElementById('foodForm').addEventListener('submit', handleProductFormSubmit);
  document.getElementById('cancelBtn').addEventListener('click', resetProductForm);
  document.getElementById('categoryForm').addEventListener('submit', handleCategoryFormSubmit);
  document.getElementById('cancelCategoryBtn').addEventListener('click', resetCategoryForm);

  // Carga los datos iniciales al cargar la página.
  fetchData();
});
