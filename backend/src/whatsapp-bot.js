const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");

class WhatsAppBot {
  constructor() {
    this.whatsappReady = false;
    this.currentQR = null;
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "barbershop-bot",
        dataPath: this.SESSION_PATH,
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      },
    });

    this.setupEvents();
  }

  setupEvents() {
    this.client.on("qr", (qr) => {
      console.log("QR Code recebido, escaneie com seu WhatsApp:");
      qrcode.generate(qr, { small: true });

      const qrcodeLib = require("qrcode");
      qrcodeLib.toDataURL(qr, (err, url) => {
        if (!err) {
          this.currentQR = url;
        }
      });
    });

    this.client.on("authenticated", () => {
      console.log("Autenticado com sucesso!");
    });

    this.client.on("ready", () => {
      console.log("WhatsApp Bot está pronto!");
      this.whatsappReady = true;
      this.currentQR = null;
    });

    this.client.on("disconnected", (reason) => {
      console.log("WhatsApp desconectado! Razão:", reason);
      this.whatsappReady = false;
    });

    this.client.on("auth_failure", (msg) => {
      console.error("Falha na autenticação:", msg);
    });
  }

  async initialize() {
    console.log("Inicializando WhatsApp Client...");
    await this.client.initialize();
  }

  formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, "");
    const withCountryCode = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
    return `${withCountryCode}@c.us`;
  }

  async sendMessage(phone, message) {
    if (!this.whatsappReady) {
      console.log("WhatsApp não está pronto. Mensagem não enviada.");
      return false;
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      console.log(`Tentando enviar mensagem para: ${formattedPhone}`);

      const numberExists = await this.client.isRegisteredUser(formattedPhone);
      if (!numberExists) {
        console.error(
          `Número ${formattedPhone} não está registrado no WhatsApp`
        );
        return false;
      }

      await this.client.sendMessage(formattedPhone, message);
      console.log(`Mensagem enviada com sucesso para ${formattedPhone}`);
      return true;
    } catch (error) {
      console.error(`Erro ao enviar mensagem:`, error.message);
      return false;
    }
  }

  async sendGroupMessage(groupId, message) {
    if (!this.whatsappReady) {
      console.log("WhatsApp não está pronto. Mensagem não enviada.");
      return false;
    }

    try {
      console.log(`Tentando enviar mensagem para grupo: ${groupId}`);
      const chat = await this.client.getChatById(groupId);
      await chat.sendMessage(message);
      console.log(`Mensagem enviada com sucesso para o grupo`);
      return true;
    } catch (error) {
      console.error(`Erro ao enviar mensagem para grupo:`, error.message);
      return false;
    }
  }

  async getStatus() {
    let phoneNumber = null;

    if (this.whatsappReady) {
      try {
        const info = await this.client.info;
        phoneNumber = info?.wid?.user || null;
      } catch (error) {
        console.error("Erro ao obter info:", error);
      }
    }

    return {
      ready: this.whatsappReady,
      qr: this.currentQR,
      phoneNumber: phoneNumber,
    };
  }

  async disconnect() {
    await this.client.destroy();
    this.whatsappReady = false;
    this.currentQR = null;
    console.log("Bot desconectado");
  }

  deleteSession() {
    try {
      if (fs.existsSync(this.SESSION_PATH)) {
        fs.rmSync(this.SESSION_PATH, { recursive: true, force: true });
        console.log("Sessão antiga deletada");
        return true;
      }
      return true;
    } catch (error) {
      console.error("Erro ao deletar sessão:", error);
      return false;
    }
  }

  async createNewBot() {
    console.log("Removendo bot anterior...");

    if (this.whatsappReady) {
      await this.disconnect();
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const deleted = this.deleteSession();
    if (!deleted) {
      throw new Error("Erro ao deletar sessão antiga");
    }

    console.log("Criando novo cliente WhatsApp...");
    this.initializeClient();
    await this.initialize();
    console.log("Novo bot criado! Aguarde o QR Code...");
  }

  async reconnect() {
    this.currentQR = null;
    await this.initialize();
  }
}

module.exports = WhatsAppBot;
