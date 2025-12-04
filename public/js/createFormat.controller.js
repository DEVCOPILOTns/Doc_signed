 let etapaCounter = 0;

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
                                ID del Firmante
                                <span class="required">*</span>
                            </label>
                            <input 
                                type="text" 
                                name="idFirmante[]" 
                                class="form-input"
                                placeholder="Ej: colaborador, jefe, gerente"
                                required
                            />
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
            updateOrdenEtapas();
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
                alert('Debes agregar al menos una etapa de firma');
                return;
            }

            const formData = {
                nombreFormato: document.getElementById('nombreFormato').value,
                descripcion: document.getElementById('descripcion').value,
                estado: document.getElementById('estado').value,
                cantidadFirmantes: etapas.length,
                etapas: []
            };

            etapas.forEach((etapa, index) => {
                const idFirmante = etapa.querySelector('input[name="idFirmante[]"]').value;
                const palabraClave = etapa.querySelector('input[name="palabraClave[]"]').value;
                const posicionFirma = etapa.querySelector('input[name="posicionFirma[]"]').value;

                formData.etapas.push({
                    orden: index + 1,
                    idFirmante: idFirmante,
                    palabraClave: palabraClave,
                    posicionFirma: posicionFirma || null
                });
            });

            console.log('Datos del formato:', formData);
            
            // Aquí puedes enviar los datos al servidor
            // fetch('/api/formatos', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(formData)
            // })
            // .then(response => response.json())
            // .then(data => {
            //     alert('Formato creado exitosamente');
            //     window.location.href = '/formatos';
            // })
            // .catch(error => {
            //     alert('Error al crear el formato');
            //     console.error(error);
            // });

            alert('Formato guardado exitosamente (simulado)');
        });

        // Agregar una etapa por defecto al cargar
        document.getElementById('btnAddEtapa').click();