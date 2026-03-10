// Configuración de Supabase con las credenciales proporcionadas
const supabaseUrl = 'https://nijeskvnylwyjewsausq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamVza3ZueWx3eWpld3NhdXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDA0NDQsImV4cCI6MjA4ODU3NjQ0NH0.6yv3QpX2UH_Lklve1rBtsX13St_7LI97WDseEqACNUo';

// Inicializar cliente (usamos window.supabase que viene del CDN)
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Elementos del DOM
const loginBtn = document.getElementById('login-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const adminMenu = document.getElementById('admin-menu');
const mainContent = document.getElementById('main-content');
const logoutBtn = document.getElementById('logout-btn');
const createUserModal = document.getElementById('create-user-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalOverlay = document.getElementById('modal-overlay');
const updateUserModal = document.getElementById('update-user-modal');
const changePasswordModal = document.getElementById('change-password-modal');
const deleteUserModal = document.getElementById('delete-user-modal');
const closeUpdateModalBtn = document.getElementById('close-update-modal-btn');
const closePasswordModalBtn = document.getElementById('close-password-modal-btn');
const closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
// Elementos del Modal de Mensajes
const messageModal = document.getElementById('message-modal');
const messageModalTitle = document.getElementById('message-modal-title');
const messageModalText = document.getElementById('message-modal-text');
// Elementos del Modal de Mapa
const mapModal = document.getElementById('map-modal');
const closeMapModalBtn = document.getElementById('close-map-modal-btn');
const mapContainer = document.getElementById('map-container');
const mapModalTitle = document.getElementById('map-modal-title');
// Elementos del Modal de Fecha
const dateSelectModal = document.getElementById('date-select-modal');
const closeDateModalBtn = document.getElementById('close-date-modal-btn');
const applyDateFilterBtn = document.getElementById('apply-date-filter-btn');
const dateTabs = document.querySelectorAll('.tab-btn');
const dateTabContents = document.querySelectorAll('.tab-content');

let currentUserProfile = null; // Variable global para guardar el perfil del usuario logueado
let currentOkHandler; // Handler para el botón OK del modal de mensajes

// Estado global para los filtros del historial
let historyFilters = {
    operator: 'all',
    type: 'all', // 'all', 'Entrada', 'Salida'
    dateType: 'none', // 'none', 'specific', 'range', 'month'
    startDate: null,
    endDate: null
};

// Variable para almacenar los datos del historial y no tener que pedirlos a la BD en cada filtro de tipo
let fullHistoryData = [];

// Función para verificar permisos en la base de datos
async function verifyUserPermissions(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('name, role, is_admin')
            .eq('id', userId);

        if (error) throw error;

        // Si encontramos un perfil para el usuario (el array de datos no está vacío)
        if (data && data.length > 0) {
            currentUserProfile = data[0]; // Guardamos el perfil del usuario
            
            // 1. Ocultar Login y Mostrar Dashboard
            loginContainer.classList.add('hidden');
            dashboardContainer.classList.remove('hidden');
            document.body.style.height = 'auto'; // Resetear altura del body
            document.body.style.display = 'block'; // Resetear flex del body

            // 2. Verificar permisos para mostrar menú de admins
            const isOperator = currentUserProfile.role === 'Operario';
            const isAdminOrDev = ['Administrador Maestro', 'Administrador', 'Desarrollador'].includes(currentUserProfile.role) || currentUserProfile.is_admin === true;

            if (isOperator) {
                // Lógica para Operario: Ocultar menú, centrar logo y cargar vista de asistencia.
                adminMenu.classList.add('hidden');
                document.getElementById('top-navbar').classList.add('operator-view');
                loadView('asistencia');
            } else if (isAdminOrDev) {
                // Lógica para Admins/Devs: Mostrar menú y vista de bienvenida.
                adminMenu.classList.remove('hidden');
                document.getElementById('top-navbar').classList.remove('operator-view');
                document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));
                document.getElementById('welcome-view').classList.remove('hidden');
            }

        } else {
            // Si no se encuentra un perfil, mostramos el ID para facilitar la depuración y mencionamos RLS
            throw new Error(`Login exitoso, pero no se pudo leer el perfil del usuario.\nCausa probable: Políticas de seguridad (RLS) bloqueando la lectura.`);
        }
    } catch (err) {
        console.error('Error verificando permisos:', err);
        errorMessage.textContent = `Error al verificar permisos: ${err.message}`;
    }
}

