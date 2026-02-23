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

function toggleFilter(filter) {
    const pendingOption = document.getElementById('pendingOption');
    const signedOption = document.getElementById('signedOption');
    
    currentFilter = filter;
    const status = filter === 'pending' ? 'PENDIENTE' : 'FIRMADO';

    // Actualizar clases activas
    if (filter === 'pending') {
        pendingOption.classList.add('active');
        pendingOption.classList.remove('inactive');
        signedOption.classList.add('inactive');
        signedOption.classList.remove('active');
    } else {
        signedOption.classList.add('active');
        signedOption.classList.remove('inactive');
        pendingOption.classList.add('inactive');
        pendingOption.classList.remove('active');
    }

    window.location.href = `/api/pending?status=${status}`;
}

// Reemplazar la función sumarUnDia por esta nueva función formatearFecha
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

//desde aqui manejamos el modal y las interacciones de la vista de pendientes
document.addEventListener('DOMContentLoaded', function () {
    const cards = document.querySelectorAll('.document-card');
    const modal = document.getElementById("myModal");
    const closeBtn = document.getElementById("closeModalBtn");

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
            try {
                const idSolicitud = this.getAttribute("data-id");
                // Obtener el estado del botón activo Y actualizar selectedDocumentId
                const activeButton = document.querySelector('.toggle-option.active');
                const estado = activeButton.getAttribute('data-status');
                selectedDocumentId = idSolicitud; // Aquí está el cambio importante

                console.log('Estado del switch:', estado);
                console.log('ID Solicitud seleccionada:', selectedDocumentId);

                if (!idSolicitud) {
                    console.error('ID de solicitud no encontrado');
                    return;
                }

                showModal(estado);
                const detallesInfo = modal.querySelector('.detalles-info');
                detallesInfo.innerHTML = '<p class="loading">Cargando detalles...</p>';

                const response = await fetch(`/api/pending/detalles/${idSolicitud}?estado=${estado}`);
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }

                const data = await response.json();
                console.log('Datos recibidos:', data);

                if (data.detalles && data.detalles.length > 0) {
                    const detallesHtml = data.detalles.map(det => {
                        // Determinar la URL y el nombre del documento según el estado
                        const documentUrl = det.url_archivo;
                        // Para FIRMADO, usar url_original del documento inicial. Para PENDIENTE, usar url_archivo
                        const nombreDocumento = limpiarNombreDocumento(det.url_original || det.url_archivo || 'Documento sin nombre');

                        return `
                            <div class="detalle-section">
                                <div class="detalle-header">
                                    <h3 title="${nombreDocumento}">${nombreDocumento}</h3>
                                    <span class="fecha">
                                        ${estado === 'FIRMADO' ? '✓' : '⏱'}
                                        ${formatearFecha(estado === 'FIRMADO' ? det.fecha_firma : det.fecha_solicitud)}
                                    </span>
                                </div>  

                                <div class="detalle-content">
                                    <p><strong>Solicitud:</strong> <span class="solicitud-id">${det.id_solicitud}</span></p>
                                    <p><strong>Estado:</strong> <span style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8125rem; font-weight: 600; ${estado === 'FIRMADO' ? 'background: #dcfce7; color: #166534;' : 'background: #fef3c7; color: #92400e;'}">${det.estado_documento}</span></p>
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
                    if (data.detalles[0]?.url_archivo) {
                        previewPDF(data.detalles[0].url_archivo);
                    }
                } else {
                    detallesInfo.innerHTML = '<p class="no-detalles">No hay detalles disponibles</p>';
                }
            } catch (error) {
                console.error('Error:', error);
                detallesInfo.innerHTML = `<p class="error-message">Error al cargar los detalles: ${error.message}</p>`;
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
    function showModal(status) {
        document.body.classList.add('modal-open');
        modal.style.display = "flex";
        
        // Mostrar u ocultar el botón según el estado
        const signAllBtn = document.getElementById('signAllBtn');
        if (signAllBtn) {
            signAllBtn.style.display = status === 'FIRMADO' ? 'none' : 'block';
        }
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
        // Limpiar el iframe si existe
        const pdfViewer = document.getElementById('pdfViewer');
        if (pdfViewer) pdfViewer.src = '';
    }

    initializeModal();

});

// Función para manejar click en botón de comentarios
function handleCommentClick(event, id) {
    event.stopPropagation(); // Evitar que se propague el evento
    
    // Obtener la tarjeta del documento
    const card = document.querySelector(`[data-id="${id}"]`);
    if (!card) {
        console.log('Card not found for id:', id);
        return;
    }
    
    // Obtener el texto del comentario
    const commentText = card.querySelector('.comment-text');
    if (commentText) {
        const text = commentText.textContent.trim();
        console.log('Comment text found:', text);
        openCommentModal(text);
    } else {
        console.log('Comment text element not found in card');
    }
}

// Función para inicializar comentarios (simplificada - botones en HTML)
function initializeExpandableComments() {
    // Esta función ahora es principalmente para compatibilidad
    // Los comentarios se manejan directamente desde el botón en HTML
    // Los botones "Ver comentarios" ya están configurados con onclick="handleCommentClick(...)"
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

// fuera de document.addEventListener(...)
function signAllDocuments() {
    console.log('Intentando firmar documentos. ID seleccionado:', selectedDocumentId);

    if (!selectedDocumentId) {
        alert('Por favor, seleccione una solicitud para firmar');
        return;
    }

    // Obtener el nombre del formato desde el atributo data-formato de la tarjeta
    const selectedCard = document.querySelector(`[data-id="${selectedDocumentId}"]`);
    let selectedFormatName = "A4"; // valor por defecto
    
    if (selectedCard) {
        selectedFormatName = selectedCard.getAttribute('data-formato');
        if (!selectedFormatName) {
            selectedFormatName = "A4"; // fallback si el atributo no existe
        }
        console.log('Formato encontrado:', selectedFormatName);
    }

    const data = {
        "selectedFormat": selectedFormatName,
        "COORDS": {
            "A4": {
                "pageIndex": 0,
                "x": 100,
                "y": 100,
                "width": 160
            }
        }
    };

    console.log('Enviando solicitud de firma para ID:', selectedDocumentId);
    console.log('Formato enviado:', selectedFormatName);

    // Mostrar modal de carga
    const loadingModal = document.getElementById('loadingModal');
    if (loadingModal) {
        loadingModal.classList.add('active');
    }

    fetch(`/api/pending/${selectedDocumentId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    
    .then(response => response.json())
    .then(data => {
        // Ocultar modal de carga
        if (loadingModal) {
            loadingModal.classList.remove('active');
        }

        // Verificar si requiere firma
        if (data.requiresSignature) {
            Swal.fire({
                icon: 'warning',
                title: ' Firma No Cargada',
                html: `
                    <div style="text-align: left; line-height: 1.6;">
                        <p><strong>${data.message}</strong></p>
                        <p style="margin-top: 15px; color: #666; font-size: 0.9em;">
                            Ve a tu perfil y carga una imagen de tu firma para poder firmar documentos.
                        </p>
                    </div>
                `,
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'Ir a Cargar Firma',
                showCancelButton: true,
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = data.redirectTo || '/api/userProfile';
                }
            });
            return;
        }

        if (data.message==='Proceso de firma completado') {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: data.message,
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'Aceptar'
            }).then(() => {
                // Espera a que el usuario cierre la alerta antes de recargar
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
        // Ocultar modal de carga en caso de error
        if (loadingModal) {
            loadingModal.classList.remove('active');
        }

        console.error('Error:', error);
        alert('Error al procesar la firma de documentos');
    });
}

function rejectApplication() {
    console.log('Intentando rechazar solicitud. ID seleccionado:', selectedDocumentId);
    if (!selectedDocumentId) {
        Swal.fire({
            icon: 'warning',
            title: 'Atención',
            text: 'Por favor, seleccione una solicitud para rechazar',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'Aceptar'
        });
        return;
    }

    // Mostrar modal de confirmación con campo de comentario
    Swal.fire({
        title: '¿Rechazar solicitud?',
        html: `
            <div style="text-align: left;">
                <p style="margin-bottom: 15px; color: #666;">
                    <strong>⚠️ Advertencia:</strong> Estás a punto de rechazar esta solicitud. 
                    Esta acción no se puede deshacer.
                </p>
                <label for="motivoRechazo" style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                    Motivo del rechazo <span style="color: red;">*</span>
                </label>
                <textarea 
                    id="motivoRechazo" 
                    class="swal2-textarea" 
                    placeholder="Ingresa el motivo por el cual rechazas esta solicitud..."
                    style="width: 100%; height: 120px; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-family: inherit; font-size: 14px; resize: vertical;">
                </textarea>
                <div id="errorMotivo" style="color: #fb6f6f; font-size: 12px; margin-top: 5px; display: none;">
                    El motivo del rechazo es obligatorio
                </div>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#fb6f6f',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Rechazar',
        cancelButtonText: 'Cancelar',
        didOpen: function() {
            // Enfocar el textarea automáticamente
            const textarea = document.getElementById('motivoRechazo');
            if (textarea) {
                textarea.focus();
            }
        },
        preConfirm: function() {
            const motivo = document.getElementById('motivoRechazo').value.trim();
            const errorDiv = document.getElementById('errorMotivo');
            
            if (!motivo) {
                errorDiv.style.display = 'block';
                return false;
            }
            
            return motivo;
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            // Proceder con el rechazo
            const motivo = result.value;
            
            // Mostrar modal de carga
            const loadingModal = document.getElementById('loadingModal');
            if (loadingModal) {
                loadingModal.classList.add('active');
            }
            
            fetch(`/api/pending/${selectedDocumentId}/rechazar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    motivo: motivo
                })
            })
            .then(response => {
                // Ocultar modal de carga
                if (loadingModal) {
                    loadingModal.classList.remove('active');
                }

                if (response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Éxito',
                        text: 'La solicitud ha sido rechazada correctamente',
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
                // Ocultar modal de carga en caso de error
                if (loadingModal) {
                    loadingModal.classList.remove('active');
                }

                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al procesar el rechazo de la solicitud',
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Aceptar'
                });
            });
        }
    });
}

