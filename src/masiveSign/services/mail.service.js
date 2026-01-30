const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false // ✅ Permite certificados autofirmados
    }
});

// ==================== PLANTILLA PARA FIRMANTES ====================
const htmlContentForSigners = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        </style>
    </head>
    <body style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 20px; margin: 0;">
        
        <div style="max-width: 600px; margin: 0 auto;">
            
            <!-- Header con logo y fondo -->
            <div style="background: linear-gradient(135deg, #00A3B4 0%, #0088A0 100%); border-radius: 20px 20px 0 0; padding: 40px 30px; text-align: center; position: relative; overflow: hidden;">
                
                <h1 style="color: #ffffff; font-size: 36px; font-weight: 700; margin-bottom: 10px; position: relative; z-index: 1;">
                    <span style="color: #E3E766;">DocSigned</span>
                </h1>
                <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; position: relative; z-index: 1;">Firma Digital Segura</p>
            </div>

            <!-- Contenido principal -->
            <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0, 163, 180, 0.1);">
                
                <!-- Saludo personalizado -->
                <div style="margin-bottom: 30px;">
                    <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">
                        ¡Hola!
                    </p>
                </div>

                <!-- Mensaje principal -->
                <div style="background: linear-gradient(135deg, rgba(0, 163, 180, 0.05) 0%, rgba(227, 231, 102, 0.05) 100%); border-left: 4px solid #00A3B4; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <p style="color: #334155; font-size: 15px; line-height: 1.8; margin: 0;">
                        Has sido incluido como <strong>firmante</strong> en una nueva solicitud de firma digital. Esto significa que necesitas autorizar para validar este documento.
                    </p>
                </div>


                <!-- CTA Principal -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #00A3B4 0%, #0088A0 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0, 163, 180, 0.3); border: none; cursor: pointer;">
                        ✓ Revisar y Firmar
                    </a>
                </div>

                <!-- Información adicional -->
                <div style="background: #fff8e1; border-left: 4px solid #E3E766; padding: 15px; border-radius: 6px; margin-bottom: 30px;">
                    <p style="color: #7c5c15; font-size: 13px; line-height: 1.6; margin: 0;">
                        <strong>💡 Consejo:</strong> Asegúrate de revisar cuidadosamente todos los detalles del documento antes de firmarlo. Tu firma es vinculante y válida legalmente.
                    </p>
                </div>

                <!-- Pasos a seguir -->
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #00A3B4; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.5px;">
                        📝 Próximos Pasos
                    </h3>
                    <ol style="color: #334155; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                        <li style="margin-bottom: 10px;">Haz clic en el botón <strong>"Revisar y Firmar"</strong> más arriba</li>
                        <li style="margin-bottom: 10px;">Revisa el contenido del documento completo</li>
                        <li style="margin-bottom: 10px;">Proporciona tu firma digital de forma segura</li>
                        <li>¡Listo! Tu firma será registrada automáticamente</li>
                    </ol>
                </div>

            </div>

            <!-- Footer -->
            <div style="background: #0f172a; color: #cbd5e1; padding: 25px 30px; border-radius: 0 0 20px 20px; font-size: 13px; text-align: center; line-height: 1.6;">
                <p style="margin-bottom: 15px;">
                    <strong style="color: #E3E766;">DocSigned</strong> • Sistema de Firma Digital Segura
                </p>
                <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                    Este es un correo automático. Por favor no respondas directamente a este mensaje.<br>
                    Si tienes dudas, contacta al administrador del sistema.
                </p>
            </div>

        </div>
    </body>
    </html>