// Función para cargar vistas en el contenido principal
async function loadView(viewName) {
    // Ocultar todas las vistas principales
    document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));

    const targetViewId = `${viewName}-view`;
    const targetView = document.getElementById(targetViewId);

    if (!targetView) {
        console.error(`No se encontró el contenedor de la vista: ${targetViewId}`);
        mainContent.innerHTML = `<p>Error: Vista '${viewName}' no encontrada.</p>`;
        return;
    }

    targetView.classList.remove('hidden');

    // Para vistas que no son el historial, mostramos un 'Cargando...' general.
    // El historial tiene su propio estado de carga dentro de la tabla.
    if (viewName !== 'historial') {
        targetView.innerHTML = '<h2>Cargando...</h2>';
    }

    if (viewName === 'clientes') {
        targetView.innerHTML = `<h2>Gestión de Clientes (En construcción)</h2>`;
    } else if (viewName === 'usuarios') {
        try {
            // Leemos los usuarios de la tabla 'users'
            const { data: users, error } = await supabaseClient
                .from('users')
                .select('id, name, email, role')
                // Mostrar solo los roles de Administrador Maestro hacia abajo, excluyendo a los desarrolladores.
                .in('role', ['Administrador Maestro', 'Administrador', 'Operario']); 

            if (error) throw error;

            // Construimos la tabla HTML
            let viewHtml = `
                <div class="view-header">
                    <h2>Gestión de Usuarios</h2>
                    <button id="show-create-user-modal-btn" class="action-btn">Crear Usuario</button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Rol</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            users.forEach(user => {
                viewHtml += `
                    <tr>
                        <td>${user.name || ''}</td>
                        <td>${user.email || ''}</td>
                        <td>${user.role || ''}</td>
                        <td>
                            <button class="table-btn edit-btn" onclick="openUpdateModal('${user.id}', '${user.name.replace(/'/g, "\\'")}', '${user.email.replace(/'/g, "\\'")}', '${user.role.replace(/'/g, "\\'")}')">Editar</button>
                            <button class="table-btn password-btn" onclick="openPasswordModal('${user.id}')">Contraseña</button>
                            <button class="table-btn delete-btn" onclick="openDeleteModal('${user.id}')">Borrar</button>
                        </td>
                    </tr>
                `;
            });

            viewHtml += `</tbody></table>`;
            targetView.innerHTML = viewHtml;

            // Añadir evento al nuevo botón después de que exista en el DOM
            document.getElementById('show-create-user-modal-btn').addEventListener('click', openCreateUserModal);

        } catch (err) {
            targetView.innerHTML = `<p style="color: red;">Error al cargar los usuarios: ${err.message}</p>`;
        }
    } else if (viewName === 'historial') {
        // Lógica de la vista de Historial (sin cambios en esta sección)
        const operatorFilter = document.getElementById('operator-filter');
        const dateFilterBtn = document.getElementById('date-filter-btn');
        const workedDaysCounter = document.getElementById('worked-days-counter');
        const filterEntradaBtn = document.getElementById('filter-type-entrada');
        const filterSalidaBtn = document.getElementById('filter-type-salida');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        const exportBtn = document.getElementById('export-report-btn');

        // 1. Poblar el dropdown de operarios
        try {
            const { data: operators, error } = await supabaseClient
                .from('users')
                .select('name')
                .eq('role', 'Operario');
            if (error) throw error;

            operatorFilter.innerHTML = '<option value="all">Todos</option>';
            operators.forEach(op => {
                const option = document.createElement('option');
                option.value = op.name;
                option.textContent = op.name;
                operatorFilter.appendChild(option);
            });
        } catch (err) {
            console.error("Error al cargar operarios:", err);
        }

        // 2. Configurar Event Listeners para los filtros
        operatorFilter.addEventListener('change', (e) => {
            historyFilters.operator = e.target.value;
            fetchAndRenderHistory();
        });

        dateFilterBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('hidden');
            dateSelectModal.classList.remove('hidden');
        });

        filterEntradaBtn.addEventListener('click', () => {
            historyFilters.type = 'Entrada';
            renderHistoryTable(fullHistoryData); // Re-render con los datos en memoria
        });

        filterSalidaBtn.addEventListener('click', () => {
            historyFilters.type = 'Salida';
            renderHistoryTable(fullHistoryData); // Re-render con los datos en memoria
        });

        clearFiltersBtn.addEventListener('click', () => {
            historyFilters = { operator: 'all', type: 'all', dateType: 'none', startDate: null, endDate: null };
            operatorFilter.value = 'all';
            dateFilterBtn.textContent = 'Cualquier fecha';
            fetchAndRenderHistory();
        });

        exportBtn.addEventListener('click', exportToExcel);

        // Lógica del modal de fecha
        dateTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                dateTabs.forEach(t => t.classList.remove('active'));
                dateTabContents.forEach(c => c.classList.add('hidden'));
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-date-tab`).classList.remove('hidden');
            });
        });

        applyDateFilterBtn.addEventListener('click', () => {
            const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
            const dateFilterBtn = document.getElementById('date-filter-btn');
            
            if (activeTab === 'specific') {
                const specificDate = document.getElementById('specific-date-input').value;
                if (!specificDate) return;
                historyFilters.dateType = 'specific';
                historyFilters.startDate = specificDate;
                historyFilters.endDate = specificDate;
                dateFilterBtn.textContent = new Date(specificDate).toLocaleDateString('es-ES', { timeZone: 'UTC' });
            } else if (activeTab === 'range') {
                const startDate = document.getElementById('range-start-date-input').value;
                const endDate = document.getElementById('range-end-date-input').value;
                if (!startDate || !endDate) return;
                historyFilters.dateType = 'range';
                historyFilters.startDate = startDate;
                historyFilters.endDate = endDate;
                dateFilterBtn.textContent = `${new Date(startDate).toLocaleDateString('es-ES')} - ${new Date(endDate).toLocaleDateString('es-ES')}`;
            } else if (activeTab === 'month') {
                const monthValue = document.getElementById('month-date-input').value;
                if (!monthValue) return;
                const [year, month] = monthValue.split('-').map(Number);
                historyFilters.dateType = 'month';
                historyFilters.startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                historyFilters.endDate = new Date(year, month, 0).toISOString().slice(0, 10);
                dateFilterBtn.textContent = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
            }

            closeAllModals();
            fetchAndRenderHistory();
        });

        // 3. Carga inicial de datos
        fetchAndRenderHistory();

    } else if (viewName === 'asistencia') {
        const isOperator = currentUserProfile.role === 'Operario';

        if (isOperator) {
            // VISTA PARA OPERARIOS
            targetView.innerHTML = `
                <div id="attendance-form-container">
                    <h2>Registro de Asistencia</h2>
                    <div class="attendance-selection-container">
                        <button id="entrada-btn" class="action-btn">Entrada</button>
                        <button id="salida-btn" class="action-btn">Salida</button>
                    </div>
                </div>
            `;
            document.getElementById('entrada-btn').addEventListener('click', () => renderAttendanceForm('entrada'));
            document.getElementById('salida-btn').addEventListener('click', () => renderAttendanceForm('salida'));
        } else {
            // VISTA PARA ADMINISTRADORES - Selección inicial
            targetView.innerHTML = `
                <div id="attendance-form-container">
                    <h2>Asistencia Manual (Admin)</h2>
                    <div class="attendance-selection-container">
                        <button id="admin-entrada-btn" class="action-btn">Entrada</button>
                        <button id="admin-salida-btn" class="action-btn">Salida</button>
                    </div>
                </div>
            `;
            document.getElementById('admin-entrada-btn').addEventListener('click', () => renderAdminAttendanceForm('entrada'));
            document.getElementById('admin-salida-btn').addEventListener('click', () => renderAdminAttendanceForm('salida'));
        }

    } else {
        targetView.innerHTML = `
            <div style="text-align: center; margin-top: 50px;">
                <h2>🚧 En construcción 🚧</h2>
                <p>La sección <strong>${viewName.charAt(0).toUpperCase() + viewName.slice(1)}</strong> estará disponible pronto.</p>
            </div>
        `;
    }
}

