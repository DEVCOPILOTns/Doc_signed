let isDrawing = false;
        let canvas, ctx;

        document.addEventListener('DOMContentLoaded', function() {
            updateSignaturePreview();
            initCanvas();
            initializeFileUpload();
        });

        function initializeFileUpload() {
            const fileInput = document.getElementById('signatureUpload');
            const submitBtn = document.querySelector('form[name="files"] .btn-primary');
            const form = document.querySelector('form[name="files"]');
            
            // Deshabilitar el botón inicialmente
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
            }
            
            // Agregar event listener para cambios en el archivo
            fileInput.addEventListener('change', function(e) {
                handleFileSelection(e);
            });
            
            // Manejar el envío del formulario
            form.addEventListener('submit', function(event) {
                event.preventDefault(); // Prevenir envío por defecto
                
                const files = fileInput.files;
                if (files.length === 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Archivo requerido',
                        text: 'Por favor, adjunta una imagen antes de guardar.',
                        confirmButtonText: 'OK'
                    });
                    return false;
                }
                
                // Crear FormData manualmente para asegurar que se envía correctamente
                const formData = new FormData();
                formData.append('files', files[0]); // Agregar el archivo
                
                // Enviar con fetch para mejor control
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = 'Guardando...';
                
                fetch(form.action, {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    // Capturar la respuesta (puede ser JSON o texto)
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return response.json().then(data => ({
                            status: response.status,
                            ok: response.ok,
                            data: data
                        }));
                    } else {
                        // Si no es JSON, es una redirección o HTML
                        return {
                            status: response.status,
                            ok: response.ok,
                            data: { message: response.statusText }
                        };
                    }
                })
                .then(result => {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.innerHTML = originalText;
                    
                    // Si la respuesta fue exitosa (200)
                    if (result.ok || result.status === 302 || result.status === 200) {
                        Swal.fire({
                            icon: 'success',
                            title: '¡Éxito!',
                            text: 'Firma guardada exitosamente',
                            confirmButtonText: 'OK'
                        }).then(() => {
                            window.location.href = '/api/userProfile';
                        });
                    } else {
                        // Si hay error, mostrar mensaje del servidor
                        const errorMsg = result.data.message || result.data.probableCause || 'Error al guardar la firma';
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorMsg,
                            confirmButtonText: 'OK'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error completo:', error);
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.innerHTML = originalText;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Error al guardar la firma: ' + error.message,
                        confirmButtonText: 'OK'
                    });
                });
                
                return false;
            });
        }

        function handleFileSelection(e) {
            const file = e.target.files[0];
            const submitBtn = document.querySelector('form[name="files"] .btn-primary');
            const previewContainer = document.querySelector('.preview-image');
            const previewImg = document.getElementById('signaturePreview');
            
            if (file) {
                // Validar que sea una imagen
                if (!file.type.startsWith('image/')) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Formato inválido',
                        text: 'Por favor, selecciona un archivo de imagen válido (PNG, JPG, SVG).',
                        confirmButtonText: 'OK'
                    });
                    e.target.value = '';
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.5';
                    return;
                }
                
                // Validar tamaño máximo (15MB)
                const maxSize = 15 * 1024 * 1024; // 15MB
                if (file.size > maxSize) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Archivo muy grande',
                        text: 'El archivo es demasiado grande. El tamaño máximo es 15MB.',
                        confirmButtonText: 'OK'
                    });
                    e.target.value = '';
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.5';
                    return;
                }
                
                // Mostrar vista previa
                const reader = new FileReader();
                reader.onload = function(event) {
                    previewImg.src = event.target.result;
                    previewImg.style.display = 'block';
                    
                    // Eliminar mensaje de "Carga una imagen"
                    const existingMessage = previewContainer.querySelector('div[style*="text-align"]');
                    if (existingMessage) {
                        existingMessage.remove();
                    }
                    
                    // Habilitar el botón de envío
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                };
                reader.readAsDataURL(file);
            } else {
                // Si no hay archivo, deshabilitar el botón
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
            }
        }

        function updateSignaturePreview() {
            const editor = document.getElementById('signatureEditor');
            const preview = document.getElementById('signaturePreview');
            if (editor) {
                preview.textContent = editor.value || 'No hay contenido en la firma...';
            }
        }

        function switchTab(tabName) {
            // Ocultar todas las pestañas
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Mostrar la pestaña seleccionada
            event.target.classList.add('active');
            document.getElementById(tabName + 'Tab').classList.add('active');
        }

        function initCanvas() {
            canvas = document.getElementById('signatureCanvas');
            if (!canvas) return;
            
            ctx = canvas.getContext('2d');
            
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing);
            
            // Touch events para móviles
            canvas.addEventListener('touchstart', function(e) {
                e.preventDefault();
                startDrawing(e.touches[0]);
            });
            canvas.addEventListener('touchmove', function(e) {
                e.preventDefault();
                draw(e.touches[0]);
            });
            canvas.addEventListener('touchend', function(e) {
                e.preventDefault();
                stopDrawing();
            });
            
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
        }

        function startDrawing(e) {
            isDrawing = true;
            const rect = canvas.getBoundingClientRect();
            ctx.beginPath();
            ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        }

        function draw(e) {
            if (!isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
            ctx.stroke();
        }

        function stopDrawing() {
            isDrawing = false;
        }

        function clearCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        function changePenColor() {
            const color = document.getElementById('penColor').value;
            ctx.strokeStyle = color;
        }

        function saveDrawnSignature() {
            const imageData = canvas.toDataURL();
            alert('Firma manuscrita guardada exitosamente!');
            console.log('Firma manuscrita guardada:', imageData);
        }

        function saveSignatureConfig() {
            const activeTab = document.querySelector('.tab.active').textContent;
            let configData = { type: activeTab };
            
            if (activeTab.includes('Texto')) {
                configData.signature = document.getElementById('signatureEditor').value;
            } else if (activeTab.includes('Manuscrita')) {
                configData.signature = canvas.toDataURL();
            }
            
            alert('Configuración de firma guardada exitosamente!');
            console.log('Configuración guardada:', configData);
        }

        function testSignature() {
            alert('Función de prueba de firma ejecutada. Se generaría un documento de prueba con tu firma actual.');
        }

        function exportSignature() {
            const activeTab = document.querySelector('.tab.active').textContent;
            if (activeTab.includes('Manuscrita')) {
                const link = document.createElement('a');
                link.download = 'mi_firma.png';
                link.href = canvas.toDataURL();
                link.click();
            } else {
                alert('Función de exportación disponible solo para firmas manuscritas.');
            }
        }
