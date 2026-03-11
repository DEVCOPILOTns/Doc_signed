
let selectedDocumentId = null;

// Función para manejar el toggle de la lista de firmantes
function toggleFirmantes(button, event) {
    // Prevenir que el click se propague hacia el document-card
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const firmantesList = button.closest('.firmantes-section').querySelector('.firmantes-list');
    const isVisible = firmantesList.style.display !== 'none';
    
    if (isVisible) {
        firmantesList.style.display = 'none';
        button.classList.remove('active');
    } else {
        firmantesList.style.display = 'block';
        button.classList.add('active');
    }
}

// Función para extraer y limpiar el nombre del documento
function limpiarNombreDocumento(urlONombre) {
    if (!urlONombre) return 'Documento sin nombre';
    
    // Extraer solo el nombre del archivo de la URL
    let nombre = urlONombre;
    if (nombre.includes('/')) {
        nombre = nombre.substring(nombre.lastIndexOf('/') + 1);
    }
    
    // Decodificar caracteres especiales (%20 -> espacio, etc)
    nombre = decodeURIComponent(nombre);
    
    // Quitar el timestamp que viene antes de la extensión
    // Patrón: nombreArchivo-1770142827917.pdf -> nombreArchivo.pdf
    nombre = nombre.replace(/-\d+(\.\w+)$/, '$1');
    
    return nombre;
}

// Reemplazar la función formatDate por esta nueva función formatearFecha
function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha';
    const date = new Date(fecha);
    // Ajustar la fecha sumando 5 horas para compensar la diferencia horaria
    date.setHours(date.getHours() + 5);
    
    return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Bogota'
    });
}

