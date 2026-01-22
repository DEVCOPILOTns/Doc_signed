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
      offsetY: 40,     // Ajuste vertical desde la palabra clave encontrada
      offsetX: 10,     // Ajuste horizontal desde la palabra clave encontrada
      width: 160,       // Ancho de la firma
      height: 55        // Alto de la firma
    };
  }

  async detectSignatureArea(pdfBuffer, documentType = 'default', palabraClave = null) {
    try {
      console.log('\n📌 ===== INICIANDO DETECCIÓN DE FIRMA =====');
      console.log(`📝 Tipo de documento: "${documentType}"`);
      console.log(`🔑 Palabra clave recibida: "${palabraClave}"`);
      console.log(`📄 Tamaño del PDF: ${(pdfBuffer.byteLength / 1024).toFixed(2)} KB`);

      // Validar que se recibió una palabra clave
      if (!palabraClave) {
        throw new Error('❌ No se proporcionó palabra clave para buscar');
      }

      const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();
      console.log(`📖 Total de páginas en PDF: ${totalPages}`);

      const config = this.defaultSignatureConfig;
      let posicionEncontrada = null;
      let pageEncontrada = 0;

      // Buscar en todas las páginas
      console.log(`\n🔍 Buscando palabra clave: "${palabraClave}"`);
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const page = pdfDoc.getPage(pageIndex);
        const textItems = await this.getTextPositions(page, pageIndex);

        for (const item of textItems) {
          if (item.str.trim().toLowerCase() === palabraClave.toLowerCase()) {
            posicionEncontrada = item;
            pageEncontrada = pageIndex;
            console.log(`✅ ¡ENCONTRADO! en página ${pageIndex + 1}`);
            console.log(`   Texto: "${item.str}"`);
            console.log(`   Posición X: ${item.x.toFixed(2)}, Y: ${item.y.toFixed(2)}`);
            break;
          }
        }

        if (posicionEncontrada) break;
      }

      if (!posicionEncontrada) {
        console.warn(`\n⚠️ No se encontró "${palabraClave}" en ninguna página del PDF`);
        const page = pdfDoc.getPage(0);
        return this.getDefaultPosition(page.getWidth(), page.getHeight());
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
        const pageBuffer = await page.doc.save();
        const pdf = await pdfjsLib.getDocument({data: pageBuffer}).promise;
        // pdf.js usa índices basados en 1, PDFLib usa índices basados en 0
        const pdfPage = await pdf.getPage(pageIndex + 1);
        const textContent = await pdfPage.getTextContent();
        
        console.log(`   📄 Página ${pageIndex + 1}: ${textContent.items.length} elementos de texto`);
        
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
        console.error(`❌ Error obteniendo posiciones de texto en página ${pageIndex + 1}:`, error.message);
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

      page.drawImage(signature, {
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height
      });

      return await pdfDoc.save();

    } catch (error) {
      console.error('❌ Error insertando firma:', error);
      throw error;
    }
  }
}

module.exports = new SignatureService();
