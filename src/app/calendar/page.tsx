'use client';

import { useState, useEffect } from 'react';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const EVENT_TYPES = [
  { id: 'easy', label: 'Rodaje suave', color: 'bg-green-500', icon: '🏃' },
  { id: 'tempo', label: 'Tempo', color: 'bg-orange-500', icon: '⚡' },
  { id: 'intervals', label: 'Series', color: 'bg-red-500', icon: '🔥' },
  { id: 'long', label: 'Tirada larga', color: 'bg-blue-500', icon: '🛤️' },
  { id: 'rest', label: 'Descanso', color: 'bg-gray-400', icon: '😴' },
  { id: 'race', label: 'Carrera', color: 'bg-purple-500', icon: '🏆' },
  { id: 'strength', label: 'Fuerza', color: 'bg-yellow-500', icon: '💪' },
];

interface RunningEvent {
  id: string;
  date: string;
  type: string;
  distance: number | null;
  duration: number | null;
  pace: string | null;
  notes: string | null;
  heartRate: number | null;
  feeling: number | null;
  completed: number;
}

export default function CalendarPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<RunningEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<RunningEvent | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    type: 'easy',
    distance: '',
    duration: '',
    pace: '',
    notes: '',
    heartRate: '',
    feeling: 3,
    completed: 0,
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadEvents();
  }, [year, month]);

  const loadEvents = async () => {
    try {
      const res = await fetch(`/api/running-events?year=${year}&month=${month + 1}`);
      const data = await res.json();
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  let startDay = firstDayOfMonth.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const daysInMonth = lastDayOfMonth.getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const isToday = (day: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const getEventsForDay = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const getEventType = (type: string) => EVENT_TYPES.find(t => t.id === type) || EVENT_TYPES[0];

  const openModal = (dateStr: string, event?: RunningEvent) => {
    setSelectedDate(dateStr);
    setSelectedEvent(event || null);
    if (event) {
      setFormData({
        type: event.type,
        distance: event.distance?.toString() || '',
        duration: event.duration?.toString() || '',
        pace: event.pace || '',
        notes: event.notes || '',
        heartRate: event.heartRate?.toString() || '',
        feeling: event.feeling || 3,
        completed: event.completed,
      });
    } else {
      setFormData({
        type: 'easy',
        distance: '',
        duration: '',
        pace: '',
        notes: '',
        heartRate: '',
        feeling: 3,
        completed: 0,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setSelectedEvent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      id: selectedEvent?.id,
      date: selectedDate,
      type: formData.type,
      distance: formData.distance ? parseFloat(formData.distance) : null,
      duration: formData.duration ? parseInt(formData.duration) : null,
      pace: formData.pace || null,
      notes: formData.notes || null,
      heartRate: formData.heartRate ? parseInt(formData.heartRate) : null,
      feeling: formData.feeling,
      completed: formData.completed,
    };

    try {
      const res = await fetch('/api/running-events', {
        method: selectedEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        loadEvents();
        closeModal();
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent || !confirm('¿Eliminar este entrenamiento?')) return;

    try {
      await fetch(`/api/running-events?id=${selectedEvent.id}`, { method: 'DELETE' });
      loadEvents();
      closeModal();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Generar días del calendario
  const calendarDays = [];
  for (let i = startDay - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrevMonth - i, currentMonth: false, isToday: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, currentMonth: true, isToday: isToday(i) });
  }
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({ day: i, currentMonth: false, isToday: false });
  }

  // Estadísticas del mes
  const monthStats = events.reduce((acc, e) => {
    if (e.completed) {
      acc.totalDistance += e.distance || 0;
      acc.totalDuration += e.duration || 0;
      acc.completedRuns++;
    }
    return acc;
  }, { totalDistance: 0, totalDuration: 0, completedRuns: 0 });

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🏃</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Training Calendar
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Planifica y registra tus entrenamientos de running
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Distancia</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            {monthStats.totalDistance.toFixed(1)} km
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Tiempo</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            {Math.floor(monthStats.totalDuration / 60)}h {monthStats.totalDuration % 60}m
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Entrenos</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            {monthStats.completedRuns}
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white min-w-[160px] sm:min-w-[200px] text-center">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <button onClick={goToToday} className="px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg">
            Hoy
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {DAYS.map((day) => (
            <div key={day} className="py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((item, index) => {
            const dayEvents = getEventsForDay(item.day, item.currentMonth);
            const dateStr = item.currentMonth
              ? `${year}-${String(month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`
              : '';

            return (
              <div
                key={index}
                onClick={() => item.currentMonth && openModal(dateStr)}
                className={`min-h-[70px] sm:min-h-[90px] p-1 sm:p-2 border-b border-r border-gray-100 dark:border-gray-700 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  index % 7 === 6 ? 'border-r-0' : ''
                } ${index >= 35 ? 'border-b-0' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs sm:text-sm ${
                    item.isToday
                      ? 'bg-purple-600 text-white font-semibold'
                      : item.currentMonth
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    {item.day}
                  </span>
                  {item.currentMonth && dayEvents.length === 0 && (
                    <button className="opacity-0 hover:opacity-100 p-1 text-gray-400 hover:text-purple-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* Events */}
                <div className="mt-1 space-y-1">
                  {dayEvents.map((event) => {
                    const eventType = getEventType(event.type);
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(dateStr, event);
                        }}
                        className={`text-xs p-1 rounded ${eventType.color} text-white truncate ${
                          event.completed ? 'opacity-100' : 'opacity-60 border border-dashed border-white/50'
                        }`}
                      >
                        <span className="hidden sm:inline">{eventType.icon} </span>
                        {event.distance ? `${event.distance}km` : eventType.label.slice(0, 6)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
        {EVENT_TYPES.map((type) => (
          <div key={type.id} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${type.color}`}></span>
            <span className="text-gray-600 dark:text-gray-400">{type.icon} {type.label}</span>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedEvent ? 'Editar' : 'Nuevo'} Entrenamiento
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de entrenamiento
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {EVENT_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.id })}
                        className={`p-2 rounded-lg text-center text-xs transition-all ${
                          formData.type === type.id
                            ? `${type.color} text-white`
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span className="text-lg">{type.icon}</span>
                        <p className="mt-1 truncate">{type.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distance & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Distancia (km)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.distance}
                      onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                      className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="10.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Duración (min)
                    </label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="60"
                    />
                  </div>
                </div>

                {/* Pace & Heart Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ritmo (min/km)
                    </label>
                    <input
                      type="text"
                      value={formData.pace}
                      onChange={(e) => setFormData({ ...formData, pace: e.target.value })}
                      className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="5:30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      FC media (bpm)
                    </label>
                    <input
                      type="number"
                      value={formData.heartRate}
                      onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                      className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="150"
                    />
                  </div>
                </div>

                {/* Feeling */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ¿Cómo te sentiste?
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFormData({ ...formData, feeling: n })}
                        className={`flex-1 p-2 rounded-lg text-xl transition-all ${
                          formData.feeling === n
                            ? 'bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500'
                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {n === 1 ? '😫' : n === 2 ? '😓' : n === 3 ? '😐' : n === 4 ? '😊' : '🤩'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                    placeholder="Series de 400m, calentamiento..."
                  />
                </div>

                {/* Completed */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.completed === 1}
                    onChange={(e) => setFormData({ ...formData, completed: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Entrenamiento completado
                  </span>
                </label>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  {selectedEvent && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