//desde aqui manejamos el modal y las interacciones de la vista de aplicaciones
document.addEventListener('DOMContentLoaded', function () {
    const cards = document.querySelectorAll('.document-card');
    const modal = document.getElementById("myModal");
    const closeBtn = document.getElementById("closeModal");

    // Inicializar comentarios expandibles
    initializeExpandableComments();

    cards.forEach(card => {
        // Animaciones hover
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-5px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });

        // Click para mostrar modal
        card.addEventListener('click', async function() {
            // Obtiene el estado visual mostrado en la card
            const statusEl = this.querySelector('.document-status');
            const estado = statusEl ? statusEl.textContent.trim().toUpperCase() : '';
            console.log('Estado de la solicitud al hacer click:', estado);

            if (estado !== "FIRMADO") {
                Swal.fire({
                    icon: 'info',
                    title: 'Atención',
                    text: 'Solo se pueden ver los detalles de las solicitudes firmadas.',
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Aceptar'
                });
                // No hacer nada si no es FIRMADO
                return;
            }

            try {
                const idSolicitud = this.getAttribute("data-id");
                selectedDocumentId = idSolicitud;

                console.log('ID Solicitud seleccionada:', selectedDocumentId);
                
                if (!idSolicitud) {
                    console.error('ID de solicitud no encontrado');
                    return;
                }
                
                showModal();
                const detallesInfo = modal.querySelector('.detalles-info');
                detallesInfo.innerHTML = '<p class="loading">Cargando detalles...</p>';

                const response = await fetch(`/api/application/${idSolicitud}`);
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }

                const data = await response.json();
                console.log('Datos recibidos:', data);

                // Normalizar respuesta
                let detalles = [];
                if (Array.isArray(data.detalles)) detalles = data.detalles;
                else if (Array.isArray(data.details)) detalles = data.details;
                else if (Array.isArray(data)) detalles = data;
                else {
                    for (const k of Object.keys(data || {})) {
                        if (Array.isArray(data[k])) { detalles = data[k]; break; }
                    }
                }

                if (detalles && detalles.length > 0) {
                    const detallesHtml = detalles.map(det => {
                        // Determinar la URL y el nombre del documento
                        const documentUrl = det.url_archivo || det.url || '';
                        // Usar url_original si existe, si no usar url_archivo
                        const nombreDocumento = limpiarNombreDocumento(det.url_original || det.url_archivo || det.url || det.nombre_original || 'Documento sin nombre');

                        return `
                            <div class="detalle-section">
                                <div class="detalle-header">
                                    <h3 title="${nombreDocumento}">${nombreDocumento}</h3>
                                    <span class="fecha">
                                        ✓
                                        ${formatearFecha(det.fecha_firma || det.fecha_solicitud)}
                                    </span>
                                </div>  
                                
                                <div class="detalle-content">
                                    <p><strong>Solicitud:</strong> <span class="solicitud-id">${det.id_solicitud || ''}</span></p>
                                    <p><strong>Estado:</strong> <span style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8125rem; font-weight: 600; background: #dcfce7; color: #166534;">${det.estado_documento || det.estado || ''}</span></p>
                                    <div class="document-actions">
                                        <button class="btn-preview" onclick="previewPDF('${documentUrl}')">
                                            <i class="fas fa-eye"></i> Ver
                                        </button>
                                        <a href="${documentUrl}" target="_blank" class="btn-download">
                                            <i class="fas fa-download"></i> Descargar
                                        </a>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');

                    detallesInfo.innerHTML = detallesHtml;

                    // Mostrar el primer documento
                    if (detalles[0]?.url_archivo || detalles[0]?.url) {
                        previewPDF(detalles[0].url_archivo || detalles[0].url);
                    }
                } else {
                    detallesInfo.innerHTML = '<p class="no-detalles">No hay detalles disponibles</p>';
                }
            } catch (error) {
                console.error('Error:', error);
                const detallesInfo = modal.querySelector('.detalles-info');
                if (detallesInfo) detallesInfo.innerHTML = `<p class="error-message">Error al cargar los detalles: ${error.message}</p>`;
            }
        });
    });

    // Función para previsualizar PDF
    window.previewPDF = function (url) {
        if (!url) {
            console.error('URL no válida');
            return;
        }
        console.log('Mostrando documento:', url);
        const pdfViewer = document.getElementById('pdfViewer');
        if (pdfViewer) {
            pdfViewer.src = url;
        }
    };

    // Mostrar y ocultar modal
    function showModal() {
        document.body.classList.add('modal-open');
        modal.style.display = "flex";
    }
    
    function hideModal() {
        document.body.classList.remove('modal-open');
        modal.style.display = "none";
    }

    // Cerrar modal
    closeBtn.onclick = hideModal;

    window.onclick = (e) => {
        if (e.target === modal) hideModal();
    };
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideModal();
    });

    function initializeModal() {
        const modal = document.getElementById("myModal");
        document.body.classList.remove('modal-open');
        modal.style.display = "none";
    }

    initializeModal();
});

// Función para manejar click en botón de comentarios
function handleCommentClick(event, id) {
    event.preventDefault();
    event.stopPropagation();
    
    // Obtener la tarjeta del documento
    const card = document.querySelector(`.document-card[data-id="${id}"]`);
    if (!card) {
        console.error('Tarjeta no encontrada para ID:', id);
        return;
    }
    
    // Obtener el texto del comentario desde el span .comment-text
    const commentText = card.querySelector('.comment-text');
    if (commentText) {
        const text = commentText.textContent.trim();
        console.log('Comment text found:', text);
        openCommentModal(text);
    } else {
        console.log('Comment text element not found in card');
        openCommentModal('No hay comentarios disponibles');
    }
}

// Función para inicializar comentarios expandibles
function initializeExpandableComments() {
    const commentSections = document.querySelectorAll('.comment-section');
    
    commentSections.forEach(section => {
        // Verificar si hay contenido en los comentarios
        const commentContent = section.querySelector('.comment-content');
        const commentEmpty = section.querySelector('.comment-empty');
        const hasContent = commentContent && commentContent.textContent.trim() !== '';
        
        // Si no hay contenido, no agregar el toggle
        if (!hasContent) return;
        
        // Obtener el texto del comentario
        const commentText = commentContent ? commentContent.textContent.trim() : '';
        
        // Crear botón toggle
        const toggleBtn = document.createElement('button');
        toggleBtn.classList.add('comment-toggle');
        toggleBtn.textContent = 'Ver más';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', 'Expandir comentarios');
        
        // Agregar botón al header
        const header = section.querySelector('.comment-header');
        if (header) {
            header.appendChild(toggleBtn);
        }
        
        // Agregar evento click al botón para abrir modal
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openCommentModal(commentText);
        });
        
        // Agregar evento click a la sección también
        section.addEventListener('click', function(e) {
            // Solo si no hizo click en el botón
            if (e.target !== toggleBtn) {
                toggleBtn.click();
            }
        });
    });
}

// Función para abrir modal de comentarios
function openCommentModal(commentText) {
    // Crear modal si no existe
    let modal = document.getElementById('commentModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'commentModal';
        modal.className = 'comment-modal';
        modal.innerHTML = `
            <div class="comment-modal-content">
                <div class="comment-modal-header">
                    <h3>Comentarios</h3>
                    <button class="comment-modal-close" id="commentModalClose">&times;</button>
                </div>
                <div class="comment-modal-body" id="commentModalBody"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Evento para cerrar
        document.getElementById('commentModalClose').addEventListener('click', closeCommentModal);
        
        // Cerrar al hacer clic fuera del modal
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCommentModal();
            }
        });
        
        // Cerrar con ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeCommentModal();
            }
        });
    }
    
    // Mostrar el comentario
    document.getElementById('commentModalBody').textContent = commentText;
    modal.classList.add('show');
}

