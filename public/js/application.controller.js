// Reemplaza el mock: ahora la vista ya renderizó las tarjetas server-side.
// Aquí asociamos los eventos sobre .document-card y pedimos detalles al backend para llenar el modal.

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.document-card');
    const modal = document.getElementById('myModal');
    const closeModal = document.getElementById('closeModal');
    const modalDetails = document.getElementById('modalDetails');
    const pdfName = document.getElementById('pdfName');

    //aqui va el evento para abrir el modal
    async function loadAndOpenModal(idSolicitud) {
        try {
            if (!idSolicitud) {
                console.warn('loadAndOpenModal: id inválido:', idSolicitud);
                return;
            }

            console.log('loadAndOpenModal: iniciando para id=', idSolicitud);
            if (!modalDetails) {
                console.error('loadAndOpenModal: modalDetails no existe en el DOM');
                return;
            }

            // UI: mostrar modal y estado de carga
            modalDetails.innerHTML = '<p class="loading">Cargando detalles...</p>';
            
            if (document.body) document.body.classList.add('modal-open');
            if (modal) modal.style.display = 'flex';
            
            const endpoint = `/api/application/${idSolicitud}`;
            let resp;
            try {
                resp = await fetch(endpoint, {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: { 'Accept': 'application/json' }
                });
            } catch (err) {
                console.error('loadAndOpenModal: error fetch', err);
                modalDetails.innerHTML = `<div class="error-message">Error conectando con el servidor. Ver consola.</div>`;
                return;
            }

            if (!resp || !resp.ok) {
                const text = await (resp ? resp.text().catch(()=>'<no body>') : '<no response>');
                console.error('loadAndOpenModal: respuesta no OK', resp && resp.status, text);
                modalDetails.innerHTML = `<div class="error-message">Error del servicio ${idSolicitud} (HTTP ${resp ? resp.status : 'N/A'}).</div>`;
                return;
            }

            let payload;
            try {
                payload = await resp.json();
            } catch (e) {
                console.error('loadAndOpenModal: fallo parseando JSON', e);
                const raw = await resp.text().catch(()=>'<no body>');
                modalDetails.innerHTML = `<p class="error-message">Respuesta inválida del servidor.</p><pre style="font-size:12px">${raw}</pre>`;
                return;
            }

            console.log('loadAndOpenModal: payload=', payload);

            // Normalizar: preferir 'detalles' (array). Si vienen bajo otra clave, intentar encontrar array.
            let detalles = [];
            if (Array.isArray(payload.detalles)) detalles = payload.detalles;
            else if (Array.isArray(payload.details)) detalles = payload.details;
            else if (Array.isArray(payload)) detalles = payload;
            else {
                for (const k of Object.keys(payload || {})) {
                    if (Array.isArray(payload[k])) { detalles = payload[k]; break; }
                }
            }

            if (!Array.isArray(detalles) || detalles.length === 0) {
                console.warn('loadAndOpenModal: no hay detalles', detalles);
                modalDetails.innerHTML = '<p class="no-detalles">No hay detalles disponibles.</p>';
                const pdfViewer = document.getElementById('pdfViewer');
                const documentListEl = document.getElementById('documentList');
                const pdfFallback = document.getElementById('pdfFallback');
                if (documentListEl) documentListEl.innerHTML = '<div style="padding:12px;color:#666">No hay documentos.</div>';
                if (pdfViewer) { pdfViewer.style.display = 'none'; if (pdfFallback) pdfFallback.style.display = ''; }
                return;
            }

            // helpers locales
            function toAbsoluteUrl(u) {
                if (!u) return '';
                if (/^https?:\/\//i.test(u)) return u;
                return window.location.origin + '/' + u.replace(/^\/+/, '');
            }

            // Construir UI principal usando el primer detalle
            const primero = detalles[0] || {};
            // determinar nombre/fecha/estado desde campos comunes
            const nombrePrimero = primero.nombre_original || primero.nombre || primero.titulo || primero.descripcion || `Detalle ${1}`;
            const urlPrimeroRaw = primero.url_archivo || primero.url || primero.url_archivo_firmado || primero.link || '';
            const urlPrimero = toAbsoluteUrl(urlPrimeroRaw);
            const fechaPrimero = formatDate(primero.fecha_firma || primero.fecha_solicitud || primero.fecha || primero.created_at);

            // construir lista HTML sencilla (se muestra en la parte derecha y en la lista inline)
            const listHtml = detalles.map((d, idx) => {
                const name = d.nombre_original || d.nombre || d.titulo || `Archivo ${idx + 1}`;
                const raw = d.url_archivo || d.url || d.link || '';
                const url = toAbsoluteUrl(raw);
                const fecha = formatDate(d.fecha_firma || d.fecha_solicitud || d.fecha || d.created_at);
                const idDetalle = d.id_detalle_firmado ?? d.id_detalle ?? d.id_registro_detalles ?? d.id ?? '';
                // escapar comillas simples en name para onclick inline si se usara
                const safeName = (name || '').replace(/'/g, "\\'");
                return `
                    <div class="doc-list-item">
                        <div class="doc-left">
                            <div class="doc-name">${name}</div>
                            <div class="doc-meta">ID detalle: ${idDetalle} · Fecha: ${fecha}</div>
                        </div>
                        <div class="doc-actions">
                            <button class="btn-preview" data-url="${url}" data-name="${safeName}">Ver</button>
                            <a class="btn-download" href="${url}" target="_blank" rel="noopener noreferrer">Descargar</a>
                        </div>
                    </div>
                `;
            }).join('');

            // Renderizar el modal (lado izquierdo con resumen del primero y lista derecha)
            modalDetails.innerHTML = `
                <div class="detalle-section">
                    <div class="detalle-header">
                        <h3>${nombrePrimero}</h3>
                        <span class="fecha">${fechaPrimero}</span>
                    </div>
                    <div class="detalle-content">
                        <p><strong>ID principal:</strong> ${primero.id_solicitud ?? primero.id ?? ''}</p>
                        <p><strong>Estado:</strong> ${primero.estado_documento ?? primero.estado ?? ''}</p>
                        <div class="document-actions">
                            ${ urlPrimero ? `<button class="btn-preview" id="btnPreviewPrimary" data-url="${urlPrimero}" data-name="${(nombrePrimero||'').replace(/'/g,"\\'")}">Ver documento</button>
                            <a href="${urlPrimero}" target="_blank" class="btn-download">Descargar PDF</a>` : '<span style="color:#666">Sin archivo principal</span>' }
                        </div>
                    </div>
                </div>
                <div id="documentListInline">${listHtml}</div>
            `;

            // rellenar lista lateral y conectar eventos de vista previa
            const documentListEl = document.getElementById('documentList');
            const pdfViewer = document.getElementById('pdfViewer');
            const pdfFallback = document.getElementById('pdfFallback');
            const pdfNameEl = document.getElementById('pdfName');

            if (documentListEl) documentListEl.innerHTML = listHtml;

            // asignar listeners para botones generados (delegación simple)
            const previewButtons = modalDetails.querySelectorAll('.btn-preview');
            previewButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const url = btn.getAttribute('data-url') || btn.dataset.url || '';
                    const name = btn.getAttribute('data-name') || btn.dataset.name || '';
                    if (!url) { console.warn('preview: url vacía para', name); return; }
                    if (pdfViewer) {
                        pdfViewer.src = url;
                        if (pdfNameEl) pdfNameEl.textContent = name || '';
                        if (pdfViewer) { pdfViewer.style.display = ''; if (pdfFallback) pdfFallback.style.display = 'none'; }
                    } else {
                        // si no hay iframe disponible usar función global existente
                        previewPDF(url, name);
                    }
                });
            });

            // cargar primer archivo en visor si existe
            if (urlPrimero && pdfViewer) {
                setTimeout(() => {
                    try {
                        pdfViewer.src = urlPrimero;
                        if (pdfNameEl) pdfNameEl.textContent = nombrePrimero || '';
                        if (pdfFallback) pdfFallback.style.display = 'none';
                    } catch (e) { /* ignore */ }
                }, 80);
            }

        } catch (error) {
            console.error('loadAndOpenModal: excepción general:', error);
            if (modalDetails) {
                modalDetails.innerHTML = `<p class="error-message">Error al cargar detalles: ${error && error.message ? error.message : 'Error desconocido'}</p>`;
            }
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