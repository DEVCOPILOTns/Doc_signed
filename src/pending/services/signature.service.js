const PDFLib = require('pdf-lib');
const fs = require('fs').promises;
const sharp = require('sharp');
const pdfjsLib = require('pdfjs-dist');

// Agregar al inicio de la clase, después de los requires
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.js');

class SignatureService {
  constructor() {
    // Configuración por defecto simple para dimensiones de firma
    this.defaultSignatureConfig = {
      offsetY: 10,     // Ajuste vertical desde la palabra clave encontrada
      offsetX: -20,     // Ajuste horizontal desde la palabra clave encontrada
      width: 160,       // Ancho de la firma
      height: 55        // Alto de la firma
    };
  }

  // Extraer palabras clave (separadas por | y opcionalmente entre comillas)
  extraerPalabrasClaveDeComillas(texto) {
    if (!texto) return [];
    
    // Separar por | para obtener múltiples palabras clave
    const partes = texto.split('|').map(p => p.trim());
    const palabrasClaves = [];
    
    for (let parte of partes) {
      if (!parte) continue;
      
      // Buscar patrones con comillas: "palabra" o 'palabra'
      const regexComillas = /["']([^"']+)["']/g;
      const matches = [];
      let match;
      
      while ((match = regexComillas.exec(parte)) !== null) {
        matches.push(match[1]);
      }
      
      // Si encontró entre comillas, usar esas
      if (matches.length > 0) {
        palabrasClaves.push(...matches);
      } else {
        // Si no hay comillas, usar la parte tal como está
        palabrasClaves.push(parte);
      }
    }
    
    return palabrasClaves;
  }

  // Normalizar palabra clave: espacios y caracteres especiales → guiones
  normalizarPalabraClave(palabra) {
    if (!palabra) return '';
    return palabra
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')            // Espacios múltiples → 1 guión
        .replace(/\-+/g, '-')            // Guiones múltiples → 1 guión
        .replace(/[\/\\]/g, '-')         // Barras → guiones
        .replace(/[^\w\-]/g, '')         // Otros caracteres especiales → quitar
        .replace(/\-+/g, '-');           // Guiones múltiples finales → 1 guión
  }