// Función para cerrar modal de comentarios
function closeCommentModal() {
    const modal = document.getElementById('commentModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Función para descargar todos los documentos de una aplicación
function downloadAllApplicationDocumentsById(idSolicitud) {
    console.log('Descargando todos los documentos de aplicación. ID:', idSolicitud);
    
    if (!idSolicitud) {
        Swal.fire({
            icon: 'warning',
            title: 'Atención',
            text: 'Error: ID de solicitud no disponible',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'Aceptar'
        });
        return;
    }

    // Mostrar alerta de carga
    Swal.fire({
        title: 'Preparando descarga...',
        html: 'Se está preparando el archivo ZIP con todos los documentos firmados. Por favor espera...',
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: async () => {
            Swal.showLoading();
            
            try {
                // Realizar la descarga
                const response = await fetch(`/api/application/download-all/${idSolicitud}`);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || errorData.message || `Error HTTP ${response.status}`);
                }

                // Descargar el ZIP
                const blob = await response.blob();
                
                if (blob.size === 0) {
                    throw new Error('El archivo descargado está vacío');
                }

                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `solicitud_${idSolicitud}.zip`;
                document.body.appendChild(link);
                link.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(link);

                Swal.fire({
                    icon: 'success',
                    title: '¡Descarga completada!',
                    text: 'Los documentos han sido descargados exitosamente',
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Aceptar'
                });
            } catch (error) {
                console.error('Error al descargar:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al descargar los documentos: ' + error.message,
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Aceptar'
                });
            }
        }
    });
}

