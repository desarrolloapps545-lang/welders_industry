// --- Configuración de Supabase ---
const supabaseUrl = 'https://vlkxhfqycdghuntyyblv.supabase.co';
// Usamos la Anon Key (JWT) proporcionada
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsa3hoZnF5Y2RnaHVudHl5Ymx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODE4MDgsImV4cCI6MjA4NzI1NzgwOH0.iqu7ywF73fox7V-Geelhlr0MMi_Hw03UDvuQNvqw8WE';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- Elementos del DOM ---
const loginScreen = document.getElementById('login-screen');
const loginContainer = document.getElementById('login-container');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('error-msg');
const logoutBtn = document.getElementById('logout-btn');

// --- Elementos del Menú y Workspaces ---
const workspaces = document.querySelectorAll('.workspace');

// --- Elementos Gestión Usuarios ---
const usersTableBody = document.querySelector('#users-table tbody');
const btnNewUser = document.getElementById('btn-new-user');
const modalNewUser = document.getElementById('modal-new-user');
const closeModal = document.querySelector('.close-modal');
const formNewUser = document.getElementById('form-new-user');
const modalMsg = document.getElementById('modal-msg');

// --- Elementos Cambiar Contraseña ---
const btnChangePass = document.getElementById('btn-change-pass');
const modalChangePass = document.getElementById('modal-change-pass');
const closeModalPass = document.getElementById('close-modal-pass');
const formChangePass = document.getElementById('form-change-pass');
const modalPassMsg = document.getElementById('modal-pass-msg');

// --- Elementos Actualizar Datos (Admin) ---
const btnUpdateData = document.getElementById('btn-update-data');
const modalUpdateData = document.getElementById('modal-update-data');
const closeModalUpdate = document.getElementById('close-modal-update');
const formUpdateData = document.getElementById('form-update-data');
const modalUpdateMsg = document.getElementById('modal-update-msg');

// --- Elementos Editar Usuario (Terceros) ---
const modalEditUser = document.getElementById('modal-edit-user');
const closeModalEdit = document.getElementById('close-modal-edit');
const formEditUser = document.getElementById('form-edit-user');
const modalEditMsg = document.getElementById('modal-edit-msg');

// --- Elementos Productos ---
const productsTableBody = document.querySelector('#products-table tbody');
const btnNewProduct = document.getElementById('btn-new-product');
const modalProduct = document.getElementById('modal-product');
const closeModalProduct = document.getElementById('close-modal-product');
const formProduct = document.getElementById('form-product');
const modalProductMsg = document.getElementById('modal-product-msg');

// --- Elementos Inventario ---
const inventoryTableBody = document.querySelector('#inventory-table tbody');
const btnAddInventory = document.getElementById('btn-add-inventory');
const modalInventory = document.getElementById('modal-inventory');
const closeModalInventory = document.getElementById('close-modal-inventory');
const formInventory = document.getElementById('form-inventory');
const modalInventoryMsg = document.getElementById('modal-inventory-msg');
const inventoryRowsContainer = document.getElementById('inventory-rows-container');
const btnAddRow = document.getElementById('btn-add-row');

// --- Elementos Registro ---
const btnTypeEntry = document.getElementById('btn-type-entry');
const btnTypeExit = document.getElementById('btn-type-exit');
const formRegistry = document.getElementById('form-registry');
const regProductSelect = document.getElementById('reg-product');
const regAmountInput = document.getElementById('reg-amount');
const regUnitDisplay = document.getElementById('reg-unit-display');
const regPlateInput = document.getElementById('reg-plate');
const regPhotoPlate = document.getElementById('reg-photo-plate');
const regPhotoInvoice = document.getElementById('reg-photo-invoice');
const registryMsg = document.getElementById('registry-msg');

// --- Elementos Modal Imagen ---
const modalImageViewer = document.getElementById('modal-image-viewer');
const closeModalImage = document.getElementById('close-modal-image');
const modalImageContent = document.getElementById('modal-image-content');

// --- Elementos Historial ---
const historyFilterEntry = document.getElementById('history-filter-entry');
const historyFilterExit = document.getElementById('history-filter-exit');
const historyDateFilter = document.getElementById('history-date-filter');
const historyClearFilters = document.getElementById('history-clear-filters');
const historyTableBody = document.getElementById('history-table-body');
const historyProductFilter = document.getElementById('history-product-filter');
const historyStockDisplay = document.getElementById('history-stock-display');
const btnManageStock = document.getElementById('btn-manage-stock');
const btnExportExcel = document.getElementById('btn-export-excel');
const btnExportWord = document.getElementById('btn-export-word');

// --- Elementos Modal Permisos Stock ---
const modalStockPermissions = document.getElementById('modal-stock-permissions');
const closeModalStock = document.getElementById('close-modal-stock');
const stockPermissionsList = document.getElementById('stock-permissions-list');
const btnSaveStockPermissions = document.getElementById('btn-save-stock-permissions');

// --- Variables Globales ---
let currentUserRole = null;
let targetUserIdToUpdate = null; // Para guardar el ID del usuario a editar/cambiar pass
let usersCache = []; // Para guardar los datos de la tabla temporalmente
let productsCache = []; // Cache para productos
let inventoryCache = []; // Cache para inventario
let historyCache = []; // Cache para historial (exportación)

// --- Funciones de Utilidad ---

function mostrarError(mensaje) {
    errorMsg.textContent = mensaje;
    errorMsg.classList.remove('hidden');
}

function limpiarError() {
    errorMsg.textContent = '';
    errorMsg.classList.add('hidden');
}

function cambiarPantalla(esLogin) {
    if (esLogin) {
        loginContainer.classList.remove('hidden');
        dashboardScreen.classList.add('hidden');
    } else {
        loginContainer.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        
        if (currentUserRole === 'Operario') {
            abrirWorkspace('workspace-registry');
        } else {
            abrirWorkspace('workspace-users');
        }
    }
}

function abrirWorkspace(idWorkspace) {
    // Ocultar todos primero
    workspaces.forEach(ws => ws.classList.add('hidden'));
    // Mostrar el deseado
    const ws = document.getElementById(idWorkspace);
    if (ws) {
        ws.classList.remove('hidden');
        if (idWorkspace === 'workspace-users') {
            cargarUsuarios(); // Cargar datos al abrir la pestaña
        }
        if (idWorkspace === 'workspace-products') {
            cargarProductos();
        }
        if (idWorkspace === 'workspace-inventory') {
            cargarInventario();
        }
        if (idWorkspace === 'workspace-registry') {
            resetRegistryForm();
            cargarRegistrosHoy();
        }
        if (idWorkspace === 'workspace-history') {
            // Resetear filtros visuales
            historyProductFilter.value = "";
            historyStockDisplay.textContent = "Stock: -";

            // Ocultar columna "Registrado por" para operarios
            const thRegistradoPor = document.querySelector('#history-table th:nth-child(8)');
            if (thRegistradoPor) {
                thRegistradoPor.style.display = '';
            }

            // Lógica de visibilidad de Stock
            verificarPermisosStock();
            cargarHistorial();
        }
    }
}

// --- Lógica Principal ---

