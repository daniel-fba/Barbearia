import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment/dist/locale/pt-br";
import "react-big-calendar/lib/css/react-big-calendar.css";

moment.locale("pt-br");
const localizer = momentLocalizer(moment);

const messages = {
  allDay: "Dia Inteiro",
  previous: "Anterior",
  next: "Próximo",
  today: "Hoje",
  month: "Mês",
  week: "Semana",
  day: "Dia",
  agenda: "Agenda",
  date: "Data",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "Não há eventos neste período.",
  showMore: (total) => `+ ver mais (${total})`,
};

export function MyCalendar({
  appointments,
  date,
  onNavigate,
  view,
  onView,
  onSelectSlot,
  eventPropGetter,
  components,
}) {
  return (
    <div>
      <Calendar
        localizer={localizer}
        events={appointments}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500, width: 600 }}
        selectable={"ignoreEvents"}
        onSelectSlot={onSelectSlot}
        messages={messages}
        date={date}
        onNavigate={onNavigate}
        view={view}
        onView={onView}
        views={["month", "day"]}
        eventPropGetter={eventPropGetter}
        components={components}
        min={new Date(1970, 1, 1, 8, 0, 0)}
        max={new Date(1970, 1, 1, 20, 0, 0)}
        step={30}
        timeslots={2}
        longPressThreshold={0}
      />
    </div>
  );
}
