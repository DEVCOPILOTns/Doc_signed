// Reemplaza el mock: ahora la vista ya renderizó las tarjetas server-side.
// Aquí asociamos los eventos sobre .document-card y pedimos detalles al backend para llenar el modal.

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.document-card');
    const modal = document.getElementById('myModal');
    const closeModal = document.getElementById('closeModal');
    const modalDetails = document.getElementById('modalDetails');
    const pdfName = document.getElementById('pdfName');

    async function loadAndOpenModal(id) {
        try {
            modalDetails.innerHTML = '<p class="loading">Cargando detalles...</p>';
            document.body.classList.add('modal-open');
            modal.style.display = 'flex';

            const resp = await fetch(`/api/applications/${encodeURIComponent(id)}`, { credentials: 'same-origin' });
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }
            const payload = await resp.json();
            const det = payload.detalles;

            if (!det) {
                modalDetails.innerHTML = '<p class="no-detalles">No hay detalles disponibles</p>';
                return;
            }

            // Construir contenido del modal (similar a pending)
            modalDetails.innerHTML = `
                <div class="detalle-section">
                    <div class="detalle-header"><h3>Información General</h3></div>
                    <div class="detalle-content">
                        <p><strong>ID de Solicitud:</strong> <span class="solicitud-id">${det.id}</span></p>
                        <p><strong>Estado:</strong> <span class="document-status">${det.estado}</span></p>
                        <p><strong>Fecha:</strong> ${formatDate(det.fecha_mostrar)}</p>
                        <p><strong>Tipo:</strong> ${det.tipo || ''}</p>
                    </div>
                </div>
                <div class="detalle-section">
                    <div class="detalle-header"><h3>Solicitante</h3></div>
                    <div class="detalle-content">
                        <p><strong>Nombre:</strong> ${det.nombre_usuario}</p>
                        <p><strong>Cédula:</strong> ${det.cedula}</p>
                    </div>
                </div>
                <div class="detalle-section">
                    <div class="detalle-header"><h3>Comentarios</h3></div>
                    <div class="detalle-content">
                        <p>${det.desc_comentario || 'Sin comentarios'}</p>
                    </div>
                </div>
                ${det.archivos && det.archivos.length > 0 ? `<div class="document-actions" id="documentActions"></div>` : ''}
            `;

            // Mostrar primer archivo info si existe
            if (det.archivos && det.archivos.length > 0) {
                const actions = document.getElementById('documentActions');
                det.archivos.forEach((a, idx) => {
                    const btnPreview = document.createElement('button');
                    btnPreview.className = 'btn-preview';
                    btnPreview.textContent = `👁️ Vista Previa ${idx+1}`;
                    btnPreview.addEventListener('click', () => previewPDF(a.url_archivo, a.nombre_original));
                    const btnDownload = document.createElement('button');
                    btnDownload.className = 'btn-download';
                    btnDownload.textContent = '⬇️ Descargar';
                    btnDownload.addEventListener('click', () => {
                        window.open(a.url_archivo, '_blank');
                    });
                    const container = document.createElement('div');
                    container.className = 'archivo-row';
                    container.appendChild(btnPreview);
                    container.appendChild(btnDownload);
                    actions.appendChild(container);
                });
                // mostrar nombre del primer pdf en el placeholder
                if (pdfName) pdfName.textContent = det.archivos[0].nombre_original || '';
            } else {
                if (pdfName) pdfName.textContent = '';
            }

        } catch (error) {
            console.error('Error al cargar detalles:', error);
            modalDetails.innerHTML = `<p class="error-message">Error al cargar detalles</p>`;
        }
    }

    function formatDate(dateString) {
        if (!dateString) return 'Sin fecha';
        const date = new Date(dateString);
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

    function previewPDF(url, name) {
        // si existe un iframe o placeholder en la vista lo actualiza; si no, abre en nueva pestaña
        const pdfViewer = document.getElementById('pdfViewer');
        if (pdfViewer) {
            pdfViewer.src = url;
            if (pdfName) pdfName.textContent = name || '';
        } else {
            window.open(url, '_blank');
        }
    }

    // Asociar click a cada tarjeta renderizada server-side
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            if (id) loadAndOpenModal(id);
        });
        // hover visual
        card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-5px) scale(1.02)'; });
        card.addEventListener('mouseleave', () => { card.style.transform = 'translateY(0) scale(1)'; });
    });

    // cerrar modal
    if (closeModal) closeModal.onclick = () => { modal.style.display = 'none'; document.body.classList.remove('modal-open'); };
    window.onclick = (e) => { if (e.target === modal) { modal.style.display = 'none'; document.body.classList.remove('modal-open'); } };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { modal.style.display = 'none'; document.body.classList.remove('modal-open'); } });
});