// ============= PAGINACIÓN PARA PENDING =============
let currentPagePending = 1;
let itemsPerPagePending = 6;
let allItemsPending = [];
let filteredItemsPending = [];

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializePaginationPending();
    }, 100);
});

function initializePaginationPending() {
    // Obtener todos los items del grid
    allItemsPending = Array.from(document.querySelectorAll('.documents-grid .document-card'));
    
    console.log('=== INICIALIZAR PAGINACIÓN PENDING ===');
    console.log('Total items encontrados:', allItemsPending.length);
    
    if (allItemsPending.length === 0) {
        console.log('No hay items para paginar');
        const paginationContainer = document.getElementById('paginationContainerPending');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
        return;
    }
    
    console.log('Items per page:', itemsPerPagePending);
    console.log('Total páginas:', Math.ceil(allItemsPending.length / itemsPerPagePending));
    
    // Inicializar filtros - todos los items visibles al inicio
    filteredItemsPending = [...allItemsPending];
    currentPagePending = 1;
    
    // Mostrar la primera página
    showPagePending(1);
    generatePaginationControlsPending();
}

function showPagePending(pageNumber) {
    if (pageNumber < 1 || pageNumber > Math.ceil(filteredItemsPending.length / itemsPerPagePending)) {
        console.warn('Número de página inválido:', pageNumber);
        return;
    }
    
    currentPagePending = pageNumber;
    
    // Calcular índices
    const startIndex = (pageNumber - 1) * itemsPerPagePending;
    const endIndex = startIndex + itemsPerPagePending;
    
    console.log(`=== MOSTRAR PÁGINA ${pageNumber} PENDING ===`);
    console.log(`Mostrando items ${startIndex} a ${endIndex - 1} de ${filteredItemsPending.length}`);
    
    // Primero, ocultar TODOS los items del DOM actual
    const allCurrentItems = Array.from(document.querySelectorAll('.documents-grid .document-card'));
    console.log('Items en el DOM:', allCurrentItems.length);
    
    allCurrentItems.forEach((item) => {
        item.style.display = 'none';
    });
    
    // Obtener los items a mostrar en esta página
    const itemsToShow = filteredItemsPending.slice(startIndex, endIndex);
    console.log(`Items a mostrar en esta página: ${itemsToShow.length}`);
    
    // Mostrar solo los items de esta página
    itemsToShow.forEach((item, index) => {
        item.style.display = 'block';
        const itemId = item.getAttribute('data-id');
        console.log(`  - Mostrando item ${startIndex + index}: ID=${itemId}`);
    });
    
    // Actualizar información de paginación
    updatePaginationInfoPending(startIndex, endIndex, filteredItemsPending.length);
    
    // Scroll hacia arriba
    document.documentElement.scrollTop = 0;
}