`;

// ==================== PLANTILLA PARA SOLICITANTE ====================
const htmlContentForRequester = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        </style>
    </head>
    <body style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 20px; margin: 0;">
        
        <div style="max-width: 600px; margin: 0 auto;">
            
            <!-- Header con logo y fondo -->
            <div style="background: linear-gradient(135deg, #00A3B4 0%, #0088A0 100%); border-radius: 20px 20px 0 0; padding: 40px 30px; text-align: center; position: relative; overflow: hidden;">
                
                <h1 style="color: #ffffff; font-size: 36px; font-weight: 700; margin-bottom: 10px; position: relative; z-index: 1;">
                    <span style="color: #E3E766;">DocSigned</span>
                </h1>
                <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; position: relative; z-index: 1;">Firma Digital Segura</p>
            </div>

            <!-- Contenido principal -->
            <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0, 163, 180, 0.1);">
                
                <!-- Saludo personalizado -->
                <div style="margin-bottom: 30px;">
                    <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">
                        ¡Hola!
                    </p>
                </div>

                <!-- Mensaje de éxito -->
                <div style="background: linear-gradient(135deg, rgba(0, 163, 180, 0.05) 0%, rgba(227, 231, 102, 0.05) 100%); border-left: 4px solid #28a745; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <p style="color: #334155; font-size: 15px; line-height: 1.8; margin: 0;">
                        <strong style="color: #28a745;">✓ Solicitud de firma creada exitosamente</strong><br><br>
                        Tu solicitud de firma masiva ha sido registrada en el sistema. Los documentos han sido cargados correctamente y se han enviado notificaciones a todos los firmantes incluidos.
                    </p>
                </div>

                <!-- Resumen de la solicitud -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <h3 style="color: #00A3B4; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.5px;">
                        📋 Resumen de tu Solicitud
                    </h3>
                    <div style="color: #334155; font-size: 14px; line-height: 2;">
                        <p style="margin: 0;"><strong>Número de solicitud:</strong> #{{solicitudId}}</p>
                        <p style="margin: 0;"><strong>Formato de firma:</strong> {{formatoNombre}}</p>
                        <p style="margin: 0;"><strong>Documentos cargados:</strong> {{totalDocumentos}}</p>
                        <p style="margin: 0;"><strong>Firmantes a notificar:</strong> {{totalFirmantes}}</p>
                        <p style="margin: 0;"><strong>Fecha de creación:</strong> {{fechaCreacion}}</p>
                    </div>
                </div>

                <!-- Próximos pasos -->
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #00A3B4; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.5px;">
                        📝 ¿Cuál es el siguiente paso?
                    </h3>
                    <ol style="color: #334155; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                        <li style="margin-bottom: 10px;"><strong>Los firmantes recibirán un correo</strong> con las instrucciones para revisar y firmar los documentos</li>
                        <li style="margin-bottom: 10px;"><strong>Puedes monitorear el estado</strong> de las firmas accediendo a tu panel de control en la plataforma DocSigned</li>
                        <li>Una vez que <strong>todos hayan firmado</strong>, podrás descargar los documentos firmados</li>
                    </ol>
                </div>

                <!-- Información adicional -->
                <div style="background: #fff8e1; border-left: 4px solid #E3E766; padding: 15px; border-radius: 6px; margin-bottom: 30px;">
                    <p style="color: #7c5c15; font-size: 13px; line-height: 1.6; margin: 0;">
                        <strong>💡 Consejo:</strong> Guarda el número de solicitud (<strong>#{{solicitudId}}</strong>) para referencia futura y seguimiento del estado de las firmas.
                    </p>
                </div>

                <!-- CTA Principal -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <a href="{{urlSolicitudes}}" style="display: inline-block; background: linear-gradient(135deg, #00A3B4 0%, #0088A0 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0, 163, 180, 0.3); border: none; cursor: pointer;">
                        📊 Ver Estado de Solicitudes
                    </a>
                </div>

            </div>

            <!-- Footer -->
            <div style="background: #0f172a; color: #cbd5e1; padding: 25px 30px; border-radius: 0 0 20px 20px; font-size: 13px; text-align: center; line-height: 1.6;">
                <p style="margin-bottom: 15px;">
                    <strong style="color: #E3E766;">DocSigned</strong> • Sistema de Firma Digital Segura
                </p>
                <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                    Este es un correo automático. Por favor no respondas directamente a este mensaje.<br>
                    Si tienes dudas, contacta al administrador del sistema.
                </p>
            </div>
        </div>
    </body>
    </html>
`;

// ✅ Eliminado: No ejecutar sendMail automáticamente al cargar el módulo

/**
 * Función para enviar correos de notificación
 * @param {Object} data - Datos del correo
 * @param {String} data.to - Email del destinatario
 * @param {String} data.subject - Asunto del correo
 * @param {String} data.text - Texto plano del correo
 * @param {String} data.type - Tipo de correo: 'signer' (para firmantes) o 'requester' (para solicitante)
 * @param {Object} data.variables - Variables para reemplazar en la plantilla (ej: {{solicitudId}}, {{totalFirmantes}}, etc)
 * @returns {Promise}
 */
const sendMail = (data) => {
    return new Promise((resolve, reject) => {
        // Validar que el email sea válido
        if (!data.to || typeof data.to !== 'string' || !data.to.trim()) {
            return reject(new Error('Email del destinatario no válido o vacío'));
        }

        const emailLimpio = data.to.trim().toLowerCase();
        
        // Determinar qué plantilla usar según el tipo de correo
        let htmlTemplate = htmlContentForSigners; // por defecto, para firmantes
        let subject = 'DocSigned: Solicitud de Firma Digital';
        let textPlain = 'Has sido incluido como firmante en una nueva solicitud de firma digital.';

        if (data.type === 'requester') {
            htmlTemplate = htmlContentForRequester;
            subject = 'DocSigned: Solicitud de Firma Creada Exitosamente';
            textPlain = 'Tu solicitud de firma masiva ha sido registrada exitosamente en el sistema.';
        }

        // Reemplazar variables en la plantilla HTML
        let htmlContent = htmlTemplate;
        if (data.variables && typeof data.variables === 'object') {
            Object.keys(data.variables).forEach(key => {
                const placeholder = `{{${key}}}`;
                const regex = new RegExp(placeholder, 'g');
                htmlContent = htmlContent.replace(regex, data.variables[key]);
            });
        }

        const mailOptions = {
            from: `${process.env.MAIL_USER}`,
            to: emailLimpio,
            subject: data.subject || subject,
            text: data.text || textPlain,
            html: htmlContent
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(`❌ Error al enviar correo a ${emailLimpio}:`, error.message);
                return reject(error);
            }
            
            console.log(`✅ Correo enviado a ${emailLimpio}:`, info.response);
            resolve(info);
        });
    });
};

module.exports = {
    transporter,
    sendMail
};