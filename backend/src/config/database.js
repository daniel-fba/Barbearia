const mongoose = require("mongoose");
require("dotenv").config();

// Schemas do Mongoose
const appointmentSchema = new mongoose.Schema({
  start: { type: Date, required: true, index: true },
  end: { type: Date, required: true },
  client_name: { type: String },
  client_phone: { type: String },
  service: { type: String },
  status: { type: String, default: "confirmed", index: true },
});

const requestSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  client_name: { type: String, required: true },
  client_phone: { type: String, required: true },
  service: { type: String, required: true },
  status: { type: String, default: "pending", index: true },
  created_at: { type: Date, default: Date.now, index: true },
});

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, default: "" },
  duration: { type: Number, default: 60 },
  active: { type: Boolean, default: true, index: true },
  created_at: { type: Date, default: Date.now },
});

// Models
const Appointment = mongoose.model("Appointment", appointmentSchema);
const Request = mongoose.model("Request", requestSchema);
const Service = mongoose.model("Service", serviceSchema);

class Database {
  constructor() {
    const mongoUri =
      process.env.MONGODB_URI ||
      `mongodb://${process.env.DB_HOST || "localhost"}:${
        process.env.DB_PORT || 27017
      }/${process.env.DB_NAME || "barbearia"}`;

    mongoose
      .connect(mongoUri)
      .then(() => {
        console.log("Conectado ao banco de dados MongoDB.");
        console.log(`Database: ${process.env.DB_NAME || "barbearia"}`);
        this.insertDefaultServices();
      })
      .catch((err) => {
        console.error(
          "ERRO AO CONECTAR AO BANCO DE DADOS MongoDB:",
          err.message
        );
        console.error("URI:", mongoUri.replace(/\/\/.*@/, "//***:***@")); // Oculta credenciais
        process.exit(1);
      });

    this.Appointment = Appointment;
    this.Request = Request;
    this.Service = Service;
  }

  async insertDefaultServices() {
    try {
      const count = await this.Service.countDocuments();

      if (count === 0) {
        const defaultServices = [
          {
            name: "Corte",
            price: 40.0,
            description: "Corte de cabelo",
            duration: 30,
          },
          {
            name: "Barba",
            price: 30.0,
            description: "Barba completa",
            duration: 30,
          },
          {
            name: "Corte + Barba",
            price: 60.0,
            description: "Combo completo",
            duration: 60,
          },
          {
            name: "Sobrancelha",
            price: 15.0,
            description: "Design de sobrancelha",
            duration: 15,
          },
        ];

        await this.Service.insertMany(defaultServices);
        console.log("Serviços padrão inseridos.");
      } else {
        console.log("Serviços padrão já existem, ignorando inserção.");
      }
    } catch (err) {
      console.error("Erro ao inserir serviços padrão:", err.message);
    }
  }

  // Agendamentos
  getAllAppointments(callback) {
    this.Appointment.find({ status: "confirmed" })
      .sort({ start: 1 })
      .then((results) => {
        // Converter _id para id para compatibilidade
        const mapped = results.map((doc) => ({
          id: doc._id.toString(),
          start: doc.start,
          end: doc.end,
          client_name: doc.client_name,
          client_phone: doc.client_phone,
          service: doc.service,
          status: doc.status,
        }));
        callback(null, mapped);
      })
      .catch((err) => callback(err, null));
  }

  createAppointment(data, callback) {
    const appointment = new this.Appointment({
      start: data.start,
      end: data.end,
      client_name: data.client_name,
      client_phone: data.client_phone,
      service: data.service,
      status: "confirmed",
    });

    appointment
      .save()
      .then((doc) => {
        callback.call({ lastID: doc._id.toString() }, null);
      })
      .catch((err) => {
        callback.call({ lastID: null }, err);
      });
  }

  // Solicitações de Agendamento
  getAllPendingRequests(callback) {
    this.Request.find({ status: "pending" })
      .sort({ created_at: -1 })
      .then((results) => {
        const mapped = results.map((doc) => ({
          id: doc._id.toString(),
          start: doc.start,
          end: doc.end,
          client_name: doc.client_name,
          client_phone: doc.client_phone,
          service: doc.service,
          status: doc.status,
          created_at: doc.created_at,
        }));
        callback(null, mapped);
      })
      .catch((err) => callback(err, null));
  }