function generatePaginationControlsPending() {
    const totalPages = Math.ceil(filteredItemsPending.length / itemsPerPagePending);
    const paginationList = document.getElementById('paginationListPending');
    
    if (!paginationList) {
        console.error('paginationListPending no encontrado');
        return;
    }
    
    paginationList.innerHTML = '';
    
    console.log(`Generando controles de paginación: ${totalPages} páginas`);
    
    // Si no hay páginas o solo 1 página, ocultar paginación
    if (totalPages <= 1) {
        const paginationContainer = document.getElementById('paginationContainerPending');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
        return;
    }
    
    const paginationContainer = document.getElementById('paginationContainerPending');
    if (paginationContainer) {
        paginationContainer.style.display = 'flex';
    }
    
    // Botón anterior
    const prevLi = document.createElement('li');
    prevLi.className = currentPagePending === 1 ? 'disabled' : '';
    const prevLink = document.createElement('a');
    prevLink.href = '#';
    prevLink.innerHTML = '&laquo; Anterior';
    prevLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentPagePending > 1) {
            console.log('Click botón anterior');
            showPagePending(currentPagePending - 1);
            generatePaginationControlsPending();
        }
    });
    prevLi.appendChild(prevLink);
    paginationList.appendChild(prevLi);
    
    // Números de página
    let startPage = Math.max(1, currentPagePending - 2);
    let endPage = Math.min(totalPages, currentPagePending + 2);
    
    // Mostrar "1" si startPage > 1
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        const firstLink = document.createElement('a');
        firstLink.href = '#';
        firstLink.textContent = '1';
        firstLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Click página 1');
            showPagePending(1);
            generatePaginationControlsPending();
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
        if (i === currentPagePending) {
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
                    showPagePending(pageNum);
                    generatePaginationControlsPending();
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
            showPagePending(totalPages);
            generatePaginationControlsPending();
        });
        lastLi.appendChild(lastLink);
        paginationList.appendChild(lastLi);
    }
    
    // Botón siguiente
    const nextLi = document.createElement('li');
    nextLi.className = currentPagePending === totalPages ? 'disabled' : '';
    const nextLink = document.createElement('a');
    nextLink.href = '#';
    nextLink.innerHTML = 'Siguiente &raquo;';
    nextLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentPagePending < totalPages) {
            console.log('Click botón siguiente');
            showPagePending(currentPagePending + 1);
            generatePaginationControlsPending();
        }
    });
    nextLi.appendChild(nextLink);
    paginationList.appendChild(nextLi);
}

function updatePaginationInfoPending(startIndex, endIndex, total) {
    const info = document.getElementById('paginationInfoPending');
    if (info) {
        const showing = Math.min(endIndex, total);
        const display = total === 0 ? 'Mostrando 0 de 0 solicitudes' : `Mostrando ${startIndex + 1} - ${showing} de ${total} solicitudes`;
        info.textContent = display;
    }
}