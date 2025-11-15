import { useState, useEffect } from "react";
import "../styles/Admin.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function Admin() {
  const [requests, setRequests] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [botStatus, setBotStatus] = useState({ ready: false, qr: null });
  const [showBotManager, setShowBotManager] = useState(false);
  const [services, setServices] = useState([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    price: "",
    description: "",
    duration: "60",
  });

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

  useEffect(() => {
    if (isAuthenticated) {
      loadRequests();
      loadBotStatus();
      loadServices();
      const interval = setInterval(() => {
        loadRequests();
        loadBotStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const loadRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/solicitacoes`);
      if (!response.ok) throw new Error("Erro ao carregar solicitações");
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
    }
  };

  const loadBotStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/whatsapp/status`);
      if (!response.ok) throw new Error("Erro ao carregar status do bot");
      const data = await response.json();
      setBotStatus(data);
    } catch (error) {
      console.error("Erro ao carregar status:", error);
    }
  };

  const loadServices = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/servicos`);
      if (!response.ok) throw new Error("Erro ao carregar serviços");
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("Senha incorreta!");
    }
  };

  const handleApprove = async (requestId) => {
    if (!confirm("Aprovar este agendamento?")) return;

    try {
      const request = requests.find((r) => r.id === requestId);
      if (!request) {
        alert("Solicitação não encontrada!");
        return;
      }

      // Aprova a solicitação usando a API de aprovação rápida
      const token = btoa(`${requestId}-${import.meta.env.VITE_SECRET_KEY}`);

      const response = await fetch(`${API_URL}/aprovar/${requestId}/${token}`, {
        method: "GET",
      });

      if (response.ok) {
        alert("Agendamento aprovado com sucesso!");
        loadRequests();
      } else {
        const text = await response.text();
        console.error("Erro na resposta:", text);
        alert("Erro ao aprovar agendamento. Verifique o console.");
      }
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      alert("Erro ao aprovar agendamento: " + error.message);
    }
  };

  const handleReject = async (requestId) => {
    if (!confirm("Rejeitar este agendamento?")) return;

    try {
      const request = requests.find((r) => r.id === requestId);
      if (!request) {
        alert("Solicitação não encontrada!");
        return;
      }

      // Rejeita a solicitação usando a API de rejeição rápida
      const token = btoa(`${requestId}-${import.meta.env.VITE_SECRET_KEY}`);

      const response = await fetch(
        `${API_URL}/rejeitar/${requestId}/${token}`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        alert("Agendamento rejeitado com sucesso!");
        loadRequests();
      } else {
        const text = await response.text();
        console.error("Erro na resposta:", text);
        alert("Erro ao rejeitar agendamento. Verifique o console.");
      }
    } catch (error) {
      console.error("Erro ao rejeitar:", error);
      alert("Erro ao rejeitar agendamento: " + error.message);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Desconectar o bot do WhatsApp?")) return;

    try {
      const response = await fetch(`${API_URL}/whatsapp/disconnect`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        alert("Bot desconectado!");
        loadBotStatus();
      }
    } catch (error) {
      console.error("Erro ao desconectar:", error);
      alert("Erro ao desconectar bot");
    }
  };

  const handleNewBot = async () => {
    if (!confirm("Criar uma nova sessão? A sessão atual será removida."))
      return;

    try {
      const response = await fetch(`${API_URL}/whatsapp/new-bot`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        loadBotStatus();
      }
    } catch (error) {
      console.error("Erro ao criar novo bot:", error);
      alert("Erro ao criar novo bot");
    }
  };

  const handleReconnect = async () => {
    try {
      const response = await fetch(`${API_URL}/whatsapp/reconnect`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        loadBotStatus();
      }
    } catch (error) {
      console.error("Erro ao reconectar:", error);
      alert("Erro ao reconectar bot");
    }
  };

  const handleServiceFormChange = (e) => {
    setServiceForm({
      ...serviceForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveService = async (e) => {
    e.preventDefault();

    const url = editingService
      ? `${API_URL}/admin/servicos/${editingService.id}`
      : `${API_URL}/admin/servicos`;

    const method = editingService ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...serviceForm,
          price: parseFloat(serviceForm.price),
          duration: parseInt(serviceForm.duration),
          active: serviceForm.active !== undefined ? serviceForm.active : 1,
        }),
      });

      if (response.ok) {
        alert(editingService ? "Serviço atualizado!" : "Serviço criado!");
        setShowServiceForm(false);
        setEditingService(null);
        setServiceForm({
          name: "",
          price: "",
          description: "",
          duration: "60",
        });
        loadServices();
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao salvar serviço.");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao salvar serviço.");
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      price: service.price.toString(),
      description: service.description || "",
      duration: service.duration.toString(),
      active: service.active,
    });
    setShowServiceForm(true);
  };

  const handleDeleteService = async (id) => {
    if (!confirm("Deletar este serviço?")) return;

    try {
      const response = await fetch(`${API_URL}/admin/servicos/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Serviço deletado!");
        loadServices();
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao deletar serviço.");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao deletar serviço.");
    }
  };

  {
    /* Login */
  }
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🔐 Admin - Login</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              autoFocus
            />
            <button type="submit">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>💈 Painel Administrativo</h1>
        <div className="admin-header-actions">
          <div className="bot-status">
            <span
              className={`status-indicator ${
                botStatus.ready ? "online" : "offline"
              }`}
            >
              {botStatus.ready ? "🟢 Bot Online" : "🔴 Bot Offline"}
            </span>
            {botStatus.phoneNumber && (
              <span className="phone-number">📱 {botStatus.phoneNumber}</span>
            )}
            <button
              className="btn-bot-manager"
              onClick={() => setShowBotManager(!showBotManager)}
            >
              ⚙️ Gerenciar Bot
            </button>
          </div>
        </div>
      </header>

      {showBotManager && (
        <div className="bot-manager">
          <h2>🤖 Gerenciamento do Bot</h2>

          {botStatus.qr && (
            <div className="qr-section">
              <h3>📱 Escaneie o QR Code</h3>
              <img src={botStatus.qr} alt="QR Code" className="qr-code" />
              <p>
                Abra o WhatsApp → Menu → Dispositivos conectados → Conectar
                dispositivo
              </p>
            </div>
          )}

          <div className="bot-actions">
            <button className="btn-action" onClick={handleReconnect}>
              🔄 Reconectar
            </button>
            <button className="btn-action" onClick={handleDisconnect}>
              🔌 Desconectar
            </button>
            <button className="btn-action btn-danger" onClick={handleNewBot}>
              🆕 Nova Sessão
            </button>
          </div>
        </div>
      )}

      {/* Seção de Serviços */}
      <div className="services-management">
        <div className="section-header">
          <h2>💰 Gerenciar Serviços e Preços</h2>
          <button
            className="btn-add-service"
            onClick={() => {
              setShowServiceForm(true);
              setEditingService(null);
              setServiceForm({
                name: "",
                price: "",
                description: "",
                duration: "60",
              });
            }}
          >
            ➕ Novo Serviço
          </button>
        </div>

        {showServiceForm && (
          <div className="service-form-modal">
            <div className="service-form">
              <h3>{editingService ? "Editar Serviço" : "Novo Serviço"}</h3>
              <form onSubmit={handleSaveService}>
                <div className="form-group">
                  <label>Nome do Serviço:</label>
                  <input
                    type="text"
                    name="name"
                    value={serviceForm.name}
                    onChange={handleServiceFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Preço (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    value={serviceForm.price}
                    onChange={handleServiceFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Descrição:</label>
                  <textarea
                    name="description"
                    value={serviceForm.description}
                    onChange={handleServiceFormChange}
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Duração (minutos):</label>
                  <input
                    type="number"
                    name="duration"
                    value={serviceForm.duration}
                    onChange={handleServiceFormChange}
                    required
                  />
                </div>
                {editingService && (
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={serviceForm.active === 1}
                        onChange={(e) =>
                          setServiceForm({
                            ...serviceForm,
                            active: e.target.checked ? 1 : 0,
                          })
                        }
                      />
                      Serviço ativo
                    </label>
                  </div>
                )}
                <div className="form-buttons">
                  <button type="submit" className="btn-save">
                    💾 Salvar
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowServiceForm(false);
                      setEditingService(null);
                    }}
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="services-list">
          {services.map((service) => (
            <div
              key={service.id}
              className={`service-item ${!service.active ? "inactive" : ""}`}
            >
              <div className="service-info">
                <h3>{service.name}</h3>
                <p className="service-description">{service.description}</p>
                <div className="service-details">
                  <span className="price">R$ {service.price.toFixed(2)}</span>
                  <span className="duration">⏱️ {service.duration} min</span>
                  <span
                    className={`status ${
                      service.active ? "active" : "inactive"
                    }`}
                  >
                    {service.active ? "✅ Ativo" : "❌ Inativo"}
                  </span>
                </div>
              </div>
              <div className="service-actions">
                <button
                  className="btn-edit"
                  onClick={() => handleEditService(service)}
                >
                  ✏️ Editar
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteService(service.id)}
                >
                  🗑️ Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seção de Solicitações de Agendamentos */}
      <div className="requests-section">
        <h2>📋 Solicitações Pendentes ({requests.length})</h2>
        {requests.length === 0 ? (
          <p className="no-requests">Nenhuma solicitação pendente</p>
        ) : (
          <div className="requests-list">
            {requests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <span className="request-id">#{request.id}</span>
                  <span className="request-date">
                    {new Date(request.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="request-info">
                  <p>
                    <strong>Cliente:</strong> {request.client_name}
                  </p>
                  <p>
                    <strong>Telefone:</strong> {request.client_phone}
                  </p>
                  <p>
                    <strong>Serviço:</strong> {request.service}
                  </p>
                  <p>
                    <strong>Data/Hora:</strong>{" "}
                    {new Date(request.start).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="request-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(request.id)}
                  >
                    ✅ Aprovar
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(request.id)}
                  >
                    ❌ Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