// fuera de document.addEventListener(...)
function signAllDocuments() {
    //console.log('Intentando firmar documentos. ID seleccionado:', selectedDocumentId);
    
    if (!selectedDocumentId) {
        alert('Por favor, seleccione una solicitud para firmar');
        return;
    }

    const data = {
        "selectedFormat": "A4",
        "COORDS": {
            "A4": {
                "pageIndex": 0,
                "x": 100,
                "y": 100,
                "width": 160
            }
        }
    };

    //console.log('Enviando solicitud de firma para ID:', selectedDocumentId);

    fetch(`/api/pending/${selectedDocumentId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    
    .then(response => response.json())
    .then(data => {
        if (data.message==='Proceso de firma completado') {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: data.message,
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'Aceptar'
            }).then(() => {
                window.location.reload();
            });
           
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Error al firmar los documentos'
            });
            
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al procesar la firma de documentos');
    });
}

function rejectApplication() {
    console.log('Intentando rechazar solicitud. ID seleccionado:', selectedDocumentId);
    if (!selectedDocumentId) {
        alert('Por favor, seleccione una solicitud para rechazar');
        return;
    }   
    fetch(`/api/pending/${selectedDocumentId}/rechazar`, {
        method: 'POST'
    })
    .then(response => {
        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'La solicitud ha sido rechazada',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'Aceptar'
            }).then(() => {
                window.location.reload();
            });
        } else {
            throw new Error('Error al rechazar la solicitud');
        }   
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al procesar el rechazo de la solicitud');
    });
}

// ============= PAGINACIÓN =============
let currentPage = 1;
let itemsPerPage = 8;
let allItems = [];
let filteredItems = [];

document.addEventListener('DOMContentLoaded', function() {
    // Pequeña pausa para asegurar que el DOM esté completamente listo
    setTimeout(() => {
        initializePagination();
        attachFilterListeners();
    }, 100);
});
 //aqui adjuntamos los listeners a los filtros que son cuatro: busqueda, estado, fecha y firmante
function attachFilterListeners() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    const signerFilter = document.getElementById('signerFilter');
    //aqui adjuntamos los eventos
    //este es para la busqueda lo que hace es que al escribir en el input se aplica el filtro
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            console.log('Evento input en búsqueda');
            applyFilters();
        });
    }
    //aqui es para el filtro de estado
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            console.log('Evento change en estado');
            applyFilters();
        });
    }
    //aqui es para el filtro de fecha
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            console.log('Evento change en fecha');
            applyFilters();
        });
    }
    //aqui es para el filtro de firmante
    if (signerFilter) {
        signerFilter.addEventListener('input', function() {
            console.log('Evento input en firmante');
            applyFilters();
        });
    }
}

function initializePagination() {
    // Obtener todos los items del grid
    allItems = Array.from(document.querySelectorAll('.documents-grid .page-item'));
    
    console.log('=== INICIALIZAR PAGINACIÓN ===');
    console.log('Total items encontrados:', allItems.length);
    
    if (allItems.length === 0) {
        console.log('No hay items para paginar');
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = 'No hay solicitudes para mostrar';
        }
        return;
    }
    
    console.log('Items per page:', itemsPerPage);
    console.log('Total páginas:', Math.ceil(allItems.length / itemsPerPage));
    
    // Inicializar filtros - todos los items visibles al inicio
    filteredItems = [...allItems];
    currentPage = 1;
    
    // Resetear los filtros a su estado inicial
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    const signerFilter = document.getElementById('signerFilter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = 'TODOS';
    if (dateFilter) dateFilter.value = '';
    if (signerFilter) signerFilter.value = '';
    
    // Mostrar la primera página
    updateResultsCount();
    showPage(1);
    generatePaginationControls();
}

//esta funcion es la que aplica los filtros
function applyFilters() {

    //aqui obtenemos los valores de los filtros
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    const signerFilter = document.getElementById('signerFilter');

    
    //aqui obtenemos los valores
    const searchTerm = (searchInput?.value || '').toLowerCase().trim();
    const statusValue = statusFilter?.value || 'TODOS';
    const dateValue = dateFilter?.value || '';
    const signerTerm = (signerFilter?.value || '').toLowerCase().trim();
    
    //logging para depurar
    console.log('=== APLICAR FILTROS ===');
    console.log('Búsqueda:', searchTerm);
    console.log('Estado:', statusValue);
    console.log('Fecha:', dateValue);
    console.log('Firmante:', signerTerm);
    console.log('Total items antes de filtro:', allItems.length);
    
    // Filtrar items basado en criterios
    filteredItems = allItems.filter(item => {

        // Filtro de búsqueda
        if (searchTerm) {
            const id = item.getAttribute('data-id') || '';
            const titleEl = item.querySelector('.document-title');
            const titleText = titleEl ? titleEl.textContent.toLowerCase() : '';
            
            const matches = id.toLowerCase().includes(searchTerm) || 
                           titleText.includes(searchTerm);
            if (!matches) {
                console.log(`Item ${id} no coincide con búsqueda`);
                return false;
            }
        }
        
        // Filtro de estado
        if (statusValue !== 'TODOS') {
            const statusEl = item.querySelector('.document-status');
            const estado = statusEl ? statusEl.textContent.trim().toUpperCase() : '';
            
            console.log(`Verificando estado: "${estado}" contra filtro "${statusValue}"`);
            
            let stateMatches = false;
            if (statusValue === 'PENDIENTE') stateMatches = estado === 'PENDIENTE';
            else if (statusValue === 'FIRMADO') stateMatches = estado === 'FIRMADO';
            else if (statusValue === 'RECHAZADO') stateMatches = estado === 'RECHAZADO';
            
            if (!stateMatches) {
                console.log(`Item estado "${estado}" no coincide con filtro "${statusValue}"`);
                return false;
            }
        }
        
        // Filtro de fecha por mes/año
        if (dateValue && dateValue.trim() !== '') {
            const dateEl = item.querySelector('.document-date');
            if (dateEl) {
                const dateText = dateEl.textContent;
                // Extraer solo la parte de la fecha (ignorar etiquetas)
                const dateMatch = dateText.match(/(\d{2}\/\d{2}\/\d{4})/);
                if (dateMatch) {
                    // Convertir formato DD/MM/YYYY a YYYY-MM
                    const [day, month, year] = dateMatch[1].split('/');
                    const itemYearMonth = `${year}-${month}`;
                    
                    // dateValue viene en formato YYYY-MM del input type="month"
                    if (itemYearMonth !== dateValue) {
                        console.log(`Item fecha "${dateText}" no coincide con filtro "${dateValue}"`);
                        return false;
                    }
                }
            }
        }
        
        // Filtro de firmante
        if (signerTerm) {
            const signerEl = item.querySelector('.firmante-line');
            const signerText = signerEl ? signerEl.textContent.toLowerCase() : '';
            
            const matches = signerText.includes(signerTerm);
            if (!matches) {
                const id = item.getAttribute('data-id') || '';
                console.log(`Item ${id} no coincide con búsqueda de firmante`);
                return false;
            }
        }
        
        return true;
    });
    
    console.log('Items filtrados:', filteredItems.length);
    
    // Reiniciar a la primera página
    currentPage = 1;
    updateResultsCount();
    showPage(1);
    generatePaginationControls();
}

function showPage(pageNumber) {
    // Primero, ocultar TODOS los items del DOM actual
    const allCurrentItems = Array.from(document.querySelectorAll('.documents-grid .page-item'));
    console.log('Items en el DOM:', allCurrentItems.length);
    
    allCurrentItems.forEach((item) => {
        item.style.display = 'none';
    });
    
    // Mostrar/ocultar mensaje de sin coincidencias
    const noResultsMessage = document.getElementById('noResultsMessage');
    if (filteredItems.length === 0) {
        if (noResultsMessage) {
            noResultsMessage.style.display = 'block';
        }
        return; // Retornar temprano si no hay resultados
    } else {
        if (noResultsMessage) {
            noResultsMessage.style.display = 'none';
        }
    }
    
    if (pageNumber < 1 || pageNumber > Math.ceil(filteredItems.length / itemsPerPage)) {
        console.warn('Número de página inválido:', pageNumber);
        return;
    }
    
    currentPage = pageNumber;
    
    // Calcular índices
    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    console.log(`=== MOSTRAR PÁGINA ${pageNumber} ===`);
    console.log(`Mostrando items ${startIndex} a ${endIndex - 1} de ${filteredItems.length}`);
    
    // Obtener los items a mostrar en esta página
    const itemsToShow = filteredItems.slice(startIndex, endIndex);
    console.log(`Items a mostrar en esta página: ${itemsToShow.length}`);
    
    // Mostrar solo los items de esta página
    itemsToShow.forEach((item, index) => {
        item.style.display = 'block';
        const itemId = item.getAttribute('data-id');
        console.log(`  - Mostrando item ${startIndex + index}: ID=${itemId}`);
    });
    
    // Actualizar información de paginación
    updatePaginationInfo(startIndex, endIndex, filteredItems.length);
    
    // Scroll hacia arriba
    document.documentElement.scrollTop = 0;
}

function generatePaginationControls() {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginationList = document.getElementById('paginationList');
    
    if (!paginationList) {
        console.error('paginationList no encontrado');
        return;
    }
    
    paginationList.innerHTML = '';
    
    console.log(`Generando controles de paginación: ${totalPages} páginas`);
    
    // Si no hay páginas o solo 1 página, ocultar paginación
    if (totalPages <= 1) {
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
        return;
    }
    
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) {
        paginationContainer.style.display = 'flex';
    }
    
    // Botón anterior
    const prevLi = document.createElement('li');
    prevLi.className = currentPage === 1 ? 'disabled' : '';
    const prevLink = document.createElement('a');
    prevLink.href = '#';
    prevLink.innerHTML = '&laquo; Anterior';
    prevLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentPage > 1) {
            console.log('Click botón anterior');
            showPage(currentPage - 1);
            generatePaginationControls();
        }
    });
    prevLi.appendChild(prevLink);
    paginationList.appendChild(prevLi);
    
    // Números de página
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // Mostrar "1" si startPage > 1
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        const firstLink = document.createElement('a');
        firstLink.href = '#';
        firstLink.textContent = '1';
        firstLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Click página 1');
            showPage(1);
            generatePaginationControls();
        });
        firstLi.appendChild(firstLink);
        paginationList.appendChild(firstLi);
        
        // Mostrar "..." si hay salto
        if (startPage > 2) {
            const dotsLi = document.createElement('li');
            dotsLi.className = 'disabled';
            dotsLi.innerHTML = '<span>...</span>';
            paginationList.appendChild(dotsLi);
        }
    }
    
    // Números de página visibles
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        if (i === currentPage) {
            li.className = 'active';
            const span = document.createElement('span');
            span.textContent = i;
            li.appendChild(span);
        } else {
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = i;
            link.addEventListener('click', (function(pageNum) {
                return function(e) {
                    e.preventDefault();
                    console.log('Click página', pageNum);
                    showPage(pageNum);
                    generatePaginationControls();
                };
            })(i));
            li.appendChild(link);
        }
        paginationList.appendChild(li);
    }
    
    // Mostrar "..." y última página si hay salto
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dotsLi = document.createElement('li');
            dotsLi.className = 'disabled';
            dotsLi.innerHTML = '<span>...</span>';
            paginationList.appendChild(dotsLi);
        }
        
        const lastLi = document.createElement('li');
        const lastLink = document.createElement('a');
        lastLink.href = '#';
        lastLink.textContent = totalPages;
        lastLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Click última página:', totalPages);
            showPage(totalPages);
            generatePaginationControls();
        });
        lastLi.appendChild(lastLink);
        paginationList.appendChild(lastLi);
    }
    
    // Botón siguiente
    const nextLi = document.createElement('li');
    nextLi.className = currentPage === totalPages ? 'disabled' : '';
    const nextLink = document.createElement('a');
    nextLink.href = '#';
    nextLink.innerHTML = 'Siguiente &raquo;';
    nextLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentPage < totalPages) {
            console.log('Click botón siguiente');
            showPage(currentPage + 1);
            generatePaginationControls();
        }
    });
    nextLi.appendChild(nextLink);
    paginationList.appendChild(nextLi);
}

function updatePaginationInfo(startIndex, endIndex, total) {
    const info = document.getElementById('paginationInfo');
    if (info) {
        const showing = Math.min(endIndex, total);
        const display = total === 0 ? 'Mostrando 0 de 0 solicitudes' : `Mostrando ${startIndex + 1} - ${showing} de ${total} solicitudes`;
        info.textContent = display;
    }
}

function updateResultsCount() {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        const filtered = filteredItems.length;
        const total = allItems.length;
        
        if (filtered === total) {
            resultsCount.textContent = `Mostrando ${filtered} solicitudes`;
        } else {
            resultsCount.textContent = `Mostrando ${filtered} de ${total} solicitudes (filtradas)`;
        }
        
        console.log(`Resultados: ${filtered} de ${total}`);
    }
}

function changeItemsPerPage(value) {
    itemsPerPage = parseInt(value);
    currentPage = 1;
    showPage(1);
    generatePaginationControls();
}