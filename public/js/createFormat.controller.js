 let etapaCounter = 0;
        let signerUsers = signerUsersData || [];

        console.log('Firmantes disponibles:', signerUsers);

        // Crear opciones del select de firmantes
        function generateSignerOptions() {
            if (!signerUsers || signerUsers.length === 0) {
                return '<option value="">No hay firmantes disponibles</option>';
            }
            let options = '<option value="">Selecciona un firmante</option>';
            signerUsers.forEach(signer => {
                options += `<option value="${signer.id_registro_usuarios}">${signer.nombre_completo}</option>`;
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

            const formData = {
                nombreFormato: document.getElementById('nombreFormato').value.trim(),
                descripcion: document.getElementById('descripcion').value.trim(),
                estado: document.getElementById('estado').value,
                cantidadFirmantes: etapas.length,
                etapas: []
            };

            etapas.forEach((etapa, index) => {
                const idFirmante = etapa.querySelector('select[name="idFirmante[]"]').value;
                const palabraClave = etapa.querySelector('input[name="palabraClave[]"]').value.trim();
                const posicionFirma = etapa.querySelector('input[name="posicionFirma[]"]').value.trim();

                formData.etapas.push({
                    orden: index + 1,
                    idFirmante,
                    palabraClave,
                    posicionFirma: posicionFirma || null
                });
            });

            console.log('Enviando formato con etapas:', formData);

            fetch('/api/createFormat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al crear el formato');
                }
                return response.text();
            })
            .then(data => {
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Formato creado exitosamente',
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Continuar'
                }).then(() => {
                    window.location.href = '/api/index';
                });
            })
            .catch(error => {
                console.error('Error al enviar formato:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al crear el formato: ' + error.message,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'Cerrar'
                });
            });
        });


        // Agregar una etapa por defecto al cargar
        document.getElementById('btnAddEtapa').click();