async function fetchAndRenderHistory() {
    const tableBody = document.getElementById('history-table-body');
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Cargando historial...</td></tr>`;
    document.getElementById('worked-days-counter').textContent = '--';

    try {
        // Construir queries
        let attendanceQuery = supabaseClient.from('attendance').select('user_name, date, day, hour, location');
        let exitQuery = supabaseClient.from('exit').select('user_name, date, day, hour, location, marked');

        // Aplicar filtro de operario
        if (historyFilters.operator !== 'all') {
            attendanceQuery = attendanceQuery.eq('user_name', historyFilters.operator);
            exitQuery = exitQuery.eq('user_name', historyFilters.operator);
        }

        // Aplicar filtro de fecha
        if (historyFilters.startDate && historyFilters.endDate) {
            attendanceQuery = attendanceQuery.gte('date', historyFilters.startDate).lte('date', historyFilters.endDate);
            exitQuery = exitQuery.gte('date', historyFilters.startDate).lte('date', historyFilters.endDate);
        }

        const [{ data: attendanceData, error: attendanceError }, { data: exitData, error: exitError }] = await Promise.all([
            attendanceQuery,
            exitQuery
        ]);

        if (attendanceError) throw attendanceError;
        if (exitError) throw exitError;

        // Combinar y formatear los datos
        const combinedData = [
            ...attendanceData.map(item => ({ ...item, type: 'Entrada' })),
            ...exitData.map(item => ({ ...item, type: 'Salida' }))
        ].filter(item => item.date && item.hour);

        fullHistoryData = combinedData; // Guardar datos completos para filtros de tipo
        renderHistoryTable(fullHistoryData);

        // Calcular días trabajados si un operario está seleccionado
        if (historyFilters.operator !== 'all') {
            calculateWorkedDays(historyFilters.operator, historyFilters.startDate, historyFilters.endDate);
        }

    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar el historial: ${err.message}</td></tr>`;
    }
}

function formatTo12Hour(timeString) {
    if (!timeString || !timeString.includes(':')) return '';
    // Assuming timeString is in 'HH:mm:ss' format
    const [hours, minutes, seconds] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    date.setSeconds(parseInt(seconds, 10) || 0);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
}

