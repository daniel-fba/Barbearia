// Gera token único para cada solicitação
function generateToken(requestId) {
  const secret = process.env.VITE_SECRET_KEY;
  return Buffer.from(`${requestId}-${secret}`).toString("base64");
}

function validateToken(requestId, token) {
  const expectedToken = generateToken(requestId);
  return token === expectedToken;
}

const htmlTemplates = {
  error: (message) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Erro</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          text-align: center; 
          padding: 20px;
          background: linear-gradient(135deg, #8B7355 0%, #6B5345 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .error-container {
          background: #FAF0E6;
          padding: 3rem 2.5rem;
          border-radius: 20px;
          max-width: 550px;
          width: 100%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          border: 3px solid #D2B48C;
          animation: slideIn 0.5s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .error-icon {
          font-size: 80px;
          margin-bottom: 20px;
        }
        .error { 
          color: #A0522D;
          font-size: 1.5rem;
          font-weight: 700;
          padding: 1.5rem;
          background: #E8D7C3;
          border-radius: 15px;
          border: 2px solid #D2B48C;
          box-shadow: 0 3px 10px rgba(139, 111, 71, 0.15);
        }
        .footer {
          color: #5A4A3A;
          font-size: 0.95rem;
          margin-top: 25px;
          font-weight: 500;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <div class="error">${message}</div>
        <p class="footer">Você pode fechar esta página</p>
      </div>
    </body>
    </html>
  `,

  success: (request) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Agendamento Aprovado</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          text-align: center; 
          padding: 20px;
          background: linear-gradient(135deg, #8B7355 0%, #6B5345 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .success { 
          background: #FAF0E6;
          color: #3B5323;
          padding: 3rem 2.5rem;
          border-radius: 20px;
          max-width: 550px;
          width: 100%;
          margin: 0 auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          border: 3px solid #D2B48C;
          animation: slideIn 0.5s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .icon { 
          font-size: 80px; 
          margin-bottom: 20px;
          animation: bounce 0.6s ease-in-out;
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        h1 { 
          color: #6B8E23;
          margin: 20px 0;
          font-size: 2rem;
          font-weight: 700;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
        }
        .details { 
          background: #F5F5DC;
          padding: 1.5rem;
          border-radius: 15px;
          margin: 25px 0;
          color: #4A3C2F;
          border: 2px solid #D2B48C;
          box-shadow: 0 3px 10px rgba(139, 111, 71, 0.15);
        }
        .details p { 
          margin: 12px 0;
          font-size: 1.1rem;
          line-height: 1.6;
        }
        .details strong {
          color: #6B5345;
          font-weight: 700;
        }
        .notification {
          background: #D4E7C5;
          color: #3B5323;
          padding: 1rem;
          border-radius: 10px;
          margin: 20px 0;
          font-weight: 600;
          border: 2px solid #6B8E23;
        }
        .footer {
          color: #5A4A3A;
          font-size: 0.95rem;
          margin-top: 25px;
          font-weight: 500;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="success">
        <div class="icon">✅</div>
        <h1>Agendamento Aprovado!</h1>
        <div class="details">
          <p><strong>Cliente:</strong> ${request.client_name}</p>
          <p><strong>Data/Hora:</strong> ${new Date(
            request.start
          ).toLocaleString("pt-BR")}</p>
          <p><strong>Serviço:</strong> ${request.service}</p>
        </div>
        <div class="notification">✨ Cliente notificado via WhatsApp!</div>
        <p class="footer">Você pode fechar esta página</p>
      </div>
    </body>
    </html>
  `,

  rejected: (request) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Agendamento Rejeitado</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          text-align: center; 
          padding: 20px;
          background: linear-gradient(135deg, #A0826D 0%, #7D6548 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rejected { 
          background: #FAF0E6;
          color: #6B4423;
          padding: 3rem 2.5rem;
          border-radius: 20px;
          max-width: 550px;
          width: 100%;
          margin: 0 auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          border: 3px solid #D2B48C;
          animation: slideIn 0.5s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .icon { 
          font-size: 80px; 
          margin-bottom: 20px;
          animation: shake 0.5s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        h1 { 
          color: #A0522D;
          margin: 20px 0;
          font-size: 2rem;
          font-weight: 700;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
        }
        .details { 
          background: #F5F5DC;
          padding: 1.5rem;
          border-radius: 15px;
          margin: 25px 0;
          color: #4A3C2F;
          border: 2px solid #D2B48C;
          box-shadow: 0 3px 10px rgba(139, 111, 71, 0.15);
        }
        .details p { 
          margin: 12px 0;
          font-size: 1.1rem;
          line-height: 1.6;
        }
        .details strong {
          color: #6B5345;
          font-weight: 700;
        }
        .notification {
          background: #E8D7C3;
          color: #6B4423;
          padding: 1rem;
          border-radius: 10px;
          margin: 20px 0;
          font-weight: 600;
          border: 2px solid #A0522D;
        }
        .footer {
          color: #5A4A3A;
          font-size: 0.95rem;
          margin-top: 25px;
          font-weight: 500;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="rejected">
        <div class="icon">❌</div>
        <h1>Agendamento Rejeitado</h1>
        <div class="details">
          <p><strong>Cliente:</strong> ${request.client_name}</p>
          <p><strong>Data/Hora:</strong> ${new Date(
            request.start
          ).toLocaleString("pt-BR")}</p>
          <p><strong>Serviço:</strong> ${request.service}</p>
        </div>
        <div class="notification">📱 Cliente notificado via WhatsApp</div>
        <p class="footer">Você pode fechar esta página</p>
      </div>
    </body>
    </html>
  `,
};

module.exports = {
  generateToken,
  validateToken,
  htmlTemplates,
};