async function manejarInicioSesion(e) {
    e.preventDefault();
    limpiarError();

    const email = emailInput.value;
    const password = passwordInput.value;

    // 1. Autenticación con Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (authError) {
        mostrarError("Error de autenticación: " + authError.message);
        return;
    }

    const userId = authData.user.id;
    console.log("Autenticación exitosa. Verificando perfil para el usuario con ID:", userId);

    // 2. Consultar la tabla 'users' para verificar permisos
    // Rectificamos si el UID existe en la columna 'id' y obtenemos 'role' e 'is_admin'
    const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('role, is_admin')
        .eq('id', userId)
        .single();

    if (userError) {
        console.error("Error al buscar el perfil del usuario:", userError);

        let mensaje;
        if (userError.code === 'PGRST116') {
            console.warn("PGRST116: Si la fila existe en la base de datos, revisa si RLS (Row Level Security) está bloqueando la lectura.");
            mensaje = "Perfil no encontrado. Verifica que el usuario exista en la tabla 'users' y que RLS no esté bloqueando el acceso.";
        } else {
            mensaje = "No se pudo obtener la información del perfil. Revisa la consola del navegador.";
        }
        mostrarError(mensaje);

        // Cerramos la sesión para no dejar al usuario en un estado inconsistente (autenticado pero sin perfil)
        await supabaseClient.auth.signOut();
        console.log("Sesión cerrada debido a que no se encontró un perfil válido.");
        return;
    }

    // 3. Lógica de Roles solicitada
    let mensajeRol = "";

    // Guardamos el rol globalmente para usarlo en la UI
    currentUserRole = userData.role;

    // Configurar menú lateral según rol
    const menuUsers = document.getElementById('btn-users');
    const menuProducts = document.getElementById('btn-products');
    const menuInventory = document.getElementById('btn-inventory');

    if (currentUserRole === 'Operario') {
        menuUsers.classList.add('hidden');
        menuProducts.classList.add('hidden');
        menuInventory.classList.add('hidden');
    } else {
        menuUsers.classList.remove('hidden');
        menuProducts.classList.remove('hidden');
        menuInventory.classList.remove('hidden');
    }

    // 4. Mostrar Dashboard
    cambiarPantalla(false); // Ir al dashboard
}

async function manejarCierreSesion() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        emailInput.value = '';
        passwordInput.value = '';
        currentUserRole = null;
        targetUserIdToUpdate = null;
        cambiarPantalla(true); // Volver al login
    } else {
        alert("Error al cerrar sesión");
    }
}

// --- Event Listeners ---
loginForm.addEventListener('submit', manejarInicioSesion);
logoutBtn.addEventListener('click', manejarCierreSesion);

// Botones del menú
document.getElementById('btn-users').addEventListener('click', () => abrirWorkspace('workspace-users'));
document.getElementById('btn-products').addEventListener('click', () => abrirWorkspace('workspace-products'));
document.getElementById('btn-inventory').addEventListener('click', () => abrirWorkspace('workspace-inventory'));
document.getElementById('btn-registry').addEventListener('click', () => abrirWorkspace('workspace-registry'));
document.getElementById('btn-history').addEventListener('click', () => abrirWorkspace('workspace-history'));

// --- Lógica Gestión de Usuarios ---

function getRoleLevel(role) {
    if (role === 'Desarrollador') return 4;
    if (role === 'Administrador maestro') return 3;
    if (role === 'Administrador') return 2;
    return 1; // Operario
}

