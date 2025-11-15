const express = require("express");
const cors = require("cors");
const WhatsAppBot = require("./whatsapp-bot");
const Database = require("./config/database");
const { generateToken, validateToken, htmlTemplates } = require("./lib/utils");

const app = express();
const port = process.env.PORT || 3001;

const bot = new WhatsAppBot();
const db = new Database();

const NOTIFICATION_GROUP_ID = process.env.NOTIFICATION_GROUP_ID;
app.use(cors());
app.use(express.json());

bot.initialize();

// Endpoints de agendamentos
app.get("/agendamentos", (req, res) => {
  db.getAllAppointments((err, rows) => {
    if (err) {
      console.error("Erro ao buscar agendamentos:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Endpoints de solicitações

app.get("/solicitacoes", (req, res) => {
  db.getAllPendingRequests((err, rows) => {
    if (err) {
      console.error("Erro ao buscar solicitações:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post("/solicitacoes", async (req, res) => {
  try {
    const { time, clientName, clientPhone, service } = req.body;

    if (!time || !clientName || !clientPhone || !service) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios" });
    }

    const start = new Date(time);
    const end = new Date(time);
    end.setHours(end.getHours() + 1);

    db.createRequest(
      {
        start: start.toISOString(),
        end: end.toISOString(),
        client_name: clientName,
        client_phone: clientPhone,
        service: service,
      },
      async function (err) {
        if (err) {
          console.error("Erro ao criar solicitação:", err);
          return res.status(500).json({ error: err.message });
        }

        const requestId = this.lastID;
        const token = generateToken(requestId);

        const approveUrl = `http://${process.env.FRONTEND_URL}/aprovar/${requestId}/${token}`;
        const rejectUrl = `http://${process.env.FRONTEND_URL}/rejeitar/${requestId}/${token}`;

        const message =
          `🔔 *Nova Solicitação de Agendamento*\n\n` +
          `📅 Data/Hora: ${start.toLocaleString("pt-BR")}\n` +
          `👤 Cliente: ${clientName}\n` +
          `📱 Telefone: ${clientPhone}\n` +
          `✂️ Serviço: ${service}\n\n` +
          `ID: #${requestId}\n\n` +
          `\n` +
          `⚡ *APROVAÇÃO RÁPIDA:*\n\n` +
          `✅ Aprovar: ${approveUrl}\n\n` +
          `❌ Rejeitar: ${rejectUrl}\n` +
          `\n` +
          `Ou acesse o painel admin.`;

        try {
          const sent = await bot.sendGroupMessage(
            NOTIFICATION_GROUP_ID,
            message
          );

          if (!sent) {
            console.log("Aviso: Mensagem ao grupo não foi enviada");
          }
        } catch (msgError) {
          console.error("Erro ao enviar mensagem ao grupo:", msgError);
        }

        res.status(201).json({
          id: requestId,
          start: start.toISOString(),
          end: end.toISOString(),
          message:
            "Solicitação criada com sucesso! Aguarde aprovação do barbeiro.",
        });
      }
    );
  } catch (error) {
    console.error("Erro não tratado em /solicitacoes:", error);
    res.status(500).json({ error: "Erro interno ao processar solicitação" });
  }
});

// Aprovação/Rejeição rápida

app.get("/aprovar/:id/:token", async (req, res) => {
  try {
    const { id, token } = req.params;

    console.log(`📋 Tentando aprovar solicitação #${id}`);

    if (!validateToken(id, token)) {
      console.error("Token inválido");
      return res
        .status(403)
        .send(htmlTemplates.error("Token inválido ou expirado"));
    }

    db.getRequestById(id, async (err, request) => {
      if (err) {
        console.error("Erro ao buscar solicitação:", err);
        return res
          .status(500)
          .send(htmlTemplates.error("Erro ao buscar solicitação"));
      }

      if (!request) {
        console.error("Solicitação não encontrada ou já processada");
        return res
          .status(404)
          .send(
            htmlTemplates.error("Solicitação não encontrada ou já processada")
          );
      }

      console.log("Solicitação encontrada:", request);

      // Aprovar solicitação
      db.approveRequest(id, function (updateErr) {
        if (updateErr) {
          console.error("Erro ao aprovar solicitação:", updateErr);
          return res
            .status(500)
            .send(htmlTemplates.error("Erro ao processar solicitação"));
        }

        console.log("Request aprovado");

        // Criar agendamento
        db.createAppointment(request, async function (insertErr) {
          if (insertErr) {
            console.error("Erro ao criar agendamento:", insertErr);
            db.rollbackRequestStatus(id);
            return res
              .status(500)
              .send(htmlTemplates.error("Erro ao criar agendamento"));
          }

          console.log("Agendamento criado com sucesso!");

          const message =
            `✅ *Agendamento Confirmado!*\n\n` +
            `Olá ${request.client_name}!\n\n` +
            `Seu agendamento foi aprovado:\n` +
            `📅 ${new Date(request.start).toLocaleString("pt-BR")}\n` +
            `✂️ ${request.service}\n\n` +
            `Nos vemos em breve! 💈`;

          try {
            const sent = await bot.sendMessage(request.client_phone, message);
            if (sent) {
              console.log("Cliente notificado via WhatsApp");
            } else {
              console.log("Não foi possível enviar mensagem ao cliente");
            }
          } catch (msgError) {
            console.error("Erro ao enviar mensagem:", msgError);
          }

          res.send(htmlTemplates.success(request));
        });
      });
    });
  } catch (error) {
    console.error("Erro não tratado em /aprovar:", error);
    res.status(500).send(htmlTemplates.error("Erro interno do servidor"));
  }
});

app.get("/rejeitar/:id/:token", async (req, res) => {
  try {
    const { id, token } = req.params;

    console.log(`📋 Tentando rejeitar solicitação #${id}`);

    if (!validateToken(id, token)) {
      console.error("Token inválido");
      return res
        .status(403)
        .send(htmlTemplates.error("Token inválido ou expirado"));
    }

    db.getRequestById(id, async (err, request) => {
      if (err) {
        console.error("Erro ao buscar solicitação:", err);
        return res
          .status(500)
          .send(htmlTemplates.error("Erro ao buscar solicitação"));
      }

      if (!request) {
        console.error("Solicitação não encontrada ou já processada");
        return res
          .status(404)
          .send(
            htmlTemplates.error("Solicitação não encontrada ou já processada")
          );
      }

      console.log("Solicitação encontrada:", request);

      db.rejectRequest(id, async function (rejectErr) {
        if (rejectErr) {
          console.error("Erro ao rejeitar solicitação:", rejectErr);
          return res
            .status(500)
            .send(htmlTemplates.error("Erro ao processar solicitação"));
        }

        console.log("Solicitação rejeitada");

        const message =
          `❌ *Agendamento não aprovado*\n\n` +
          `Olá ${request.client_name},\n\n` +
          `Infelizmente não foi possível confirmar seu agendamento para ${new Date(
            request.start
          ).toLocaleString("pt-BR")}.\n\n` +
          `Por favor, escolha outro horário disponível.`;

        try {
          const sent = await bot.sendMessage(request.client_phone, message);
          if (sent) {
            console.log("Cliente notificado via WhatsApp");
          } else {
            console.log("Não foi possível enviar mensagem ao cliente");
          }
        } catch (msgError) {
          console.error("Erro ao enviar mensagem:", msgError);
        }

        res.send(htmlTemplates.rejected(request));
      });
    });
  } catch (error) {
    console.error("Erro não tratado em /rejeitar:", error);
    res.status(500).send(htmlTemplates.error("Erro interno do servidor"));
  }
});

// Endpoints do WhatsApp Bot

app.get("/whatsapp/status", async (req, res) => {
  try {
    const status = await bot.getStatus();
    res.json(status);
  } catch (error) {
    console.error("Erro ao obter status do bot:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao obter status do bot",
      ready: false,
    });
  }
});

app.post("/whatsapp/disconnect", async (req, res) => {
  try {
    await bot.disconnect();
    res.json({ success: true, message: "Bot desconectado" });
  } catch (error) {
    console.error("Erro ao desconectar:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/whatsapp/new-bot", async (req, res) => {
  try {
    await bot.createNewBot();
    res.json({
      success: true,
      message: "Sessão antiga removida. Novo QR Code será gerado em instantes.",
    });
  } catch (error) {
    console.error("Erro ao criar novo bot:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/whatsapp/reconnect", async (req, res) => {
  try {
    await bot.reconnect();
    res.json({ success: true, message: "Reconectando bot..." });
  } catch (error) {
    console.error("Erro ao reconectar:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoints de serviços

app.get("/servicos", (req, res) => {
  db.getAllActiveServices((err, rows) => {
    if (err) {
      console.error("Erro ao buscar serviços:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get("/admin/servicos", (req, res) => {
  db.getAllServices((err, rows) => {
    if (err) {
      console.error("Erro ao buscar serviços:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post("/admin/servicos", (req, res) => {
  const { name, price, description, duration } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: "Nome e preço são obrigatórios" });
  }

  db.createService({ name, price, description, duration }, function (err) {
    if (err) {
      console.error("Erro ao criar serviço:", err);
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({
      id: this.lastID,
      name,
      price,
      description,
      duration,
      active: 1,
    });
  });
});

app.put("/admin/servicos/:id", (req, res) => {
  const { id } = req.params;
  const { name, price, description, duration, active } = req.body;

  db.updateService(
    id,
    { name, price, description, duration, active },
    function (err) {
      if (err) {
        console.error("Erro ao atualizar serviço:", err);
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }

      res.json({ message: "Serviço atualizado com sucesso" });
    }
  );
});

app.delete("/admin/servicos/:id", (req, res) => {
  const { id } = req.params;

  db.deleteService(id, function (err) {
    if (err) {
      console.error("Erro ao deletar serviço:", err);
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    res.json({ message: "Serviço deletado com sucesso" });
  });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

app.listen(port, () => {
  console.log(`Backend rodando na porta ${port}`);
});
