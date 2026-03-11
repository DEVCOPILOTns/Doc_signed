const Tesseract = require('node-tesseract-ocr');
const pdf2pic = require('pdf2pic');
const path = require('path');
const fs = require('fs');

/**
 * Detecta el área de firma buscando palabras clave con fallback automático
 * @param {Buffer} pdfBuffer - contenido del PDF
 * @param {string} palabrasClaveStr - "Firma:|Signature:|Sign here"
 * @returns {Promise<Object>} coordenadas {x, y, width, height} o null
 */
async function detectarAreaFirmaPorPalabrasClaves(pdfBuffer, palabrasClaveStr) {
    let imagePath = null;
    
    try {
        // Parser: dividir por |
        const palabrasClaveArray = palabrasClaveStr
            .split('|')
            .map(p => p.trim())
            .filter(p => p.length > 0);
        
        if (palabrasClaveArray.length === 0) {
            console.log('⚠️ No hay palabras clave definidas');
            return null;
        }
        
        // 1. Convertir PDF a imagen
        imagePath = await convertirPdfAImagen(pdfBuffer);
        console.log('📄 PDF convertido a imagen');
        
        // 2. OCR para extraer texto con coordenadas
        console.log('🔍 Iniciando OCR...');
        const resultado = await Tesseract.recognize(imagePath, {
            lang: 'spa+eng+fra+deu+por+ita+jpn+rus+ara+zho', // Multiidioma
        });
        
        const lines = resultado?.data?.lines || [];
        
        if (!lines || lines.length === 0) {
            console.log('⚠️ OCR no encontró líneas de texto en el documento');
            limpiarTemporal(imagePath);
            return null;
        }
        
        console.log(`📊 OCR encontró ${lines.length} líneas de texto`);
        
        // 3. Buscar palabras clave EN ORDEN
        for (let i = 0; i < palabrasClaveArray.length; i++) {
            const palabraClave = palabrasClaveArray[i];
            console.log(`   🔎 [${i + 1}/${palabrasClaveArray.length}] Buscando: "${palabraClave}"`);
            
            const lineEncontrada = lines.find(line => {
                const textLimpio = line.text.toLowerCase().trim();
                const palabraLimpia = palabraClave.toLowerCase().trim();
                return textLimpio.includes(palabraLimpia);
            });
            
            if (lineEncontrada) {
                console.log(`✅ ¡ENCONTRADA! Palabra clave: "${palabraClave}"`);
                
                // Validar que las coordenadas existen
                if (!lineEncontrada.bbox) {
                    console.log('⚠️ La línea encontrada no tiene coordenadas');
                    continue;
                }
                
                // Calcular área DEBAJO de la palabra encontrada
                const coords = {
                    x: Math.floor(lineEncontrada.bbox.x0 || 0),
                    y: Math.floor((lineEncontrada.bbox.y1 || 0) + 15), // 15px debajo de la palabra
                    width: Math.floor((lineEncontrada.bbox.x1 || 200) - (lineEncontrada.bbox.x0 || 0)),
                    height: 60 // Altura estándar para firma
                };
                
                console.log('📍 Coordenadas detectadas:', {
                    x: coords.x,
                    y: coords.y,
                    width: coords.width,
                    height: coords.height
                });
                
                limpiarTemporal(imagePath);
                return coords;
            }
        }
        
        console.log('⚠️ Ninguna palabra clave encontrada - usando detección visual o default');
        limpiarTemporal(imagePath);
        return null;
        
    } catch (error) {
        console.error('❌ Error en detectarAreaFirmaPorPalabrasClaves:', error.message);
        limpiarTemporal(imagePath);
        return null;
    }
}

/**
 * Convierte PDF a imagen para OCR
 */
async function convertirPdfAImagen(pdfBuffer) {
    const tempDir = './uploads/temp/signature-detection';
    
    // Crear directorio si no existe
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Instanciar convertidor
    const converter = pdf2pic.default({
        density: 150,
        savepath: tempDir,
        format: 'png',
        width: 1024
    });
    
    // Guardar PDF temporalmente
    const tempPdfPath = path.join(tempDir, `temp-${Date.now()}.pdf`);
    fs.writeFileSync(tempPdfPath, Buffer.from(pdfBuffer));
    
    try {
        const result = await converter.convert(tempPdfPath);
        console.log('✅ PDF convertido a imagen');
        
        // Manejar resultado: puede ser string o array (múltiples páginas)
        let imagePath = result.outputFilePath || result;
        
        // Si es array, tomar la primera página
        if (Array.isArray(imagePath)) {
            console.log(`📄 PDF tiene ${imagePath.length} páginas, usando la primera`);
            imagePath = imagePath[0];
        }
        
        // Validar que la ruta existe
        if (!imagePath || !fs.existsSync(imagePath)) {
            throw new Error(`Archivo de imagen no encontrado en: ${imagePath}`);
        }
        
        console.log('🖼️ Ruta de imagen:', imagePath);
        
        // Limpiar PDF temporal
        try {
            fs.unlinkSync(tempPdfPath);
        } catch (e) {
            // ignorar errores de limpieza
        }
        
        return imagePath;
    } catch (error) {
        console.error('Error convirtiendo PDF a imagen:', error);
        // Limpiar en caso de error
        try {
            fs.unlinkSync(tempPdfPath);
        } catch (e) {
            // ignorar
        }
        throw error;
    }
}

/**
 * Limpia archivo temporal
 */
function limpiarTemporal(filePath) {
    if (!filePath) return;
    
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🧹 Archivo temporal eliminado');
        }
    } catch (error) {
        console.warn('⚠️ No se pudo limpiar archivo temporal:', error.message);
    }
}

module.exports = {
    detectarAreaFirmaPorPalabrasClaves
};
