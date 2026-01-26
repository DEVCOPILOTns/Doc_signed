let etapaCounter = 0;
        let signerUsers = signerUsersData || [];

        console.log('Firmantes disponibles:', signerUsers);

        // Funciones para abrir y cerrar el modal
        function openFormatModal(event) {
            event.preventDefault();
            document.getElementById('formatModal').classList.add('active');
            document.body.style.overflow = 'hidden';
            // Resetear el formulario cuando se abre el modal
            document.getElementById('formatoForm').reset();
            document.getElementById('formatoForm').dataset.editing = '';
            document.getElementById('formatoForm').dataset.formatId = '';
            document.getElementById('etapasContainer').innerHTML = '';
            etapaCounter = 0;
            // Mostrar botón de agregar etapa en modo creación
            document.getElementById('btnAddEtapa').style.display = 'block';
            document.getElementById('btnAddEtapa').click();
            // Cambiar título y botón del modal
            document.querySelector('.modal-header h2').textContent = 'Crear Nuevo Formato';
            document.querySelector('.btn-success').innerHTML = '<span>💾</span> Guardar Formato';
        }

        function closeFormatModal() {
            document.getElementById('formatModal').classList.remove('active');
            document.body.style.overflow = 'auto';
            // Limpiar el estado de edición
            document.getElementById('formatoForm').dataset.editing = '';
            document.getElementById('formatoForm').dataset.formatId = '';
        }

        // Cerrar modal al hacer clic fuera de él
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('formatModal');
            if (event.target === modal) {
                closeFormatModal();
            }
        });


        // Función para editar un formato
        async function editFormat(formatId) {
            try {
                console.log('Editando formato ID:', formatId);
                console.log('Tipo de ID:', typeof formatId);
                
                // Validar que el ID sea un número
                const numericId = parseInt(formatId);
                if (isNaN(numericId)) {
                    throw new Error(`ID inválido: "${formatId}" no es un número`);
                }
                
                //Aqui hago el fetch para obtener los datos del formato
                const url = `/api/createFormat/${numericId}`;
                console.log('URL de fetch:', url);
                
                const response = await fetch(url);
                console.log('Response status:', response.status);
                console.log('Response statusText:', response.statusText);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Response error:', errorText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
                }
                
                const formato = await response.json();
                console.log('Formato obtenido:', formato);
                console.log('Etapas:', formato.etapas);
                console.log('Cantidad de etapas:', formato.etapas ? formato.etapas.length : 0);
                
                // Guardar las etapas originales para detectar eliminadas
                window.etapasOriginales = formato.etapas || [];
                
                // Marcar el formulario como edición
                document.getElementById('formatoForm').dataset.editing = 'true';
                document.getElementById('formatoForm').dataset.formatId = formatId;

                // Llenar campos básicos
                document.getElementById('nombreFormato').value = formato.nombre_formato || '';
                document.getElementById('descripcion').value = formato.descripcion || '';
                document.getElementById('estado').value = formato.estado || 'activo';

                // Limpiar etapas anteriores
                document.getElementById('etapasContainer').innerHTML = '';
                etapaCounter = 0;

                // Agregar etapas existentes
                if (formato.etapas && formato.etapas.length > 0) {
                    formato.etapas.forEach((etapa) => {
                        etapaCounter++;
                        const etapaHTML = `
                            <div class="etapa-card etapa-existing" data-etapa="${etapaCounter}" data-etapa-id="${etapa.id_registro_etapa}" style="background-color: #f8f9fa; border-left: 4px solid #0066cc;">
                                <div class="etapa-header">
                                    <div class="etapa-number" style="background-color: #e8f0ff; color: #0066cc;">${etapaCounter}</div>
                                    <span class="badge-existing" style="background-color: #d4e5ff; color: #0066cc; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">EXISTENTE</span>
                                    <button type="button" class="btn-remove-etapa" onclick="removeEtapa(this)">×</button>
                                </div>
                                <div class="etapa-fields" style="opacity: 0.95;">
                                    <div class="form-group">
                                        <label class="form-label">
                                            Selecciona el Firmante
                                            <span class="required">*</span>
                                        </label>
                                        <select 
                                            name="idFirmante[]" 
                                            class="form-select"
                                            style="background-color: #ffffff; border: 1px solid #ccc;"
                                            required
                                        >
                                            ${generateSignerOptions(etapa.id_firmante)}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">
                                            Palabra Clave
                                            <span class="required">*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            name="palabraClave[]" 
                                            class="form-input"
                                            placeholder="Ej: FIRMA_COLABORADOR"
                                            value="${etapa.palabra_clave || ''}"
                                            style="background-color: #ffffff; border: 1px solid #ccc;"
                                            required
                                        />
                                    </div>
                                    <div class="form-group etapa-field-full">
                                        <label class="form-label">
                                            Posición de Firma (JSON)
                                        </label>
                                        <input 
                                            type="text" 
                                            name="posicionFirma[]" 
                                            class="form-input"
                                            placeholder='{"x": 50, "y": -20}'
                                            value="${etapa.posicion_firma || ''}"
                                            style="background-color: #ffffff; border: 1px solid #ccc;"
                                        />
                                        <span class="form-help">Coordenadas relativas para la posición de la firma</span>
                                    </div>
                                </div>
                            </div>
                        `;
                        document.getElementById('etapasContainer').insertAdjacentHTML('beforeend', etapaHTML);
                    });
                    // Mostrar botón de agregar etapa para agregar más etapas
                    document.getElementById('btnAddEtapa').style.display = 'block';
                } else {
                    // Si no hay etapas, agregar una por defecto
                    document.getElementById('btnAddEtapa').click();
                }

                // Cambiar título y botón del modal
                document.querySelector('.modal-header h2').textContent = 'Editar Formato';
                document.querySelector('.btn-success').innerHTML = '<span>💾</span> Actualizar Formato';

                // Abrir el modal
                document.getElementById('formatModal').classList.add('active');
                document.body.style.overflow = 'hidden';
            } catch (error) {
                console.error('Error al cargar el formato:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al cargar el formato: ' + error.message,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'Cerrar'
                });
            }
        }

        //Función para inhabilitar formato
        async function disableFormat(formatId) {
            try {
                console.log('Inhabilitando formato ID:', formatId);
                const url = `/api/createFormat/disable/${formatId}`;
                const response = await fetch(url, { method: 'PUT' });
                console.log('Response status:', response.status);
                console.log('Response statusText:', response.statusText);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Response error:', errorText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
                }
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Formato inhabilitado exitosamente',
                    confirmButtonColor: '#3085d6',  
                    confirmButtonText: 'Continuar'
                }).then(() => {
                    // Recarga la página para ver los cambios
                    window.location.reload();
                });
            } catch (error) {
                console.error('Error al inhabilitar el formato:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al inhabilitar el formato: ' + error.message,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'Cerrar'
                });
            }
        }

        async function activateFormat(formatId) {
            try {
                console.log('Activando formato ID:', formatId);
                const url = `/api/createFormat/activate/${formatId}`;
                const response = await fetch(url, { method: 'PUT' });
                console.log('Response status:', response.status);
                console.log('Response statusText:', response.statusText);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Response error:', errorText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
                }
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Formato activado exitosamente',
                    confirmButtonColor: '#3085d6',  
                    confirmButtonText: 'Continuar'
                }).then(() => {
                    // Recarga la página para ver los cambios
                    window.location.reload();
                });
            }
            catch (error) {
                console.error('Error al activar el formato:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al activar el formato: ' + error.message,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'Cerrar'
                });
            }
        }




        // Crear opciones del select de firmantes
        function generateSignerOptions(selectedId = null) {
            if (!signerUsers || signerUsers.length === 0) {
                return '<option value="">No hay firmantes disponibles</option>';
            }
            let options = '<option value="">Selecciona un firmante</option>';
            signerUsers.forEach(signer => {
                const selected = selectedId && signer.id_registro_usuarios == selectedId ? 'selected' : '';
                options += `<option value="${signer.id_registro_usuarios}" ${selected}>${signer.nombre_completo}</option>`;
            });
            return options;
        }



        // Agregar etapa de firma
        document.getElementById('btnAddEtapa').addEventListener('click', function() {
            etapaCounter++;
            const etapaHTML = `
                <div class="etapa-card" data-etapa="${etapaCounter}">
                    <div class="etapa-header">
                        <div class="etapa-number">${etapaCounter}</div>
                        <button type="button" class="btn-remove-etapa" onclick="removeEtapa(this)">×</button>
                    </div>
                    <div class="etapa-fields">
                        <div class="form-group">
                            <label class="form-label">
                                Selecciona el Firmante
                                <span class="required">*</span>
                            </label>
                            <select 
                                name="idFirmante[]" 
                                class="form-select"
                                required
                            >
                                ${generateSignerOptions()}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                Palabra Clave
                                <span class="required">*</span>
                            </label>
                            <input 
                                type="text" 
                                name="palabraClave[]" 
                                class="form-input"
                                placeholder="Ej: FIRMA_COLABORADOR"
                                required
                            />
                        </div>
                        <div class="form-group etapa-field-full">
                            <label class="form-label">
                                Posición de Firma (JSON)
                            </label>
                            <input 
                                type="text" 
                                name="posicionFirma[]" 
                                class="form-input"
                                placeholder='{"x": 50, "y": -20}'
                            />
                            <span class="form-help">Coordenadas relativas para la posición de la firma</span>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('etapasContainer').insertAdjacentHTML('beforeend', etapaHTML);
            updateOrdenEtapas(); //aqui actualizo la numeracion de etapas
        });



        // Remover etapa
        function removeEtapa(button) {
            const etapaCard = button.closest('.etapa-card');
            etapaCard.remove();
            updateOrdenEtapas();
        }

        // Actualizar numeración de etapas
        function updateOrdenEtapas() {
            const etapas = document.querySelectorAll('.etapa-card');
            etapas.forEach((etapa, index) => {
                const number = etapa.querySelector('.etapa-number');
                number.textContent = index + 1;
                etapa.dataset.etapa = index + 1;
            });
        }

        // Submit del formulario
    document.getElementById('formatoForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const etapas = document.querySelectorAll('.etapa-card');
            
            if (etapas.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sin etapas',
                    text: 'Debes agregar al menos una etapa de firma',
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Entendido'
                });
                return;
            }

            const isEditing = document.getElementById('formatoForm').dataset.editing === 'true';
            const formatId = document.getElementById('formatoForm').dataset.formatId;

            const formData = {
                nombreFormato: document.getElementById('nombreFormato').value.trim(),
                descripcion: document.getElementById('descripcion').value.trim(),
                estado: document.getElementById('estado').value,
                cantidadFirmantes: etapas.length,
                etapas: [],
                etapasEliminar: [] // Etapas que fueron eliminadas
            };

            etapas.forEach((etapa, index) => {
                const idFirmante = etapa.querySelector('select[name="idFirmante[]"]').value;
                const palabraClave = etapa.querySelector('input[name="palabraClave[]"]').value.trim();
                const posicionFirma = etapa.querySelector('input[name="posicionFirma[]"]').value.trim();
                const idEtapa = etapa.dataset.etapaId; // ID de etapa existente si existe

                formData.etapas.push({
                    id_registro_etapa: idEtapa || null, // null si es nueva etapa
                    orden: index + 1,
                    idFirmante,
                    palabraClave,
                    posicionFirma: posicionFirma || null
                });
            });

            // Si estamos editando, calcular qué etapas fueron eliminadas
            if (isEditing && window.etapasOriginales) {
                const idsActuales = formData.etapas
                    .filter(e => e.id_registro_etapa)
                    .map(e => parseInt(e.id_registro_etapa));
                
                window.etapasOriginales.forEach(etapaOriginal => {
                    if (!idsActuales.includes(etapaOriginal.id_registro_etapa)) {
                        formData.etapasEliminar.push(etapaOriginal.id_registro_etapa);
                    }
                });
            }

            console.log('Enviando formato:', formData);
            console.log('Modo edición:', isEditing);

            //aqui hago el fetch para enviar los datos al servidor
            const url = isEditing ? `/api/createFormat/${formatId}` : '/api/createFormat';
            const method = isEditing ? 'PUT' : 'POST'; //aqui defino el metodo segun si es edicion o creacion

            console.log('URL:', url);
            console.log('Método:', method);
            console.log('Body:', JSON.stringify(formData));

            fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })
            .then(response => {
                console.log('Response save status:', response.status);
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`HTTP ${response.status}: ${text}`);
                    });
                }
                return response.text();
            })
            .then(data => {
                const titulo = isEditing ? 'Actualizado' : 'Creado';
                const mensaje = isEditing ? 'Formato actualizado exitosamente' : 'Formato creado exitosamente';
                
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: mensaje,
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Continuar'
                }).then(() => {
                    closeFormatModal();
                    // Recarga la página para ver los cambios
                    window.location.reload();
                });
            })
            .catch(error => {
                console.error('Error al enviar formato:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al guardar el formato: ' + error.message,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'Cerrar'
                });
            });
        });


        // Agregar una etapa por defecto al cargar
        document.getElementById('btnAddEtapa').click();