import { useState, useEffect, useRef } from "react";
import "../styles/App.css";
import { MyCalendar } from "./Picker.jsx";
import { Carousel } from "./Carousel.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function App() {
  const [selectedTime, setSelectedTime] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    service: "",
  });

  const galleryRef = useRef(null);
  const pricesRef = useRef(null);
  const scheduleRef = useRef(null);

  useEffect(() => {
    loadAppointments();
    loadServices();
  }, []);

  const loadAppointments = async () => {
    try {
      const response = await fetch(`${API_URL}/agendamentos`);
      if (!response.ok) throw new Error("Erro ao carregar agendamentos");

      const data = await response.json();
      const formattedAppointments = data.map((apt) => ({
        start: new Date(apt.start),
        end: new Date(apt.end),
        title: "Reservado",
      }));
      setAppointments(formattedAppointments);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
    }
  };

  const loadServices = async () => {
    try {
      const response = await fetch(`${API_URL}/servicos`);
      if (!response.ok) throw new Error("Erro ao carregar serviços");

      const data = await response.json();
      setServices(data);
      if (data.length > 0) {
        setFormData((prev) => ({ ...prev, service: data[0].name }));
      }
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
    }
  };

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectSlot = (slotInfo) => {
    if (view === "month") {
      setCalendarDate(slotInfo.start);
      setView("day");
    } else {
      // Verifica se o horário é no passado
      const now = new Date();
      if (slotInfo.start < now) {
        alert("Não é possível agendar em horários passados.");
        return;
      }

      setSelectedTime(slotInfo.start);
      setShowForm(true);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    // Formatação do telefone
    if (name === "clientPhone") {
      const cleaned = value.replace(/\D/g, "");
      setFormData({ ...formData, [name]: cleaned });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleRequestAppointment = async (e) => {
    e.preventDefault();

    if (!selectedTime) {
      alert("Selecione um horário.");
      return;
    }

    // Validação do telefone
    if (formData.clientPhone.length < 10 || formData.clientPhone.length > 11) {
      alert("Digite um telefone válido com DDD (10 ou 11 dígitos).");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/solicitacoes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          time: selectedTime.toISOString(),
          clientName: formData.clientName,
          clientPhone: formData.clientPhone,
          service: formData.service,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        setSelectedTime(null);
        setShowForm(false);
        setFormData({
          clientName: "",
          clientPhone: "",
          service: services[0]?.name || "",
        });
        // Recarregar agendamentos
        loadAppointments();
      } else {
        alert(data.error || "Falha ao solicitar agendamento.");
      }
    } catch (error) {
      console.error("Erro ao solicitar agendamento:", error);
      alert("Erro ao conectar com o servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (newDate) => {
    setCalendarDate(newDate);
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };

  const eventPropGetter = () => {
    return {
      style: {
        backgroundColor: "#3174ad",
        borderRadius: "5px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  const EventComponent = ({ event }) => {
    return <span>{view === "day" ? event.title : ""}</span>;
  };

  return (
    <>
      <header>
        <h1>💈 Barbearia Imagava</h1>
        <nav>
          <button onClick={() => scrollToSection(galleryRef)}>Galeria</button>
          <button onClick={() => scrollToSection(pricesRef)}>Preços</button>
          <button onClick={() => scrollToSection(scheduleRef)}>Agende</button>
        </nav>
      </header>

      <main className="main-vertical">
        {/* Seção de Galeria */}
        <section ref={galleryRef} className="section gallery-section">
          <h2>🎨 Nossos Trabalhos</h2>
          <Carousel />
        </section>

        {/* Seção de Preços */}
        <section ref={pricesRef} className="section prices-section">
          <h2>💰 Serviços</h2>
          <div className="services-grid">
            {services.length === 0 ? (
              <div className="loading">
                <p>Carregando serviços...</p>
              </div>
            ) : (
              services.map((service) => (
                <div key={service.id} className="service-card">
                  <div className="service-icon">✂️</div>
                  <h3>{service.name}</h3>
                  {service.description && (
                    <p className="service-description">{service.description}</p>
                  )}
                  <div className="service-info">
                    <span className="service-price">
                      R$ {service.price.toFixed(2)}
                    </span>
                    <span className="service-duration">
                      ⏱️ {service.duration} min
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Seção de Agendamento */}
        <section ref={scheduleRef} className="section schedule-section">
          <h2>📅 Agende seu Horário</h2>
          <p className="schedule-instructions">
            Clique em um dia para ver os horários disponíveis, depois clique no
            horário desejado.
          </p>
          <div className="calendar-container">
            <MyCalendar
              appointments={appointments}
              date={calendarDate}
              onNavigate={handleNavigate}
              view={view}
              onView={handleViewChange}
              onSelectSlot={handleSelectSlot}
              eventPropGetter={eventPropGetter}
              components={{
                event: EventComponent,
              }}
            />
          </div>

          {showForm && selectedTime && (
            <div className="appointment-form-overlay">
              <div className="appointment-form">
                <h3>Solicitar Agendamento</h3>
                <p className="selected-time">
                  📅{" "}
                  {selectedTime.toLocaleString("pt-BR", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </p>
                <form onSubmit={handleRequestAppointment}>
                  <div className="form-group">
                    <label htmlFor="clientName">Nome Completo:</label>
                    <input
                      type="text"
                      id="clientName"
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleFormChange}
                      required
                      placeholder="Seu nome completo"
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="clientPhone">Telefone (com DDD):</label>
                    <input
                      type="tel"
                      id="clientPhone"
                      name="clientPhone"
                      value={formData.clientPhone}
                      onChange={handleFormChange}
                      placeholder="27999999999"
                      maxLength="11"
                      required
                      disabled={loading}
                    />
                    <small>Apenas números (10 ou 11 dígitos)</small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="service">Serviço:</label>
                    <select
                      id="service"
                      name="service"
                      value={formData.service}
                      onChange={handleFormChange}
                      required
                      disabled={loading}
                    >
                      {services.map((service) => (
                        <option key={service.id} value={service.name}>
                          {service.name} - R$ {service.price.toFixed(2)} (
                          {service.duration} min)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-buttons">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={loading}
                    >
                      {loading ? "⏳ Enviando..." : "✅ Solicitar Agendamento"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowForm(false);
                        setSelectedTime(null);
                      }}
                      disabled={loading}
                    >
                      ❌ Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default App;