async function cargarUsuarios() {
    usersTableBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';

    // Seleccionamos name, role, email. Asumimos que estas columnas existen en public.users
    const { data, error } = await supabaseClient
        .from('users')
        .select('name, role, email')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error cargando usuarios:", error);
        usersTableBody.innerHTML = '<tr><td colspan="4">Error al cargar datos</td></tr>';
        return;
    }

    usersTableBody.innerHTML = '';

    if (data.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="4">No hay usuarios registrados</td></tr>';
        return;
    }

    data.forEach(user => {
        // Lógica de Jerarquía: Solo mostrar acciones si mi nivel > nivel del usuario objetivo
        const myLevel = getRoleLevel(currentUserRole);
        const targetLevel = getRoleLevel(user.role);

        let accionesHtml = '';
        
        // Si tengo mayor rango, puedo gestionar este usuario
        if (myLevel > targetLevel) {
            accionesHtml = `
                <button class="action-btn" title="Editar Datos" onclick="alert('Funcionalidad de editar datos de terceros pendiente')">✏️</button>
                <button class="action-btn" title="Cambiar Contraseña" onclick="abrirModalPassword('${user.id}')">🔒</button>
                <button class="action-btn" title="Eliminar Usuario" onclick="eliminarUsuario('${user.id}')">🗑️</button>
            `;
            // Nota: user.id no venía en el select original, necesitamos agregarlo al select de cargarUsuarios
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name || 'Sin nombre'}</td>
            <td>${user.role || 'Sin rol'}</td>
            <td>${user.email || 'Sin correo'}</td>
            <td>${accionesHtml}</td>
        `;
        usersTableBody.appendChild(row);
    });
}

// Modificar la consulta para incluir el ID
async function cargarUsuarios() {
    usersTableBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';

    usersCache = []; // Limpiar cache

    const { data, error } = await supabaseClient
        .from('users')
        .select('id, name, role, email') // Agregamos ID
        .neq('role', 'Desarrollador') // No mostrar desarrolladores en la lista
        .order('created_at', { ascending: false });

    // ... (resto de la función igual que arriba, asegurando usar la lógica de botones nueva)
    if (error) { /* ... */ return; }
    usersTableBody.innerHTML = '';
    if (data.length === 0) { /* ... */ return; }

    usersCache = data; // Guardar datos para usarlos al editar

    data.forEach(user => {
        const myLevel = getRoleLevel(currentUserRole);
        const targetLevel = getRoleLevel(user.role);
        let accionesHtml = '';
        if (myLevel > targetLevel) {
            accionesHtml = `
                <button class="action-btn" style="background-color:#ffc107" onclick="prepararEdicion('${user.id}')">✏️</button>
                <button class="action-btn" style="background-color:#17a2b8" onclick="abrirModalPassword('${user.id}')">🔒</button>
                <button class="action-btn" style="background-color:#dc3545" onclick="eliminarUsuario('${user.id}')">🗑️</button>
            `;
        }
        const row = document.createElement('tr');
        row.innerHTML = `<td>${user.name||'Sin nombre'}</td><td>${user.role||'Sin rol'}</td><td>${user.email||'Sin correo'}</td><td>${accionesHtml}</td>`;
        usersTableBody.appendChild(row);
    });
}

// Modal Nuevo Usuario
btnNewUser.addEventListener('click', () => {
    modalNewUser.classList.remove('hidden');
    modalMsg.textContent = '';
    formNewUser.reset();

    // Filtrar roles permitidos en el select de nuevo usuario
    const selectRole = document.getElementById('new-role');
    const myLevel = getRoleLevel(currentUserRole);

    Array.from(selectRole.options).forEach(opt => {
        if (opt.value === "") return; // Ignorar el placeholder
        const optLevel = getRoleLevel(opt.value);
        if (optLevel < myLevel) {
            opt.style.display = '';
        } else {
            opt.style.display = 'none';
        }
    });
});

closeModal.addEventListener('click', () => {
    modalNewUser.classList.add('hidden');
});

formNewUser.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalMsg.textContent = "Creando usuario...";
    
    const name = document.getElementById('new-name').value;
    const email = document.getElementById('new-email').value;
    const password = document.getElementById('new-password').value;
    const role = document.getElementById('new-role').value;

    // Llamada a la Edge Function
    const { data, error } = await supabaseClient.functions.invoke('create-user-admin', {
        body: { name, email, password, role }
    });

    if (error) {
        console.error(error);
        modalMsg.textContent = "Error: " + error.message;
    } else {
        alert("Usuario creado exitosamente");
        modalNewUser.classList.add('hidden');
        cargarUsuarios(); // Recargar tabla
    }
});

// --- Lógica Eliminar Usuario ---
window.eliminarUsuario = async (userId) => {
    if(!confirm("¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.")) return;

    const { data, error } = await supabaseClient.functions.invoke('delete-user-admin', {
        body: { target_id: userId }
    });

    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        alert("Usuario eliminado correctamente.");
        cargarUsuarios();
    }
};

// --- Lógica Editar Usuario (Terceros) ---
window.prepararEdicion = (userId) => {
    const user = usersCache.find(u => u.id === userId);
    if (!user) return;

    // Llenar formulario
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-name').value = user.name;
    document.getElementById('edit-email').value = user.email;
    
    // Filtrar roles permitidos en el select
    const selectRole = document.getElementById('edit-role');
    const myLevel = getRoleLevel(currentUserRole);

    Array.from(selectRole.options).forEach(opt => {
        if (opt.value === "") return;
        const optLevel = getRoleLevel(opt.value);
        // Solo puedo asignar roles inferiores a mi nivel
        if (optLevel < myLevel) {
            opt.style.display = '';
        } else {
            opt.style.display = 'none';
        }
    });
    
    selectRole.value = user.role;

    modalEditUser.classList.remove('hidden');
    modalEditMsg.textContent = '';
};

closeModalEdit.addEventListener('click', () => {
    modalEditUser.classList.add('hidden');
});

formEditUser.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalEditMsg.textContent = "Guardando cambios...";

    const targetId = document.getElementById('edit-user-id').value;
    const name = document.getElementById('edit-name').value;
    const email = document.getElementById('edit-email').value;
    const role = document.getElementById('edit-role').value;

    const { data, error } = await supabaseClient.functions.invoke('update-users-data', {
        body: { target_id: targetId, name, email, role }
    });

    if (error) {
        console.error(error);
        modalEditMsg.textContent = "Error: " + error.message;
    } else {
        alert("Usuario actualizado correctamente.");
        modalEditUser.classList.add('hidden');
        cargarUsuarios();
    }
});

// --- Lógica Cambiar Contraseña (Admin) ---

// Función para abrir modal desde la tabla (para otros usuarios)
window.abrirModalPassword = (userId) => {
    targetUserIdToUpdate = userId; // Guardamos a quién vamos a cambiar la pass
    modalChangePass.classList.remove('hidden');
    modalPassMsg.textContent = 'Cambiando contraseña de usuario ID: ' + userId.substring(0,8) + '...';
    formChangePass.reset();
}

btnChangePass.addEventListener('click', () => {
    targetUserIdToUpdate = null; // Null significa "cambiar mi propia contraseña"
    modalChangePass.classList.remove('hidden');
    modalPassMsg.textContent = 'Cambiando mi contraseña actual';
    formChangePass.reset();
});

closeModalPass.addEventListener('click', () => {
    modalChangePass.classList.add('hidden');
});

formChangePass.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalPassMsg.textContent = "Actualizando...";

    const newPass = document.getElementById('new-pass-admin').value;
    const confirmPass = document.getElementById('confirm-pass-admin').value;

    if (newPass !== confirmPass) {
        modalPassMsg.textContent = "Las contraseñas no coinciden.";
        return;
    }

    // Llamada a la Edge Function
    // Enviamos target_id si es para otro, o nada si es para mí
    const { data, error } = await supabaseClient.functions.invoke('update-user-password-admin', {
        body: { password: newPass, target_id: targetUserIdToUpdate }
    });

    if (error) {
        console.error(error);
        modalPassMsg.textContent = "Error: " + error.message;
    } else {
        alert("Contraseña actualizada exitosamente.");
        modalChangePass.classList.add('hidden');
    }
});

// --- Lógica Actualizar Datos (Admin) ---

btnUpdateData.addEventListener('click', async () => {
    modalUpdateData.classList.remove('hidden');
    modalUpdateMsg.textContent = 'Cargando datos actuales...';
    formUpdateData.reset();

    // Obtener datos actuales del usuario en sesión
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    // Consultar nombre actual en tabla users
    const { data: userData } = await supabaseClient
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

    document.getElementById('update-email').value = user.email;
    document.getElementById('update-name').value = userData?.name || '';
    modalUpdateMsg.textContent = '';
});

closeModalUpdate.addEventListener('click', () => {
    modalUpdateData.classList.add('hidden');
});

formUpdateData.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalUpdateMsg.textContent = "Guardando cambios...";

    const name = document.getElementById('update-name').value;
    const email = document.getElementById('update-email').value;

    const { data, error } = await supabaseClient.functions.invoke('update-admin-data', {
        body: { name, email }
    });

    if (error) {
        console.error(error);
        modalUpdateMsg.textContent = "Error: " + error.message;
    } else {
        alert("Datos actualizados. Si cambiaste el correo, usa el nuevo para iniciar sesión.");
        modalUpdateData.classList.add('hidden');
        cargarUsuarios(); // Refrescar tabla por si el admin estaba en la lista
    }
});

// --- Lógica Gestión de Productos ---

async function cargarProductos() {
    productsTableBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    productsCache = [];

    const { data, error } = await supabaseClient
        .from('products')
        .select('id, product, registration_date, measurement_unit')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error cargando productos:", error);
        productsTableBody.innerHTML = '<tr><td colspan="4">Error al cargar datos</td></tr>';
        return;
    }

    productsTableBody.innerHTML = '';

    if (!data || data.length === 0) {
        productsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Sin productos registrados</td></tr>';
        return;
    }

    productsCache = data;

    data.forEach(prod => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${prod.product}</td>
            <td>${prod.registration_date}</td>
            <td>${prod.measurement_unit}</td>
            <td>
                <button class="action-btn" style="background-color:#ffc107" title="Editar" onclick="prepararEdicionProducto('${prod.id}')">✏️</button>
                <button class="action-btn" style="background-color:#dc3545" title="Eliminar" onclick="eliminarProducto('${prod.id}')">🗑️</button>
            </td>
        `;
        productsTableBody.appendChild(row);
    });
}

// Abrir modal para nuevo producto
btnNewProduct.addEventListener('click', () => {
    modalProduct.classList.remove('hidden');
    document.getElementById('modal-product-title').textContent = "Nuevo Producto";
    modalProductMsg.textContent = '';
    formProduct.reset();
    document.getElementById('product-id').value = ''; // Limpiar ID para indicar creación
});

closeModalProduct.addEventListener('click', () => {
    modalProduct.classList.add('hidden');
});

// Guardar Producto (Crear o Editar)
formProduct.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalProductMsg.textContent = "Guardando...";

    const prodId = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value;
    const unit = document.getElementById('product-unit').value;

    // Datos base
    const productData = {
        product: name,
        measurement_unit: unit
    };

    let error = null;

    if (prodId) {
        // --- MODO EDICIÓN ---
        const { error: updateError } = await supabaseClient
            .from('products')
            .update(productData)
            .eq('id', prodId);
        error = updateError;
    } else {
        // --- MODO CREACIÓN ---
        // Usamos la fecha local del sistema para el registro (YYYY-MM-DD)
        // 'en-CA' formatea automáticamente a AAAA-MM-DD
        // Forzamos la zona horaria a Bogotá para evitar que tome UTC o la hora local del dispositivo si es incorrecta
        productData.registration_date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

        const { error: insertError } = await supabaseClient
            .from('products')
            .insert([productData]);
        error = insertError;
    }

    if (error) {
        console.error(error);
        modalProductMsg.textContent = "Error: " + error.message;
    } else {
        alert(prodId ? "Producto actualizado" : "Producto creado exitosamente");
        modalProduct.classList.add('hidden');
        cargarProductos();
    }
});

// Eliminar Producto
window.eliminarProducto = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    const { error } = await supabaseClient
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        cargarProductos();
    }
};

// Preparar Edición
window.prepararEdicionProducto = (id) => {
    const prod = productsCache.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('product-id').value = prod.id;
    document.getElementById('product-name').value = prod.product;
    document.getElementById('product-unit').value = prod.measurement_unit;

    document.getElementById('modal-product-title').textContent = "Editar Producto";
    modalProductMsg.textContent = '';
    modalProduct.classList.remove('hidden');
};

// --- Lógica Gestión de Inventario ---