  async detectSignatureArea(pdfBuffer, documentType = 'default', palabrasClave = null) {
    try {
      console.log('\n📌 ===== INICIANDO DETECCIÓN DE FIRMA =====');
      console.log(`📝 Tipo de documento: "${documentType}"`);
      console.log(`🔑 Palabras clave recibidas: "${palabrasClave}"`);
      
      // Extraer palabras clave de las comillas
      const palabrasClaveArray = this.extraerPalabrasClaveDeComillas(palabrasClave);
      console.log(`🔑 Palabras clave a buscar:`, palabrasClaveArray);
      console.log(`📄 Tamaño del PDF: ${(pdfBuffer.byteLength / 1024).toFixed(2)} KB`);

      // Validar que se recibieron palabras clave
      if (palabrasClaveArray.length === 0) {
        throw new Error('❌ No se proporciono ninguna palabra clave válida (entre comillas)');
      }

      const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();
      console.log(`📖 Total de páginas en PDF: ${totalPages}`);

      const config = this.defaultSignatureConfig;
      let posicionEncontrada = null;
      let pageEncontrada = 0;
      let textoEnPDF = [];

      // Buscar en todas las páginas
      console.log(`\n🔍 Buscando palabras clave en PDF...`);
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const page = pdfDoc.getPage(pageIndex);
        const textItems = await this.getTextPositions(page, pageIndex);

        console.log(`   📖 Página ${pageIndex + 1}: escaneando ${textItems.length} elementos de texto...`);

        for (const item of textItems) {
          // Almacenar primeros textos encontrados para debugging
          if (textoEnPDF.length < 15) {
            textoEnPDF.push(item.str.substring(0, 50));
          }

          // Para cada palabra clave, buscar si está en el texto del PDF
          for (const palabraClave of palabrasClaveArray) {
            // Búsqueda case-insensitive pero respetando espacios
            if (item.str.toLowerCase().includes(palabraClave.toLowerCase())) {
              posicionEncontrada = item;
              pageEncontrada = pageIndex;
              console.log(`\n✅ ¡ENCONTRADO EN PÁGINA ${pageIndex + 1}!`);
              console.log(`   🔑 Palabra clave: "${palabraClave}"`);
              console.log(`   📝 Texto en PDF: "${item.str}"`);
              console.log(`   📍 Posición X: ${item.x.toFixed(2)}, Y: ${item.y.toFixed(2)}`);
              break;
            }
          }
          
          if (posicionEncontrada) break;
        }

        if (posicionEncontrada) break;
      }

      if (!posicionEncontrada) {
        console.error(`\n❌ ❌ ❌ ERROR CRÍTICO: No se encontraron las palabras clave ❌ ❌ ❌`);
        console.error(`\n📋 DIAGNÓSTICO:`);
        console.error(`   🔍 Se buscaban: ${palabrasClaveArray.map(p => `"${p}"`).join(', ')}`);
        console.error(`   📄 Páginas escaneadas: ${totalPages}`);
        console.error(`   📝 Primeros textos en el PDF:`);
        textoEnPDF.forEach((texto, idx) => {
          console.error(`      ${idx + 1}. "${texto}"`);
        });
        console.error(`\n💡 ACCIONES A TOMAR:`);
        console.error(`   1. Verificar que las palabras clave en la BD sean EXACTAS`);
        console.error(`   2. Verificar que el documento contiene exactamente esas palabras`);
        console.error(`   3. Revisar mayúsculas/minúsculas`);
        console.error(`   4. Revisar espacios en blanco`);
        
        throw new Error(`NO SE ENCONTRARON LAS PALABRAS CLAVE EN EL PDF. Buscadas: [${palabrasClaveArray.join(', ')}]. Revise los logs anteriores para ver qué texto contiene el documento.`);
      }

      // Calcular posición final de la firma
      const signatureX = posicionEncontrada.x + config.offsetX;
      const signatureY = posicionEncontrada.y + config.offsetY;

      console.log(`\n📍 Posición final de firma:`);
      console.log(`   X: ${signatureX.toFixed(2)} (original: ${posicionEncontrada.x.toFixed(2)} + offset: ${config.offsetX})`);
      console.log(`   Y: ${signatureY.toFixed(2)} (original: ${posicionEncontrada.y.toFixed(2)} + offset: ${config.offsetY})`);
      console.log(`   Ancho: ${config.width}, Alto: ${config.height}`);
      console.log('===== FIN DETECCIÓN =====\n');

      return {
        pageIndex: pageEncontrada,
        x: signatureX,
        y: signatureY,
        width: config.width,
        height: config.height
      };

    } catch (error) {
      console.error('❌ Error detectando área de firma:', error.message);
      throw error;
    }
  }

  async getTextPositions(page, pageIndex = 0) {
    try {
        // Validar que pageIndex sea un número
        if (typeof pageIndex !== 'number' || pageIndex < 0) {
            console.warn('⚠️ pageIndex no válido:', pageIndex, '- usando 0');
            pageIndex = 0;
        }
        
        const pageBuffer = await page.doc.save();
        const pdf = await pdfjsLib.getDocument({data: pageBuffer}).promise;
        // pdf.js usa índices basados en 1, PDFLib usa índices basados en 0
        const pdfPage = await pdf.getPage(pageIndex + 1);
        const textContent = await pdfPage.getTextContent();
        
        const elementos = textContent.items.length;
        if (elementos === 0) {
            console.warn(`   ⚠️ ADVERTENCIA: Página ${pageIndex + 1} sin elementos de texto detectados`);
        } else {
            console.log(`   ✓ Página ${pageIndex + 1}: ${elementos} elementos de texto`);
        }
        
        // Retornar los elementos de texto con sus posiciones
        return textContent.items
            .map(item => ({
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width || 0,
                height: item.height || 0
            }))
            .sort((a, b) => b.y - a.y);
    } catch (error) {
        console.error(`   ❌ Error obteniendo posiciones de texto en página ${pageIndex + 1}: ${error.message}`);
        console.error(`      Esto puede ocurrir si: el PDF está cifrado, dañado, o no contiene texto seleccionable`);
        return [];
    }
  }

  getDefaultPosition(pageWidth, pageHeight) {
    return {
      pageIndex: 0,
      x: (pageWidth - 120) / 2,
      y: pageHeight / 3,
      width: 120,
      height: 35
    };
  }

  async extractPageText(page) {
    try {
      // Convertir la página a ArrayBuffer
      const pageBuffer = await page.doc.save();
      
      // Cargar el documento con pdf.js
      const pdf = await pdfjsLib.getDocument({data: pageBuffer}).promise;
      const pdfPage = await pdf.getPage(page.getIndex() + 1);
      
      // Extraer el contenido de texto
      const textContent = await pdfPage.getTextContent();
      
      // Unir todos los elementos de texto
      const text = textContent.items
        .map(item => item.str)
        .join('\n');

      return text;
    } catch (error) {
      console.error('Error extrayendo texto:', error);
      return '';
    }
  }

  async insertSignature(pdfBuffer, signatureBuffer, coords) {
    try {
      // Validar que coords tiene un pageIndex válido
      if (!coords || typeof coords.pageIndex !== 'number') {
        console.warn('⚠️ pageIndex no válido, usando página 0');
        coords = {
          ...coords,
          pageIndex: 0
        };
      }
      
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
      const page = pdfDoc.getPage(coords.pageIndex);

      // Procesar la firma para mejor calidad y transparencia
      const processedSignature = await sharp(signatureBuffer)
        .resize(coords.width, coords.height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .sharpen()
        .gamma(1.1)
        .png()
        .toBuffer();

      const signature = await pdfDoc.embedPng(processedSignature);

      // Dibujar la imagen de la firma
      page.drawImage(signature, {
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height
      });

      // Agregar fecha y hora debajo de la firma
      const now = new Date();
      const fechaFormato = now.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const horaFormato = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const textoFecha = `${fechaFormato} ${horaFormato}`;

      console.log(`⏰ Agregando fecha/hora de firma: ${textoFecha}`);

      // Posicionar el texto a la derecha de la firma
      const textX = coords.x + coords.width ; //  puntos a la derecha de la firma
      const textY = coords.y + (coords.height / 2) - 5; // Centrado verticalmente con la firma
      const fontSize = 7;

      // Dibujar el texto con la fecha y hora
      page.drawText(textoFecha, {
        x: textX,
        y: textY,
        size: fontSize,
        color: PDFLib.rgb(0, 0, 0) // Negro
      });

      return await pdfDoc.save();

    } catch (error) {
      console.error('❌ Error insertando firma:', error);
      throw error;
    }
  }
}

module.exports = new SignatureService();