  createRequest(data, callback) {
    const request = new this.Request({
      start: data.start,
      end: data.end,
      client_name: data.client_name,
      client_phone: data.client_phone,
      service: data.service,
    });

    request
      .save()
      .then((doc) => {
        callback.call({ lastID: doc._id.toString() }, null);
      })
      .catch((err) => {
        callback.call({ lastID: null }, err);
      });
  }

  getRequestById(id, callback) {
    // Validar se o ID é um ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return callback(null, null);
    }

    this.Request.findOne({ _id: id, status: "pending" })
      .then((doc) => {
        if (doc) {
          const mapped = {
            id: doc._id.toString(),
            start: doc.start,
            end: doc.end,
            client_name: doc.client_name,
            client_phone: doc.client_phone,
            service: doc.service,
            status: doc.status,
            created_at: doc.created_at,
          };
          callback(null, mapped);
        } else {
          callback(null, null);
        }
      })
      .catch((err) => callback(err, null));
  }

  approveRequest(id, callback) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return callback(new Error("ID inválido"));
    }

    this.Request.updateOne({ _id: id }, { status: "approved" })
      .then(() => callback(null))
      .catch((err) => callback(err));
  }

  rejectRequest(id, callback) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return callback(new Error("ID inválido"));
    }

    this.Request.updateOne({ _id: id }, { status: "rejected" })
      .then(() => callback(null))
      .catch((err) => callback(err));
  }

  rollbackRequestStatus(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error("ID inválido para rollback:", id);
      return;
    }

    this.Request.updateOne({ _id: id }, { status: "pending" })
      .then(() => {})
      .catch((err) => {
        console.error("Erro ao fazer rollback:", err);
      });
  }

  // Serviços
  getAllActiveServices(callback) {
    this.Service.find({ active: true })
      .sort({ price: 1 })
      .then((results) => {
        const mapped = results.map((doc) => ({
          id: doc._id.toString(),
          name: doc.name,
          price: doc.price,
          description: doc.description,
          duration: doc.duration,
          active: doc.active,
          created_at: doc.created_at,
        }));
        callback(null, mapped);
      })
      .catch((err) => callback(err, null));
  }

  getAllServices(callback) {
    this.Service.find()
      .sort({ created_at: -1 })
      .then((results) => {
        const mapped = results.map((doc) => ({
          id: doc._id.toString(),
          name: doc.name,
          price: doc.price,
          description: doc.description,
          duration: doc.duration,
          active: doc.active,
          created_at: doc.created_at,
        }));
        callback(null, mapped);
      })
      .catch((err) => callback(err, null));
  }

  createService(data, callback) {
    const service = new this.Service({
      name: data.name,
      price: data.price,
      description: data.description || "",
      duration: data.duration || 60,
    });

    service
      .save()
      .then((doc) => {
        callback.call({ lastID: doc._id.toString() }, null);
      })
      .catch((err) => {
        callback.call({ lastID: null }, err);
      });
  }

  updateService(id, data, callback) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return callback.call({ changes: 0 }, new Error("ID inválido"));
    }

    this.Service.updateOne(
      { _id: id },
      {
        name: data.name,
        price: data.price,
        description: data.description,
        duration: data.duration,
        active: data.active,
      }
    )
      .then((result) => {
        callback.call({ changes: result.modifiedCount }, null);
      })
      .catch((err) => {
        callback.call({ changes: 0 }, err);
      });
  }

  deleteService(id, callback) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return callback.call({ changes: 0 }, new Error("ID inválido"));
    }

    this.Service.deleteOne({ _id: id })
      .then((result) => {
        callback.call({ changes: result.deletedCount }, null);
      })
      .catch((err) => {
        callback.call({ changes: 0 }, err);
      });
  }

  close(callback) {
    mongoose.connection
      .close()
      .then(() => callback && callback())
      .catch((err) => callback && callback(err));
  }
}

module.exports = Database;