async function cargarInventario() {
    inventoryTableBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    inventoryCache = [];

    // Aseguramos tener productos para saber las unidades si es necesario, 
    // aunque la tabla inventory guarda el nombre del producto.
    if (productsCache.length === 0) {
        await cargarProductosCache();
    }

    const { data, error } = await supabaseClient
        .from('inventory')
        .select('id, product, inventory_date, product_amount, measurement_unit')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error cargando inventario:", error);
        inventoryTableBody.innerHTML = '<tr><td colspan="4">Error al cargar datos</td></tr>';
        return;
    }

    inventoryTableBody.innerHTML = '';

    if (!data || data.length === 0) {
        inventoryTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Sin registros de inventario</td></tr>';
        return;
    }

    inventoryCache = data;

    data.forEach(item => {
        // Formatear solo el número para visualización
        const formattedAmount = new Intl.NumberFormat('es-CO').format(item.product_amount);
        const unit = item.measurement_unit || '';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.product}</td>
            <td>${item.inventory_date}</td>
            <td>${formattedAmount}</td>
            <td>${unit}</td>
            <td>
                <button class="action-btn" style="background-color:#ffc107" title="Editar" onclick="prepararEdicionInventario('${item.id}')">✏️</button>
                <button class="action-btn" style="background-color:#dc3545" title="Eliminar" onclick="eliminarInventario('${item.id}')">🗑️</button>
            </td>
        `;
        inventoryTableBody.appendChild(row);
    });
}

// Función auxiliar para cargar productos sin pintar la tabla de productos
async function cargarProductosCache() {
    const { data } = await supabaseClient.from('products').select('*');
    if (data) productsCache = data;
}

// Generar HTML de una fila de ingreso
function crearFilaInventario(esAdicional = false) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'inventory-row';
    
    // Select de Productos
    const select = document.createElement('select');
    select.required = true;
    select.innerHTML = '<option value="" disabled selected>Producto</option>';
    productsCache.forEach(p => {
        const option = document.createElement('option');
        option.value = p.product;
        option.dataset.unit = p.measurement_unit; // Guardamos la unidad en un data attribute
        option.textContent = p.product;
        select.appendChild(option);
    });

    // Input de Cantidad
    const input = document.createElement('input');
    input.type = 'text'; // Text para permitir puntos
    input.placeholder = 'Cantidad';
    input.required = true;
    
    // Span de Unidad
    const unitSpan = document.createElement('span');
    unitSpan.className = 'unit-display';
    unitSpan.textContent = '';

    // Evento para actualizar unidad al cambiar producto
    select.addEventListener('change', () => {
        const selectedOption = select.options[select.selectedIndex];
        unitSpan.textContent = selectedOption.dataset.unit || '';
    });

    // Evento para formatear números
    input.addEventListener('input', (e) => {
        // Eliminar todo lo que no sea número
        let val = e.target.value.replace(/\D/g, '');
        if (val) {
            // Formatear con puntos
            val = new Intl.NumberFormat('es-CO').format(parseInt(val));
        }
        e.target.value = val;
    });

    rowDiv.appendChild(select);
    rowDiv.appendChild(input);
    rowDiv.appendChild(unitSpan);

    // Botón borrar (solo si es adicional)
    if (esAdicional) {
        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.textContent = 'X';
        btnDel.className = 'btn-remove-row';
        btnDel.onclick = () => rowDiv.remove();
        rowDiv.appendChild(btnDel);
    }

    return rowDiv;
}

// Abrir Modal Ingreso
btnAddInventory.addEventListener('click', async () => {
    if (productsCache.length === 0) await cargarProductosCache();
    
    modalInventory.classList.remove('hidden');
    document.getElementById('modal-inventory-title').textContent = "Ingresar Inventario";
    document.getElementById('inventory-edit-id').value = ''; // Limpiar ID
    modalInventoryMsg.textContent = '';
    
    // Limpiar y agregar primera fila
    inventoryRowsContainer.innerHTML = '';
    inventoryRowsContainer.appendChild(crearFilaInventario(false));
    
    btnAddRow.classList.remove('hidden'); // Mostrar botón de agregar filas
});

// Agregar fila adicional
btnAddRow.addEventListener('click', () => {
    const currentRows = inventoryRowsContainer.querySelectorAll('.inventory-row').length;
    if (currentRows >= 10) {
        alert("Máximo 10 registros por ingreso.");
        return;
    }
    inventoryRowsContainer.appendChild(crearFilaInventario(true));
});

closeModalInventory.addEventListener('click', () => {
    modalInventory.classList.add('hidden');
});

// Guardar Inventario
formInventory.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalInventoryMsg.textContent = "Guardando...";

    const editId = document.getElementById('inventory-edit-id').value;
    const rows = inventoryRowsContainer.querySelectorAll('.inventory-row');
    const recordsToInsert = [];

    // Fecha actual Bogotá
    const todayBogota = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    rows.forEach(row => {
        const product = row.querySelector('select').value;
        const amountStr = row.querySelector('input').value;
        const unit = row.querySelector('.unit-display').textContent;

        if (product && amountStr) {
            recordsToInsert.push({
                product: product,
                product_amount: parseFloat(amountStr.replace(/\./g, '')), // Guardar como número
                measurement_unit: unit, // Guardar unidad aparte
                inventory_date: todayBogota
            });
        }
    });

    let error = null;

    if (editId) {
        // Edición (Solo un registro)
        const record = recordsToInsert[0]; // En edición solo hay una fila
        const { error: updateError } = await supabaseClient
            .from('inventory')
            .update({ 
                product: record.product, 
                product_amount: record.product_amount,
                measurement_unit: record.measurement_unit
            }) 
            .eq('id', editId);
        error = updateError;
    } else {
        // Inserción Múltiple
        const { error: insertError } = await supabaseClient
            .from('inventory')
            .insert(recordsToInsert);
        error = insertError;
    }

    if (error) {
        console.error(error);
        modalInventoryMsg.textContent = "Error: " + error.message;
    } else {
        alert("Inventario guardado exitosamente");
        modalInventory.classList.add('hidden');
        cargarInventario();
    }
});

// Eliminar Inventario
window.eliminarInventario = async (id) => {
    if (!confirm("¿Eliminar este registro de inventario?")) return;
    const { error } = await supabaseClient.from('inventory').delete().eq('id', id);
    if (error) alert("Error: " + error.message);
    else cargarInventario();
};

// Editar Inventario (Solo carga un registro en el modal)
window.prepararEdicionInventario = (id) => {
    const item = inventoryCache.find(i => i.id === id);
    if (!item) return;

    modalInventory.classList.remove('hidden');
    document.getElementById('modal-inventory-title').textContent = "Editar Inventario";
    document.getElementById('inventory-edit-id').value = item.id;
    modalInventoryMsg.textContent = '';

    // Preparar UI para edición (solo 1 fila, sin botón de agregar más)
    inventoryRowsContainer.innerHTML = '';
    const row = crearFilaInventario(false);
    inventoryRowsContainer.appendChild(row);
    btnAddRow.classList.add('hidden'); // Ocultar agregar filas en edición

    // Llenar datos
    const select = row.querySelector('select');
    const input = row.querySelector('input');
    const unitSpan = row.querySelector('.unit-display');

    select.value = item.product;
    // Disparar evento change manualmente para actualizar unidad
    const event = new Event('change');
    select.dispatchEvent(event);

    // Formatear valor
    // Viene como número, lo formateamos con puntos para el input
    input.value = new Intl.NumberFormat('es-CO').format(item.product_amount);
};

// --- Lógica Registro (Entradas/Salidas) ---

function resetRegistryForm() {
    btnTypeEntry.classList.remove('active');
    btnTypeExit.classList.remove('active');
    formRegistry.classList.add('hidden');
    formRegistry.reset();
    registryMsg.textContent = '';
    regUnitDisplay.textContent = '';
    document.getElementById('registry-type-value').value = '';
}

async function prepararFormularioRegistro(tipo) {
    // Asegurar productos cargados para el select
    if (inventoryCache.length === 0) {
        await cargarInventario(); // Esto llena inventoryCache
    }

    // Llenar select de productos desde INVENTARIO (solo productos existentes)
    // Usamos un Set para evitar duplicados si hubiera
    const uniqueProducts = [...new Set(inventoryCache.map(item => item.product))];
    
    regProductSelect.innerHTML = '<option value="" disabled selected hidden>Seleccione producto</option>';
    uniqueProducts.forEach(prodName => {
        const item = inventoryCache.find(i => i.product === prodName);
        const option = document.createElement('option');
        option.value = prodName;
        // Extraer unidad del string "1.000 Kg"
        const unit = item.measurement_unit;
        option.dataset.unit = unit;
        option.textContent = prodName;
        regProductSelect.appendChild(option);
    });

    formRegistry.classList.remove('hidden');
    document.getElementById('registry-type-value').value = tipo;
}

btnTypeEntry.addEventListener('click', () => {
    btnTypeEntry.classList.add('active');
    btnTypeExit.classList.remove('active');
    prepararFormularioRegistro('entrada');
});

btnTypeExit.addEventListener('click', () => {
    btnTypeExit.classList.add('active');
    btnTypeEntry.classList.remove('active');
    prepararFormularioRegistro('salida');
});

// Mostrar unidad al seleccionar producto
regProductSelect.addEventListener('change', () => {
    const option = regProductSelect.options[regProductSelect.selectedIndex];
    regUnitDisplay.textContent = option.dataset.unit || '';
});

// Validar input numérico
regAmountInput.addEventListener('input', (e) => {
    // Eliminar todo lo que no sea número
    let val = e.target.value.replace(/\D/g, '');
    if (val) {
        // Formatear con puntos de mil
        val = new Intl.NumberFormat('es-CO').format(parseInt(val, 10));
    }
    e.target.value = val;
});

// Validar Placa (Mayúsculas)
regPlateInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

// Enviar Registro
formRegistry.addEventListener('submit', async (e) => {
    e.preventDefault();
    registryMsg.textContent = "Procesando registro y subiendo imágenes...";
    
    const tipo = document.getElementById('registry-type-value').value;
    const product = regProductSelect.value;
    const amountVal = regAmountInput.value.replace(/\./g, ''); // Quitar puntos para enviar número puro
    const unit = regUnitDisplay.textContent;
    const plate = regPlateInput.value;
    const filePlate = regPhotoPlate.files[0];
    const fileInvoice = regPhotoInvoice.files[0];

    if (!filePlate) {
        registryMsg.textContent = "La foto de la placa es obligatoria.";
        return;
    }

    try {
        // 1. Subir Imágenes a Storage
        // Refuerzo de lógica: Selección estricta del bucket según el tipo
        let bucketName = '';
        if (tipo === 'entrada') {
            bucketName = 'entries';
        } else if (tipo === 'salida') {
            bucketName = 'exits';
        } else {
            throw new Error("Tipo de operación no válido. No se puede determinar el bucket de imágenes.");
        }

        const timestamp = Date.now();
        
        // Subir Placa
        const platePath = `placas/${timestamp}_${plate}.jpg`;
        const { data: plateData, error: plateError } = await supabaseClient.storage
            .from(bucketName)
            .upload(platePath, filePlate);
        
        if (plateError) throw new Error("Error subiendo foto placa: " + plateError.message);
        
        const plateUrl = supabaseClient.storage.from(bucketName).getPublicUrl(platePath).data.publicUrl;

        // Subir Factura (si existe)
        let invoiceUrl = null;
        if (fileInvoice) {
            const invoicePath = `facturas/${timestamp}_${plate}.jpg`;
            const { data: invData, error: invError } = await supabaseClient.storage
                .from(bucketName)
                .upload(invoicePath, fileInvoice);
            
            if (invError) throw new Error("Error subiendo foto factura: " + invError.message);
            
            invoiceUrl = supabaseClient.storage.from(bucketName).getPublicUrl(invoicePath).data.publicUrl;
        }

        // 2. Llamar a Edge Function
        const functionName = tipo === 'entrada' ? 'product_entry' : 'product_out';
        
        // Obtener nombre de usuario actual
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { data: userData } = await supabaseClient.from('users').select('name').eq('id', user.id).single();
        const userName = userData?.name || user.email;

        const payload = {
            user_id: user.id, // ID del usuario que registra
            user_name: userName,
            product: product,
            amount: amountVal, // Enviamos el valor numérico limpio
            unit: unit,        // Enviamos unidad aparte
            car_registration: plate,
            plate_photo_url: plateUrl,
            invoice_photo_url: invoiceUrl
        };

        const { data, error: functionError } = await supabaseClient.functions.invoke(functionName, {
            body: payload
        });

        // Si la función devuelve un error, lo lanzamos para que sea capturado por el bloque catch.
        if (functionError) {
            throw functionError;
        }

        alert(`Registro de ${tipo} exitoso.`);
        resetRegistryForm();
        // Actualizar inventario en cache visualmente
        cargarInventario();
        // Actualizar tabla de registros de hoy
        cargarRegistrosHoy();

    } catch (error) {
        console.error("Error al invocar la Edge Function:", error);
        // Extraemos el mensaje de error específico del cuerpo de la respuesta de la función.
        const functionResponse = await error.context.json();
        const specificMessage = functionResponse.error || error.message;
        registryMsg.textContent = "Error: " + specificMessage;
    }
});

// --- Función para Cargar Registros del Día (Entradas y Salidas) ---
async function cargarRegistrosHoy() {
    // 1. Crear o seleccionar el contenedor de la tabla dinámicamente
    let tableContainer = document.getElementById('registry-table-container');
    if (!tableContainer) {
        const workspace = document.getElementById('workspace-registry');
        tableContainer = document.createElement('div');
        tableContainer.id = 'registry-table-container';
        tableContainer.style.marginTop = '30px';
        
        const colRegistradoPor = '<th style="padding: 12px; border-bottom: 2px solid #dee2e6;">Registrado por</th>';

        tableContainer.innerHTML = `
            <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px;">Registros de Hoy</h3>
            <div style="overflow-x: auto;">
                <table class="styled-table" style="width:100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background-color: #f8f9fa; text-align: left;">
                            <th style="padding: 12px; border-bottom: 2px solid #dee2e6;">Tipo</th>
                            <th style="padding: 12px; border-bottom: 2px solid #dee2e6;">Producto</th>
                            <th style="padding: 12px; border-bottom: 2px solid #dee2e6;">Cantidad</th>
                            <th style="padding: 12px; border-bottom: 2px solid #dee2e6;">Placa</th>
                            <th style="padding: 12px; border-bottom: 2px solid #dee2e6;">Foto Placa</th>
                            <th style="padding: 12px; border-bottom: 2px solid #dee2e6;">Foto Factura</th>
                            ${colRegistradoPor}
                        </tr>
                    </thead>
                    <tbody id="registry-today-body"></tbody>
                </table>
            </div>
        `;
        workspace.appendChild(tableContainer);
    }

    const colspan = 7;
    const tbody = document.getElementById('registry-today-body');
    tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding: 20px;">Cargando registros...</td></tr>`;

    // 2. Definir rango de fecha (Hoy en Bogotá)
    const now = new Date();
    const options = { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayBogota = now.toLocaleDateString('en-CA', options); // Formato YYYY-MM-DD
    
    const startOfDay = `${todayBogota}T00:00:00`;
    const endOfDay = `${todayBogota}T23:59:59`;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();

        let entriesQuery = supabaseClient.from('product_entry').select('*').gte('created_at', startOfDay).lte('created_at', endOfDay);
        let exitsQuery = supabaseClient.from('product_out').select('*').gte('created_at', startOfDay).lte('created_at', endOfDay);


        // 3. Consultar Entradas y Salidas en paralelo
        const [resEntries, resExits] = await Promise.all([
            entriesQuery,
            exitsQuery
        ]);

        if (resEntries.error) throw resEntries.error;
        if (resExits.error) throw resExits.error;

        const allRecords = [];

        // Mapear Entradas
        (resEntries.data || []).forEach(e => {
            allRecords.push({
                type: 'Entrada',
                product: e.product,
                amount: e.amount_entry,
                unit: e.measurement_unit,
                plate: e.car_registration,
                plate_url: e.plate_photo_url,
                invoice_url: e.invoice_photo_url,
                created_at: e.created_at,
                user_name: e.user_name
            });
        });

        // Mapear Salidas
        (resExits.data || []).forEach(e => {
            allRecords.push({
                type: 'Salida',
                product: e.product,
                amount: e.amount_out,
                unit: e.measurement_unit,
                plate: e.car_registration,
                plate_url: e.plate_photo_url,
                invoice_url: e.invoice_photo_url,
                created_at: e.created_at,
                user_name: e.user_name
            });
        });

        // 4. Ordenar y Renderizar
        allRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        tbody.innerHTML = '';

        if (allRecords.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding: 20px; color: #666;">No hay registros el día de hoy</td></tr>`;
            return;
        }

        allRecords.forEach(rec => {
            const amountFmt = new Intl.NumberFormat('es-CO').format(rec.amount);
            
            const typeBadge = rec.type === 'Entrada' 
                ? '<span style="background:#d4edda; color:#155724; padding:4px 8px; border-radius:4px; font-weight:bold;">Entrada</span>' 
                : '<span style="background:#f8d7da; color:#721c24; padding:4px 8px; border-radius:4px; font-weight:bold;">Salida</span>';

            const btnPlate = rec.plate_url
                ? `<button onclick="abrirModalImagen('${rec.plate_url}')" style="display:inline-block; background:#17a2b8; color:white; padding:5px 10px; border:none; text-decoration:none; border-radius:4px; cursor:pointer;">Ver</button>`
                : '<span style="color:#ccc;">-</span>';
                
            const btnInvoice = rec.invoice_url
                ? `<button onclick="abrirModalImagen('${rec.invoice_url}')" style="display:inline-block; background:#17a2b8; color:white; padding:5px 10px; border:none; text-decoration:none; border-radius:4px; cursor:pointer;">Ver</button>`
                : '<button disabled style="background:#e9ecef; color:#adb5bd; border:none; padding:5px 10px; border-radius:4px; cursor:not-allowed;">Ver</button>';

            const userCell = `<td style="padding:12px;">${rec.user_name || 'N/A'}</td>`;

            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #eee';
            row.innerHTML = `
                <td style="padding:12px;">${typeBadge}</td>
                <td style="padding:12px;">${rec.product}</td>
                <td style="padding:12px;">${amountFmt} ${rec.unit}</td>
                <td style="padding:12px;">${rec.plate}</td>
                <td style="padding:12px;">${btnPlate}</td>
                <td style="padding:12px;">${btnInvoice}</td>
                ${userCell}
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Error cargando historial de hoy:", error);
        tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; color:red; padding: 20px;">Error al cargar registros</td></tr>`;
    }
}

// --- Lógica Modal de Imágenes ---
window.abrirModalImagen = (url) => {
    if (!url) return;
    modalImageContent.src = url;
    modalImageViewer.classList.remove('hidden');
};

closeModalImage.addEventListener('click', () => {
    modalImageViewer.classList.add('hidden');
    modalImageContent.src = ''; // Limpiar src para evitar que se vea la imagen anterior al abrir
});

// --- Lógica Historial ---

async function cargarHistorial() {
    const colspan = 8;
    if (!historyTableBody) return;
    historyTableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding: 20px;">Cargando historial...</td></tr>`;

    const filterType = historyFilterEntry.classList.contains('active') ? 'entrada' : (historyFilterExit.classList.contains('active') ? 'salida' : 'todos');
    const selectedDate = historyDateFilter.value;
    const selectedProduct = historyProductFilter.value; // Nuevo filtro

    try {
        const allPromises = [];

        if (filterType === 'entrada' || filterType === 'todos') {
            let query = supabaseClient.from('product_entry').select('*');
            if (selectedDate) {
                const startOfDay = `${selectedDate}T00:00:00`;
                const endOfDay = `${selectedDate}T23:59:59`;
                query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
            }
            if (selectedProduct) {
                query = query.eq('product', selectedProduct);
            }
            allPromises.push(query.then(res => ({...res, type: 'Entrada'})));
        }
        if (filterType === 'salida' || filterType === 'todos') {
            let query = supabaseClient.from('product_out').select('*');
            if (selectedDate) {
                const startOfDay = `${selectedDate}T00:00:00`;
                const endOfDay = `${selectedDate}T23:59:59`;
                query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
            }
            if (selectedProduct) {
                query = query.eq('product', selectedProduct);
            }
            allPromises.push(query.then(res => ({...res, type: 'Salida'})));
        }

        const resolvedPromises = await Promise.all(allPromises);

        const allRecords = [];
        resolvedPromises.forEach(result => {
            if (result.error) throw result.error;
            (result.data || []).forEach(rec => {
                allRecords.push({
                    type: result.type,
                    product: rec.product,
                    amount: rec.amount_entry || rec.amount_out,
                    unit: rec.measurement_unit,
                    plate: rec.car_registration,
                    plate_url: rec.plate_photo_url,
                    invoice_url: rec.invoice_photo_url,
                    user_name: rec.user_name,
                    created_at: rec.created_at
                });
            });
        });

        // Ordenar y Renderizar
        allRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        historyCache = allRecords; // Guardar en caché para exportación
        historyTableBody.innerHTML = '';

        if (allRecords.length === 0) {
            historyTableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding: 20px; color: #666;">No se encontraron registros con los filtros aplicados.</td></tr>`;
            return;
        }

        allRecords.forEach(rec => {
            const amountFmt = new Intl.NumberFormat('es-CO').format(rec.amount);
            const dateFmt = new Date(rec.created_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
            
            const typeBadge = rec.type === 'Entrada' 
                ? '<span style="background:#d4edda; color:#155724; padding:4px 8px; border-radius:4px; font-weight:bold;">Entrada</span>' 
                : '<span style="background:#f8d7da; color:#721c24; padding:4px 8px; border-radius:4px; font-weight:bold;">Salida</span>';

            const btnPlate = rec.plate_url ? `<button onclick="abrirModalImagen('${rec.plate_url}')" style="display:inline-block; background:#17a2b8; color:white; padding:5px 10px; border:none; border-radius:4px; cursor:pointer;">Ver</button>` : '<span style="color:#ccc;">-</span>';
            const btnInvoice = rec.invoice_url ? `<button onclick="abrirModalImagen('${rec.invoice_url}')" style="display:inline-block; background:#17a2b8; color:white; padding:5px 10px; border:none; border-radius:4px; cursor:pointer;">Ver</button>` : '<button disabled style="background:#e9ecef; color:#adb5bd; border:none; padding:5px 10px; border-radius:4px; cursor:not-allowed;">Ver</button>';

            const userCell = `<td style="padding:12px;">${rec.user_name || 'N/A'}</td>`;

            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #eee';
            row.innerHTML = `
                <td style="padding:12px;">${typeBadge}</td>
                <td style="padding:12px;">${dateFmt}</td>
                <td style="padding:12px;">${rec.product}</td>
                <td style="padding:12px;">${amountFmt} ${rec.unit}</td>
                <td style="padding:12px;">${rec.plate}</td>
                <td style="padding:12px;">${btnPlate}</td>
                <td style="padding:12px;">${btnInvoice}</td>
                ${userCell}
            `;
            historyTableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error cargando historial:", error);
        historyTableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; color:red; padding: 20px;">Error al cargar el historial.</td></tr>`;
    }
}

// Event Listeners para filtros de historial
historyFilterEntry.addEventListener('click', () => {
    historyFilterEntry.classList.toggle('active');
    if (historyFilterEntry.classList.contains('active')) historyFilterExit.classList.remove('active');
    cargarHistorial();
});

historyFilterExit.addEventListener('click', () => {
    historyFilterExit.classList.toggle('active');
    if (historyFilterExit.classList.contains('active')) historyFilterEntry.classList.remove('active');
    cargarHistorial();
});

historyDateFilter.addEventListener('change', cargarHistorial);

historyClearFilters.addEventListener('click', () => {
    historyFilterEntry.classList.remove('active');
    historyFilterExit.classList.remove('active');
    historyDateFilter.value = '';
    historyProductFilter.value = '';
    historyStockDisplay.textContent = "Stock: -";
    cargarHistorial();
});

// --- Lógica de Stock y Permisos ---

async function verificarPermisosStock() {
    // 1. Cargar lista de productos en el select (siempre necesario si se va a mostrar)
    if (inventoryCache.length === 0) await cargarInventario();
    const uniqueProducts = [...new Set(inventoryCache.map(item => item.product))];
    
    historyProductFilter.innerHTML = '<option value="" disabled selected hidden>Seleccione producto</option>';
    uniqueProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        historyProductFilter.appendChild(opt);
    });

    // 2. Determinar visibilidad
    const isAdminOrDev = ['Desarrollador', 'Administrador maestro', 'Administrador'].includes(currentUserRole);
    
    if (isAdminOrDev) {
        // Admins ven todo
        historyProductFilter.classList.remove('hidden');
        historyStockDisplay.classList.remove('hidden');
        btnManageStock.classList.remove('hidden');
        btnExportExcel.classList.remove('hidden');
        btnExportWord.classList.remove('hidden');
    } else {
        // Operarios: Consultar tabla de permisos
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { data, error } = await supabaseClient
            .from('stock_permissions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (data) {
            // Tiene permiso
            historyProductFilter.classList.remove('hidden');
            historyStockDisplay.classList.remove('hidden');
            btnManageStock.classList.add('hidden'); // No puede gestionar, solo ver
            // Operarios con permiso de ver stock NO pueden exportar
            btnExportExcel.classList.add('hidden');
            btnExportWord.classList.add('hidden');
        } else {
            // No tiene permiso
            historyProductFilter.classList.add('hidden');
            historyStockDisplay.classList.add('hidden');
            btnManageStock.classList.add('hidden');
            btnExportExcel.classList.add('hidden');
            btnExportWord.classList.add('hidden');
        }
    }
}

// Calcular Stock al cambiar producto
historyProductFilter.addEventListener('change', async () => {
    const product = historyProductFilter.value;
    
    // Filtrar la tabla
    cargarHistorial();

    if (!product) {
        historyStockDisplay.textContent = "Stock: -";
        return;
    }

    historyStockDisplay.textContent = "Calculando...";

    try {
        // Calcular Stock: (Suma Inventario Inicial) + (Suma Entradas) - (Suma Salidas)
        
        // El inventario ya se actualiza con cada entrada/salida, por lo que solo necesitamos leer su valor actual.
        const { data: invData, error } = await supabaseClient.from('inventory').select('product_amount, measurement_unit').eq('product', product);
        if (error) throw error;

        const totalInv = invData.reduce((acc, curr) => acc + (curr.product_amount || 0), 0);
        const unit = invData.length > 0 ? invData[0].measurement_unit : '';

        const currentStock = totalInv;
        const stockFmt = new Intl.NumberFormat('es-CO').format(currentStock);

        historyStockDisplay.textContent = `Stock: ${stockFmt} ${unit}`;

    } catch (error) {
        console.error("Error calculando stock", error);
        historyStockDisplay.textContent = "Stock: Error";
    }
});

// --- Lógica de Exportación (Excel / Word) ---

async function exportarHistorial(tipo) {
    if (!historyCache || historyCache.length === 0) {
        alert("No hay datos para exportar");
        return;
    }

    // Obtener datos del usuario y fecha
    const { data: { user } } = await supabaseClient.auth.getUser();
    let downloaderName = user.email;
    if (user.user_metadata && user.user_metadata.name) {
        downloaderName = user.user_metadata.name;
    } else {
        const { data: uData } = await supabaseClient.from('users').select('name').eq('id', user.id).single();
        if (uData && uData.name) downloaderName = uData.name;
    }
    const downloadDate = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

    // Consultar Stock Completo directo de la Base de Datos
    const { data: fullInventory } = await supabaseClient.from('inventory').select('product, product_amount, measurement_unit').order('product');

    // --- EXPORTACIÓN A EXCEL (Nativo .xlsx) ---
    if (tipo === 'excel') {
        const workbook = new ExcelJS.Workbook();
        workbook.calcProperties.fullCalcOnLoad = true; // Obliga a Excel a ejecutar las fórmulas (imágenes) tras habilitar contenido
        const worksheet = workbook.addWorksheet('Historial');

        // Estilos
        const headerStyle = { 
            font: { bold: true, color: { argb: 'FFFFFFFF' } }, 
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007BFF' } },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }
        };
        
        const cellStyle = {
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }
        };

        // 1. Encabezado del Reporte
        worksheet.addRow(['Reporte de Historial - Welders Industry']).font = { bold: true, size: 14 };
        worksheet.addRow([`Fecha de descarga: ${downloadDate}`]);
        worksheet.addRow([`Descargado por: ${downloaderName}`]);
        worksheet.addRow([]); // Espacio

        // 2. Sección de Stock (Todos los productos)
        worksheet.addRow(['Inventario Actual (Todos los productos)']).font = { bold: true, size: 12 };
        const stockHeader = worksheet.addRow(['Producto', 'Cantidad', 'Unidad']);
        stockHeader.eachCell(cell => { cell.style = headerStyle; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } }; });

        if (fullInventory) {
            fullInventory.forEach(item => {
                const row = worksheet.addRow([item.product, item.product_amount, item.measurement_unit]);
                row.eachCell(cell => cell.style = cellStyle);
            });
        }
        worksheet.addRow([]); // Espacio

        // 3. Sección de Historial
        worksheet.addRow(['Detalle de Movimientos']).font = { bold: true, size: 12 };
        const histHeader = worksheet.addRow(['Tipo', 'Fecha', 'Producto', 'Cantidad', 'Placa', 'Foto Placa', 'Foto Factura', 'Registrado por']);
        histHeader.eachCell(cell => cell.style = headerStyle);

        historyCache.forEach(rec => {
            const dateFmt = new Date(rec.created_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
            const amountFmt = new Intl.NumberFormat('es-CO').format(rec.amount);

            const row = worksheet.addRow([
                rec.type,
                dateFmt,
                rec.product,
                amountFmt + ' ' + rec.unit,
                rec.plate,
                '', // Espacio para fórmula imagen
                '', // Espacio para fórmula imagen
                rec.user_name || 'N/A'
            ]);

            // Insertar Imágenes usando fórmula nativa de Excel
            if (rec.plate_url) {
                row.getCell(6).value = { formula: `IF(NOW()>0, _xlfn.IMAGE("${rec.plate_url}"), "")` };
            } else {
                row.getCell(6).value = '-';
            }

            if (rec.invoice_url) {
                row.getCell(7).value = { formula: `IF(NOW()>0, _xlfn.IMAGE("${rec.invoice_url}"), "")` };
            } else {
                row.getCell(7).value = '-';
            }

            row.height = 120; // Altura suficiente para ver la imagen (Doble)
            row.eachCell(cell => cell.style = cellStyle);
        });

        // Ajustar anchos de columna
        worksheet.columns = [
            { width: 15 }, { width: 15 }, { width: 25 }, { width: 15 }, 
            { width: 15 }, { width: 40 }, { width: 40 }, { width: 25 }
        ];

        // Generar y descargar
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Historial_Welders_${new Date().toISOString().slice(0,10)}.xlsx`);
        return;
    }

    // --- EXPORTACIÓN A WORD (HTML) ---
    // Construimos el HTML para Word incluyendo la tabla de stock
    
    // Estilos optimizados para Word: Hoja horizontal y tabla ajustada
    const wordStyles = `
        <style>
            @page {
                size: A4 landscape;
                margin: 1cm;
            }
            body { font-family: Arial, sans-serif; font-size: 10pt; }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                table-layout: fixed; /* Fuerza a la tabla a respetar el ancho de la hoja */
            }
            td, th { 
                border: 1px solid #000; 
                padding: 4px; 
                vertical-align: middle; 
                text-align: center; 
                word-wrap: break-word; /* Ajuste de texto */
            }
            th { background-color: #e9ecef; font-weight: bold; }
            img {
                max-width: 100%;
                height: auto;
            }
        </style>
    `;
    
    let stockTableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;"><thead><tr style="background-color: #6c757d; color: white;"><th>Producto</th><th>Cantidad</th><th>Unidad</th></tr></thead><tbody>';
    if (fullInventory) {
        fullInventory.forEach(item => {
            stockTableHTML += `<tr><td style="padding:5px;">${item.product}</td><td style="padding:5px;">${item.product_amount}</td><td style="padding:5px;">${item.measurement_unit}</td></tr>`;
        });
    }
    stockTableHTML += '</tbody></table>';

    let tableHTML = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            ${wordStyles}
        </head>
        <body>
            <div style="width: 100%;">
                <h2 style="text-align: left; margin-bottom: 5px;">Reporte de Historial - Welders Industry</h2>
                <p style="margin: 0;"><b>Fecha de descarga:</b> ${downloadDate}</p>
                <p style="margin: 0;"><b>Descargado por:</b> ${downloaderName}</p>
                <br>
            </div>
            
            <h3>Inventario Actual</h3>
            ${stockTableHTML}

            <h3>Detalle de Movimientos</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 8%;">Tipo</th>
                        <th style="width: 12%;">Fecha</th>
                        <th style="width: 15%;">Producto</th>
                        <th style="width: 10%;">Cantidad</th>
                        <th style="width: 10%;">Placa</th>
                        <th style="width: 15%;">Foto Placa</th>
                        <th style="width: 15%;">Foto Factura</th>
                        <th style="width: 15%;">Registrado por</th>
                    </tr>
                </thead>
                <tbody>
    `;

    historyCache.forEach(rec => {
        const amountFmt = new Intl.NumberFormat('es-CO').format(rec.amount);
        const dateFmt = new Date(rec.created_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
        
        // Para Word usamos etiquetas IMG normales con tamaño reducido para no romper la tabla
        const plateCellContent = rec.plate_url ? `<img src="${rec.plate_url}" width="90" height="90">` : '-';
        const invoiceCellContent = rec.invoice_url ? `<img src="${rec.invoice_url}" width="90" height="90">` : '-';

        tableHTML += `<tr>
            <td>${rec.type}</td>
            <td>${dateFmt}</td>
            <td>${rec.product}</td>
            <td>${amountFmt} ${rec.unit}</td>
            <td>${rec.plate}</td>
            <td>${plateCellContent}</td>
            <td>${invoiceCellContent}</td>
            <td>${rec.user_name || 'N/A'}</td>
        </tr>`;
    });

    tableHTML += '</tbody></table></body></html>';

    // Descargar Word
    const mime = 'application/msword';
    const extension = 'doc';
    
    const blob = new Blob(['<meta charset="UTF-8">' + tableHTML], { type: mime });
    saveAs(blob, `Historial_Welders_${new Date().toISOString().slice(0,10)}.${extension}`);
}

btnExportExcel.addEventListener('click', () => exportarHistorial('excel'));
btnExportWord.addEventListener('click', () => exportarHistorial('word'));

// --- Gestión de Permisos (Modal) ---

btnManageStock.addEventListener('click', async () => {
    modalStockPermissions.classList.remove('hidden');
    stockPermissionsList.innerHTML = 'Cargando operarios...';

    // 1. Obtener Operarios
    const { data: operarios } = await supabaseClient
        .from('users')
        .select('id, name, email')
        .eq('role', 'Operario');

    // 2. Obtener Permisos Actuales
    const { data: permisos } = await supabaseClient
        .from('stock_permissions')
        .select('user_id');
    
    const permittedIds = permisos.map(p => p.user_id);

    stockPermissionsList.innerHTML = '';

    if (!operarios || operarios.length === 0) {
        stockPermissionsList.innerHTML = '<p>No hay operarios registrados.</p>';
        return;
    }

    operarios.forEach(op => {
        const div = document.createElement('div');
        div.style.padding = '8px';
        div.style.borderBottom = '1px solid #eee';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '10px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = op.id;
        checkbox.dataset.name = op.name || op.email;
        checkbox.checked = permittedIds.includes(op.id);
        checkbox.style.width = 'auto'; // Resetear estilo global de input
        checkbox.style.margin = '0';

        const label = document.createElement('label');
        label.textContent = op.name || op.email;

        div.appendChild(checkbox);
        div.appendChild(label);
        stockPermissionsList.appendChild(div);
    });
});

closeModalStock.addEventListener('click', () => {
    modalStockPermissions.classList.add('hidden');
});

btnSaveStockPermissions.addEventListener('click', async () => {
    btnSaveStockPermissions.textContent = "Guardando...";
    const checkboxes = stockPermissionsList.querySelectorAll('input[type="checkbox"]');
    
    const promises = [];

    checkboxes.forEach(cb => {
        const userId = cb.value;
        const userName = cb.dataset.name;
        const isChecked = cb.checked;

        if (isChecked) {
            // Intentar insertar (si ya existe, no pasa nada o se puede manejar con upsert, 
            // pero como no tenemos unique constraint explicito en user_id en el create table simple,
            // hacemos select primero o borramos e insertamos. 
            // Estrategia simple: Select para ver si existe, si no, insert.
            const p = supabaseClient.from('stock_permissions').select('id').eq('user_id', userId).single()
                .then(({ data }) => {
                    if (!data) {
                        return supabaseClient.from('stock_permissions').insert([{ user_id: userId, name: userName }]);
                    }
                });
            promises.push(p);
        } else {
            // Borrar si existe
            promises.push(supabaseClient.from('stock_permissions').delete().eq('user_id', userId));
        }
    });

    await Promise.all(promises);
    
    alert("Permisos actualizados correctamente.");
    btnSaveStockPermissions.textContent = "Guardar Permisos";
    modalStockPermissions.classList.add('hidden');
});

// --- Persistencia de Sesión (Recargar página sin perder login) ---
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar si existe una sesión activa en Supabase
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        const userId = session.user.id;
        
        // Recuperar rol del usuario desde la base de datos
        const { data: userData, error } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();
        
        if (userData) {
            currentUserRole = userData.role;

            // Configurar menú lateral según rol (Misma lógica que en login)
            const menuUsers = document.getElementById('btn-users');
            const menuProducts = document.getElementById('btn-products');
            const menuInventory = document.getElementById('btn-inventory');

            if (currentUserRole === 'Operario') {
                menuUsers.classList.add('hidden');
                menuProducts.classList.add('hidden');
                menuInventory.classList.add('hidden');
            } else {
                menuUsers.classList.remove('hidden');
                menuProducts.classList.remove('hidden');
                menuInventory.classList.remove('hidden');
            }

            // Restaurar pantalla principal
            cambiarPantalla(false);
        }
    }
});