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

const htmlContent = `
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

const mailOptions = {
    from: `${process.env.MAIL_USER}`,
    to: '', // lista de destinatarios
    subject: 'DocSigned: Solicitud de Firma Digital', // Asunto del correo
    text: `DocSigned - Solicitud de Firma Digital\n\nHola,\n\nHas sido incluido como firmante en una nueva solicitud de firma digital.\n\nDetalles:\n- Solicitante: [Nombre del solicitante]\n- Documento: [Nombre del documento]\n\nAccede a la plataforma DocSigned para revisar y firmar el documento.\n\nEste es un correo automático. Por favor no respondas directamente a este mensaje.\nSi tienes dudas, contacta al administrador del sistema.`, // cuerpo del correo en texto plano
    html: htmlContent, // cuerpo del correo en HTML
};

// ✅ Eliminado: No ejecutar sendMail automáticamente al cargar el módulo

/**
 * Función para enviar correos de notificación
 * @param {Object} data - Datos del correo
 * @param {String} data.to - Email del destinatario
 * @param {String} data.subject - Asunto del correo
 * @param {String} data.text - Texto plano del correo
 * @returns {Promise}
 */
const sendMail = (data) => {
    return new Promise((resolve, reject) => {
        // Validar que el email sea válido
        if (!data.to || typeof data.to !== 'string' || !data.to.trim()) {
            return reject(new Error('Email del destinatario no válido o vacío'));
        }

        const emailLimpio = data.to.trim().toLowerCase();

        const mailOptions = {
            from: `${process.env.MAIL_USER}`,
            to: emailLimpio,
            subject: data.subject || 'DocSigned: Solicitud de Firma Digital',
            text: data.text || 'Has sido incluido como firmante en una nueva solicitud de firma digital.',
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