function renderHistoryTable(data) {
    const tableBody = document.getElementById('history-table-body');

    // Aplicar filtro de tipo (Entrada/Salida)
    const filteredData = data.filter(item => {
        if (historyFilters.type === 'all') return true;
        return item.type === historyFilters.type;
    });

    // Ordenar por fecha y hora
    filteredData.sort((a, b) => {
        const dateComparison = b.date.localeCompare(a.date);
        if (dateComparison !== 0) return dateComparison;
        return b.hour.localeCompare(a.hour);
    });

    let rowsHtml = '';
    if (filteredData.length === 0) {
        rowsHtml = `<tr><td colspan="6" style="text-align: center;">No se encontraron registros con los filtros aplicados.</td></tr>`;
    } else {
        filteredData.forEach(record => {
            rowsHtml += `
                <tr>
                    <td>${record.user_name || ''}</td>
                    <td><span class="record-type-${record.type.toLowerCase()}">${record.type}</span></td>
                    <td>${record.date || ''}</td>
                    <td>${formatTo12Hour(record.hour)}</td>
                    <td>${record.day || ''}</td>
                    <td>
                        ${record.location ? `<button class="table-btn" onclick="openMapModal('${record.location}', '${record.type}')">Ver</button>` : 'N/A'}
                    </td>
                </tr>`;
        });
    }
    tableBody.innerHTML = rowsHtml;
}

async function calculateWorkedDays(operator, startDate, endDate) {
    const counterElement = document.getElementById('worked-days-counter');
    counterElement.textContent = 'Calculando...';

    try {
        let attendanceQuery = supabaseClient.from('attendance').select('date').eq('user_name', operator);
        let exitQuery = supabaseClient.from('exit').select('date').eq('user_name', operator).eq('marked', true);

        if (startDate && endDate) {
            attendanceQuery = attendanceQuery.gte('date', startDate).lte('date', endDate);
            exitQuery = exitQuery.gte('date', startDate).lte('date', endDate);
        }

        const [{ data: attendanceDays, error: attError }, { data: exitDays, error: exError }] = await Promise.all([
            attendanceQuery,
            exitQuery
        ]);

        if (attError) throw attError;
        if (exError) throw exError;

        const attendanceDates = new Set(attendanceDays.map(d => d.date));
        const exitDates = new Set(exitDays.map(d => d.date));

        let workedDays = 0;
        for (const date of attendanceDates) {
            if (exitDates.has(date)) {
                workedDays++;
            }
        }
        counterElement.textContent = workedDays;

    } catch (err) {
        console.error("Error calculando días trabajados:", err);
        counterElement.textContent = 'Error';
    }
}

async function calculateAllOperatorsWorkedDays(startDate, endDate) {
    // 1. Get all operators
    const { data: operators, error: opError } = await supabaseClient
        .from('users')
        .select('name')
        .eq('role', 'Operario');
    if (opError) throw opError;
    if (!operators || operators.length === 0) return [];

    // 2. Get all relevant attendance and exit records in one go
    let attendanceQuery = supabaseClient.from('attendance').select('user_name, date');
    let exitQuery = supabaseClient.from('exit').select('user_name, date').eq('marked', true);

    if (startDate && endDate) {
        attendanceQuery = attendanceQuery.gte('date', startDate).lte('date', endDate);
        exitQuery = exitQuery.gte('date', startDate).lte('date', endDate);
    }

    const [{ data: allAttendance, error: attError }, { data: allExits, error: exError }] = await Promise.all([
        attendanceQuery,
        exitQuery
    ]);

    if (attError) throw attError;
    if (exError) throw exError;

    // 3. Process data in memory for efficient lookup
    const attendanceByUser = allAttendance.reduce((acc, record) => {
        if (!acc[record.user_name]) acc[record.user_name] = new Set();
        acc[record.user_name].add(record.date);
        return acc;
    }, {});

    const exitsByUser = allExits.reduce((acc, record) => {
        if (!acc[record.user_name]) acc[record.user_name] = new Set();
        acc[record.user_name].add(record.date);
        return acc;
    }, {});

    // 4. Calculate worked days for each operator
    const summary = operators.map(op => {
        const operatorName = op.name;
        const attendanceDates = attendanceByUser[operatorName] || new Set();
        const exitDates = exitsByUser[operatorName] || new Set();
        let workedDays = 0;
        for (const date of attendanceDates) {
            if (exitDates.has(date)) {
                workedDays++;
            }
        }
        return { "Operario": operatorName, "Días Trabajados": workedDays };
    });

    return summary;
}

