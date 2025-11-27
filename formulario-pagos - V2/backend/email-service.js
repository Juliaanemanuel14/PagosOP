// =====================================================
// SERVICIO DE EMAIL CON RESEND
// Optimizado para Google Cloud Run (sin bloqueo de puertos SMTP)
// =====================================================

const { Resend } = require('resend');

// Inicializar Resend con API Key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envía notificación de pago registrado
 * @param {Object} pagoData - Datos del pago
 * @param {number} pagoData.pagoId - ID del pago
 * @param {string} pagoData.local - Nombre del local
 * @param {string} pagoData.fecha - Fecha del pago
 * @param {string} pagoData.usuario - Usuario que registró
 * @param {Array} pagoData.items - Items del pago
 * @param {number} pagoData.totalImporte - Total del pago
 * @returns {Promise<Object>} Resultado del envío
 */
async function enviarNotificacionPago(pagoData) {
  const { pagoId, local, fecha, usuario, items, totalImporte } = pagoData;

  // Generar tabla HTML de items
  let itemsTableHTML = '';
  items.forEach((item, index) => {
    const bgColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';
    itemsTableHTML += `
      <tr style="background-color: ${bgColor};">
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${item.concepto}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb; color: #10b981; font-weight: 600; text-align: right;">$${parseFloat(item.importe).toFixed(2)}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${item.observacion || '-'}</td>
      </tr>
    `;
  });

  const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">
        Nueva Solicitud de Gastos
      </h2>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background-color: #f9fafb;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; width: 150px;">ID:</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">#${pagoId}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Local:</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${local}</td>
        </tr>
        <tr style="background-color: #f9fafb;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Fecha:</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${fecha}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Registrado por:</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; color: #4f46e5; font-weight: bold;">${usuario}</td>
        </tr>
      </table>

      <h3 style="color: #4f46e5; margin-top: 30px; margin-bottom: 15px;">Items del Gasto</h3>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #4f46e5; color: white;">
            <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">Concepto</th>
            <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">Importe</th>
            <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">Observación</th>
          </tr>
        </thead>
        <tbody>
          ${itemsTableHTML}
        </tbody>
        <tfoot>
          <tr style="background-color: #f3f4f6; font-weight: bold;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;">TOTAL</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #10b981; font-size: 18px; text-align: right;">$${totalImporte.toFixed(2)}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"></td>
          </tr>
        </tfoot>
      </table>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        <em>Registro generado automáticamente el ${new Date().toLocaleString('es-ES')}</em>
      </p>
    </div>
  `;

  try {
    // Preparar destinatarios
    const recipients = [process.env.EMAIL_TO];
    if (process.env.EMAIL_TO_CC) {
      recipients.push(process.env.EMAIL_TO_CC);
    }

    // Enviar email con Resend
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: recipients,
      subject: `Nueva Solicitud de Gastos - ${local}`,
      html: emailHTML,
    });

    console.log('✅ Email enviado exitosamente:', data.id);
    return {
      success: true,
      messageId: data.id
    };

  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Envía email de forma asíncrona sin bloquear
 * @param {Object} pagoData - Datos del pago
 */
function enviarEmailAsync(pagoData) {
  // Ejecutar en background sin bloquear
  setImmediate(async () => {
    try {
      await enviarNotificacionPago(pagoData);
    } catch (error) {
      console.error('Error en envío asíncrono de email:', error);
    }
  });
}

module.exports = {
  enviarNotificacionPago,
  enviarEmailAsync
};
