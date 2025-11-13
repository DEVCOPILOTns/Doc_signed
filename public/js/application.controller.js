
let selectedDocumentId = null;

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
                        const nombreDocumento = det.nombre_original || 'Documento sin nombre';

                        return `
                            <div class="detalle-section">
                                <div class="detalle-header">
                                    <h3>${nombreDocumento}</h3>
                                    <span class="fecha">
                                        ${formatearFecha(det.fecha_firma || det.fecha_solicitud)}
                                    </span>
                                </div>  
                                
                                <div class="detalle-content">
                                    <div><p><strong>ID:</strong> <span class="solicitud-id">${det.id_solicitud || ''}</span></p></div>
                                    <p><strong>ID detalle:</strong> ${det.id_detalle_firmado ?? det.id_registro_detalles ?? det.id_detalle ?? ''}</p>
                                    <p><strong>Estado:</strong> ${det.estado_documento || det.estado || ''}</p>
                                    <div class="document-actions">
                                        <button class="btn-preview" onclick="previewPDF('${documentUrl}')">
                                            <i class="fas fa-eye"></i> Ver documento
                                        </button>
                                        <a href="${documentUrl}" target="_blank" class="btn-download">
                                            <i class="fas fa-download"></i> Descargar PDF
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
        const wrapper = document.querySelector('.pdf-viewer-wrapper');
        if (!wrapper) {
            window.open(url, '_blank');
            return;
        }
        
        // ocultar iframe existente si hay
        const existingIframe = wrapper.querySelector('#pdfViewer');
        if (existingIframe) existingIframe.style.display = 'none';

        // eliminar objeto previo si existe
        const prevObj = wrapper.querySelector('#pdfObject');
        if (prevObj) prevObj.remove();

        // crear <object> para renderizar PDF
        const obj = document.createElement('object');
        obj.id = 'pdfObject';
        obj.type = 'application/pdf';
        obj.data = url;
        obj.width = '100%';
        obj.height = '100%'; // <-- 100% para ocupar todo el espacio
        obj.style.background = '#0f172a';
        obj.style.display = 'block';
        obj.style.minHeight = '0';
        obj.style.minWidth = '0';
        obj.style.position = 'relative';
        wrapper.appendChild(obj);

        const pdfNameEl = document.getElementById('pdfName');
        if (pdfNameEl) pdfNameEl.textContent = '';
        
        const pdfFallback = document.getElementById('pdfFallback');
        if (pdfFallback) pdfFallback.style.display = 'none';
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

// fuera de document.addEventListener(...)
function signAllDocuments() {
    console.log('Intentando firmar documentos. ID seleccionado:', selectedDocumentId);
    
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

    console.log('Enviando solicitud de firma para ID:', selectedDocumentId);

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