async function exportToExcel() {
    const exportBtn = document.getElementById('export-report-btn');
    exportBtn.textContent = 'Generando...';
    exportBtn.disabled = true;

    try {
        // 1. Prepare main data (currently visible in the table, but without location)
        const mainTableData = fullHistoryData
            .filter(item => {
                if (historyFilters.type === 'all') return true;
                return item.type === historyFilters.type;
            })
            .map(record => ({
                'Nombre': record.user_name,
                'Tipo': record.type,
                'Fecha': record.date,
                'Hora': formatTo12Hour(record.hour),
                'Día': record.day
            }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([]); // Start with an empty sheet
        let currentRow = 0;

        // 2. Prepare and add summary data based on filters
        const isSingleOperator = historyFilters.operator !== 'all';
        const isSpecificDate = historyFilters.dateType === 'specific';

        if (!isSpecificDate) {
            if (isSingleOperator) {
                const workedDays = document.getElementById('worked-days-counter').textContent;
                const summary = [{ 'Resumen': `Días trabajados para ${historyFilters.operator}`, 'Total': workedDays }];
                XLSX.utils.sheet_add_json(worksheet, summary, { origin: 'A1' });
                currentRow = 3; // Summary (1 row) + header (1 row) + spacer (1 row)
            } else { // All operators, with or without date range
                const summary = await calculateAllOperatorsWorkedDays(historyFilters.startDate, historyFilters.endDate);
                if (summary.length > 0) {
                    const summaryTitle = [{ "Resumen de Días Trabajados por Operario": "" }];
                    XLSX.utils.sheet_add_json(worksheet, summaryTitle, { origin: 'A1' });
                    XLSX.utils.sheet_add_json(worksheet, summary, { origin: 'A2' });
                    currentRow = summary.length + 3; // Title (1) + summary rows + spacer (1)
                }
            }
        }

        // 3. Add main table data below the summary
        XLSX.utils.sheet_add_json(worksheet, mainTableData, { origin: `A${currentRow + 1}` });

        XLSX.utils.book_append_sheet(workbook, worksheet, "Historial de Asistencia");

        // 4. Download the file
        XLSX.writeFile(workbook, "HistorialAsistencia.xlsx");

    } catch (err) {
        console.error("Error al exportar a Excel:", err);
        showMessageModal('Error de Exportación', `No se pudo generar el informe: ${err.message}`);
    } finally {
        exportBtn.textContent = 'Informe';
        exportBtn.disabled = false;
    }
}

async function renderAttendanceForm(type) {
    document.getElementById('attendance-form-container').innerHTML = '<p>Verificando reglas...</p>';

    try {
        if (!currentUserProfile || !currentUserProfile.name) {
            throw new Error('No se pudo obtener el perfil del usuario. Por favor, recarga la página.');
        }

        const now = new Date();
        const functionName = type === 'entrada' ? 'register-attendance' : 'register-exit';
        const verificationData = {
            user_name: currentUserProfile.name,
            // FIX: Use local date parts to avoid timezone issues with toISOString()
            date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
            // No se envía 'location', lo que indica que es una llamada de solo verificación.
        };

        const { error: verificationError } = await supabaseClient.functions.invoke(functionName, {
            method: 'POST',
            body: verificationData
        });

        if (verificationError) {
            const errorBody = await verificationError.context.json();
            showMessageModal('Aviso', errorBody.error, async () => {
                await loadView('asistencia'); // Regresa al módulo principal de asistencia.
            });
            return;
        }

    } catch (err) {
        let detailedError = "Error desconocido durante la verificación.";
        if (err.context && typeof err.context.json === 'function') {
            try {
                const errorBody = await err.context.json();
                detailedError = errorBody.error || err.message;
            } catch (e) {
                detailedError = err.message;
            }
        } else {
            detailedError = err.message;
        }
        showMessageModal('Error de Verificación', detailedError, async () => {
            await loadView('asistencia');
        });
        return;
    }

    // --- Si la verificación pasa, continuamos con la lógica original ---

    document.getElementById('attendance-form-container').innerHTML = '<p>Obteniendo ubicación...</p>';

    // La geolocalización requiere un contexto seguro (HTTPS) en navegadores modernos, especialmente en iOS.
    if (window.isSecureContext === false) {
        let message = 'La geolocalización solo funciona en conexiones seguras (HTTPS).';
        // Mensaje específico si se detecta que se está usando GitHub Pages.
        if (window.location.hostname.includes('github.io')) {
            message += ' Asegúrate de que la URL en tu navegador comience con "https://". GitHub Pages ofrece HTTPS automáticamente, pero debes usar el enlace correcto.';
        } else {
            message += ' Por favor, accede a la aplicación usando una URL con "https://".';
        }
        showMessageModal('Conexión no Segura', message, async () => {
            await loadView('asistencia');
        });
        return;
    }

    if (!navigator.geolocation) {
        showMessageModal('Error de Navegador', 'Tu navegador no soporta la geolocalización.', async () => {
            await loadView('asistencia');
        });
        return;
    }

    try {
        const position = await getLocation();
        const { latitude, longitude } = position.coords;
        const googleMapsLink = `https://maps.google.com/maps?q=${latitude},${longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

        const now = new Date();

        const formHtml = `
            <h2>Registro de ${type === 'entrada' ? 'Entrada' : 'Salida'}</h2>
            <p><strong>Nombre:</strong> ${currentUserProfile.name}</p>
            <p><strong>Fecha:</strong> ${now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
            <p><strong>Hora:</strong> ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
            <button id="marcar-${type}-btn" class="action-btn">Marcar ${type === 'entrada' ? 'Entrada' : 'Salida'}</button>
        `;

        document.getElementById('attendance-form-container').innerHTML = formHtml;

        document.getElementById(`marcar-${type}-btn`).addEventListener('click', async () => {
            const button = document.getElementById(`marcar-${type}-btn`);
            button.disabled = true;
            button.textContent = 'Registrando...';

            try {
                if (!currentUserProfile || !currentUserProfile.name) {
                    throw new Error('No se pudo obtener el nombre del usuario. Por favor, recarga la página e intenta de nuevo.');
                }

                const clickTime = new Date();
                const year = clickTime.getFullYear();
                const month = String(clickTime.getMonth() + 1).padStart(2, '0');
                const dayOfMonth = String(clickTime.getDate()).padStart(2, '0');

                const data = {
                    user_name: currentUserProfile.name,
                    date: `${year}-${month}-${dayOfMonth}`, // Fecha local correcta
                    day: clickTime.toLocaleDateString('es-ES', { weekday: 'long' }),
                    hour: clickTime.toLocaleTimeString('en-US', { hour12: false }),
                    location: googleMapsLink // Ahora sí enviamos la ubicación para el registro final.
                };

                const functionName = type === 'entrada' ? 'register-attendance' : 'register-exit';

                const { error: registrationError } = await supabaseClient.functions.invoke(functionName, {
                    method: 'POST',
                    body: data
                });

                if (registrationError) throw registrationError;

                showMessageModal('Éxito', `${type.charAt(0).toUpperCase() + type.slice(1)} registrada exitosamente.`, async () => {
                    await loadView('asistencia');
                });

            } catch (err) {
                let detailedError = "Error desconocido. Revisa la consola del navegador para más detalles.";
                if (err.context) {
                    try {
                        const errorBody = await err.context.json();
                        detailedError = errorBody.error || err.message;
                    } catch (e) {
                        detailedError = err.message;
                    }
                }
                showMessageModal('Error de Registro', detailedError);
                button.disabled = false;
                button.textContent = `Marcar ${type === 'entrada' ? 'Entrada' : 'Salida'}`;
            }
        });

    } catch (error) {
        let errorMessage = 'Error al obtener la ubicación: ';
        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorMessage += 'Permiso denegado. Por favor, revisa los ajustes de localización de tu navegador y del sistema operativo (en iOS: ve a Ajustes > Privacidad > Localización).';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage += 'La información de ubicación no está disponible.';
                break;
            case error.TIMEOUT:
                errorMessage += 'Tiempo de espera agotado. Por favor, verifica tu conexión y la configuración de ubicación.';
                break;
            default:
                errorMessage += error.message;
                break;
        }
        showMessageModal('Error de Ubicación', errorMessage, async () => {
            await loadView('asistencia');
        });
    }
}

function getLocation() {
    return new Promise(async (resolve, reject) => {
        if (!navigator.geolocation) {
            return reject({ message: "La geolocalización no es soportada por este navegador." });
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
}

async function renderAdminAttendanceForm(type) {
    const container = document.getElementById('attendance-form-container');
    if (!container) return;

    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);

    container.innerHTML = `
        <h2>Registro Manual de ${typeCapitalized}</h2>
        <div style="text-align: left; display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem;">
            <div class="form-group">
                <label for="admin-operator-select">Operario:</label>
                <select id="admin-operator-select"></select>
            </div>
            <div class="form-group">
                <label for="admin-date-select">Fecha:</label>
                <input type="date" id="admin-date-select">
            </div>
            <div class="form-group">
                <label for="admin-time-select">Hora:</label>
                <input type="time" id="admin-time-select">
            </div>
        </div>
        <button id="admin-register-btn" class="action-btn" style="width: 100%; margin-top: 1.5rem;">Registrar ${typeCapitalized}</button>
    `;

    // Poblar operarios
    const operatorSelect = document.getElementById('admin-operator-select');
    try {
        const { data: operators, error } = await supabaseClient
            .from('users').select('name').eq('role', 'Operario');
        if (error) throw error;
        operators.forEach(op => {
            const option = document.createElement('option');
            option.value = op.name;
            option.textContent = op.name;
            operatorSelect.appendChild(option);
        });
    } catch (err) {
        showMessageModal('Error', 'No se pudo cargar la lista de operarios.');
    }

    // Añadir event listener para el botón de registro
    document.getElementById('admin-register-btn').addEventListener('click', () => adminRegisterAttendance(type));
}

async function adminRegisterAttendance(type) {
    const operatorName = document.getElementById('admin-operator-select').value;
    const selectedDate = document.getElementById('admin-date-select').value;
    const selectedTime = document.getElementById('admin-time-select').value;

    if (!operatorName || !selectedDate || !selectedTime) {
        showMessageModal('Error', 'Por favor, selecciona un operario, fecha y hora.');
        return;
    }

    const button = document.getElementById('admin-register-btn');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Registrando...';

    try {
        // Get admin's location
        const position = await getLocation();
        const { latitude, longitude } = position.coords;
        const googleMapsLink = `https://maps.google.com/maps?q=${latitude},${longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

        const dateObj = new Date(`${selectedDate}T00:00:00`);
        const dayOfWeek = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });

        const data = {
            user_name: operatorName,
            date: selectedDate,
            day: dayOfWeek,
            hour: selectedTime.includes(':') ? `${selectedTime}:00` : `${selectedTime}:00:00`, // Ensure seconds are present
            location: googleMapsLink,
            marked_admin: true // The new flag
        };

        const functionName = type === 'entrada' ? 'register-attendance' : 'register-exit';

        const { error } = await supabaseClient.functions.invoke(functionName, {
            method: 'POST',
            body: data
        });

        if (error) throw error;

        showMessageModal('Éxito', `Registro de ${type} para ${operatorName} guardado correctamente.`);

    } catch (err) {
        let detailedError = "Error desconocido durante el registro.";
        if (err.context && typeof err.context.json === 'function') {
            try {
                const errorBody = await err.context.json();
                detailedError = errorBody.error || err.message;
            } catch (e) { detailedError = err.message; }
        } else {
            detailedError = err.message;
        }
        showMessageModal(`Error de Registro (${type})`, detailedError);
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// --- Lógica del Modal ---

function showMessageModal(title, message, onOk) {
    messageModalTitle.textContent = title;
    messageModalText.textContent = message;
    
    modalOverlay.classList.remove('hidden');
    messageModal.classList.remove('hidden');

    // Remove previous handler if it exists to avoid stacking listeners
    if (currentOkHandler) {
        document.getElementById('message-modal-ok-btn').removeEventListener('click', currentOkHandler);
    }

    currentOkHandler = () => {
        closeAllModals();
        if (typeof onOk === 'function') {
            onOk();
        }
    };
    
    document.getElementById('message-modal-ok-btn').addEventListener('click', currentOkHandler);
}

window.openMapModal = function(url, type) {
    if (!url) {
        showMessageModal('Error', 'No hay una ubicación guardada para este registro.');
        return;
    }

    mapModalTitle.textContent = `Ubicación de la ${type}`;

    let embedUrl = url;
    // Defensivamente, verifica si la URL es un enlace de Google Maps antiguo y lo corrige.
    // Esto asegura que tanto los registros nuevos como los antiguos funcionen.
    if (embedUrl.includes('google.com/maps') && !embedUrl.includes('output=embed')) {
        embedUrl += '&output=embed';
    }

    mapContainer.innerHTML = `<iframe src="${embedUrl}" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    modalOverlay.classList.remove('hidden');
    mapModal.classList.remove('hidden');
};

function populateRoleDropdown(selectId) {
    const roleSelect = document.getElementById(selectId);
    if (!roleSelect) return;
    roleSelect.innerHTML = ''; // Limpiar opciones previas

    let availableRoles = [];
    if (!currentUserProfile) return;

    switch (currentUserProfile.role) {
        case 'Desarrollador':
            availableRoles = ['Administrador Maestro', 'Administrador', 'Desarrollador', 'Operario'];
            break;
        case 'Administrador Maestro':
            availableRoles = ['Administrador', 'Operario'];
            break;
        case 'Administrador':
            availableRoles = ['Operario'];
            break;
        // Por defecto (ej. Operario), el array queda vacío y no se puede crear nadie.
    }

    availableRoles.forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        roleSelect.appendChild(option);
    });
}

function openCreateUserModal() {
    populateRoleDropdown('new-user-role');
    modalOverlay.classList.remove('hidden');
    createUserModal.classList.remove('hidden');
}

function closeAllModals() {
    modalOverlay.classList.add('hidden');
    createUserModal.classList.add('hidden');
    updateUserModal.classList.add('hidden');
    changePasswordModal.classList.add('hidden');
    deleteUserModal.classList.add('hidden');
    messageModal.classList.add('hidden');
    mapModal.classList.add('hidden');
    dateSelectModal.classList.add('hidden');
    mapContainer.innerHTML = ''; // Limpiar el mapa para la próxima vez

    // Also remove the message modal listener when closing to prevent memory leaks
    if (currentOkHandler) {
        document.getElementById('message-modal-ok-btn').removeEventListener('click', currentOkHandler);
        currentOkHandler = null;
    }
}

// Funciones globales para los botones de la tabla (usadas en el onclick del HTML generado)
window.openUpdateModal = function(id, name, email, role) {
    document.getElementById('update-user-id').value = id;
    document.getElementById('update-user-name').value = name;
    document.getElementById('update-user-email').value = email;
    
    populateRoleDropdown('update-user-role');
    document.getElementById('update-user-role').value = role;

    modalOverlay.classList.remove('hidden');
    updateUserModal.classList.remove('hidden');
};

window.openPasswordModal = function(id) {
    document.getElementById('password-user-id').value = id;
    document.getElementById('new-password-input').value = ''; // Limpiar campo
    modalOverlay.classList.remove('hidden');
    changePasswordModal.classList.remove('hidden');
};

window.openDeleteModal = function(id) {
    document.getElementById('delete-user-id').value = id;
    modalOverlay.classList.remove('hidden');
    deleteUserModal.classList.remove('hidden');
};


// Evento de Login
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    errorMessage.textContent = ''; // Limpiar errores previos

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        if (data.user) {
            // Si el login es exitoso, verificamos los permisos usando el UUID
            verifyUserPermissions(data.user.id);
        }
    } catch (error) {
        if (error.message.includes('Invalid login credentials')) {
            errorMessage.textContent = 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
        } else {
            errorMessage.textContent = 'Error al iniciar sesión: ' + error.message;
        }
    }
});

// Verificar la sesión al cargar la página
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession()

    if (session) {
        // Si hay una sesión activa, verificamos los permisos usando el UUID
        verifyUserPermissions(session.user.id);
    } else {
        // Si no hay sesión, mostrar el formulario de inicio de sesión
        loginContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
    }
}


// Eventos de navegación del menú admin
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const section = e.target.getAttribute('data-section');
        await loadView(section);
    });
});

// Evento Logout (simple recarga por ahora)
logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.reload(); // Recargar la página para limpiar cualquier estado
});

// Eventos para cerrar el modal
closeModalBtn.addEventListener('click', closeAllModals);
closeUpdateModalBtn.addEventListener('click', closeAllModals);
closePasswordModalBtn.addEventListener('click', closeAllModals);
closeMapModalBtn.addEventListener('click', closeAllModals);
closeDateModalBtn.addEventListener('click', closeAllModals);
closeDeleteModalBtn.addEventListener('click', closeAllModals);
modalOverlay.addEventListener('click', closeAllModals);

// --- Eventos de Acciones de Modales (Crear, Actualizar, Borrar) ---

// Crear Usuario
document.getElementById('create-user-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-user-name').value;
    const email = document.getElementById('new-user-email').value;
    const password = document.getElementById('new-user-password').value;
    const role = document.getElementById('new-user-role').value;

    if (!name || !email || !password || !role) return showMessageModal('Campos Incompletos', 'Por favor, completa todos los campos.');

    const createBtn = document.getElementById('create-user-btn');
    try {
        createBtn.textContent = 'Creando...';
        createBtn.disabled = true;

        const { error } = await supabaseClient.functions.invoke('create-delete-user', {
            method: 'POST',
            body: { name, email, password, role },
        });

        if (error) throw error;

        showMessageModal('Éxito', 'Usuario creado exitosamente.');
        closeAllModals();
        await loadView('usuarios'); // Recargar la lista de usuarios
    } catch (err) {
        const errorBody = await err.context.json();
        showMessageModal('Error', `Error al crear usuario: ${errorBody.error}`);
    } finally {
        createBtn.textContent = 'Crear Usuario';
        createBtn.disabled = false;
    }
});

// Eliminar Usuario
document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    const userId = document.getElementById('delete-user-id').value;
    const deleteBtn = document.getElementById('confirm-delete-btn');

    try {
        deleteBtn.textContent = 'Eliminando...';
        deleteBtn.disabled = true;

        const { error } = await supabaseClient.functions.invoke('create-delete-user', {
            method: 'DELETE',
            body: { user_id: userId },
        });

        if (error) throw error;

        showMessageModal('Éxito', 'Usuario eliminado exitosamente.');
        closeAllModals();
        await loadView('usuarios'); // Recargar la lista de usuarios
    } catch (err) {
        const errorBody = await err.context.json();
        showMessageModal('Error', `Error al eliminar usuario: ${errorBody.error}`);
    } finally {
        deleteBtn.textContent = 'Eliminar Definitivamente';
        deleteBtn.disabled = false;
    }
});

// Actualizar Usuario (Guardar Cambios)
document.getElementById('save-update-btn').addEventListener('click', async () => {
    const id = document.getElementById('update-user-id').value;
    const name = document.getElementById('update-user-name').value;
    const email = document.getElementById('update-user-email').value;
    const role = document.getElementById('update-user-role').value;

    if (!id || !name || !email || !role) return showMessageModal('Campos Incompletos', 'Por favor, completa todos los campos.');

    const updateBtn = document.getElementById('save-update-btn');
    try {
        updateBtn.textContent = 'Guardando...';
        updateBtn.disabled = true;

        const { error } = await supabaseClient.functions.invoke('update-user', {
            method: 'PUT',
            body: { id, name, email, role },
        });

        if (error) throw error;

        showMessageModal('Éxito', 'Usuario actualizado exitosamente.');
        closeAllModals();
        await loadView('usuarios'); // Recargar la lista para ver los cambios
    } catch (err) {
        showMessageModal('Error', `Error al actualizar usuario: ${err.message}`);
    } finally {
        updateBtn.textContent = 'Guardar Cambios';
        updateBtn.disabled = false;
    }
});

// Cambiar Contraseña
document.getElementById('save-password-btn').addEventListener('click', async () => {
    const userId = document.getElementById('password-user-id').value;
    const newPassword = document.getElementById('new-password-input').value;

    if (!userId || !newPassword) return showMessageModal('Campo Requerido', 'Por favor, ingresa la nueva contraseña.');

    const passwordBtn = document.getElementById('save-password-btn');
    try {
        passwordBtn.textContent = 'Actualizando...';
        passwordBtn.disabled = true;

        const { error } = await supabaseClient.functions.invoke('update-users-password', {
            method: 'PUT',
            body: { user_id: userId, password: newPassword },
        });

        if (error) throw error;

        showMessageModal('Éxito', 'Contraseña actualizada exitosamente.');
        closeAllModals();
    } catch (err) {
        showMessageModal('Error', `Error al actualizar la contraseña: ${err.message}`);
    } finally {
        passwordBtn.textContent = 'Actualizar Contraseña';
        passwordBtn.disabled = false;
    }
});

// Llamar a checkSession al cargar la página
checkSession();