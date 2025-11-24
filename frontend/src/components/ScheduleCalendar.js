import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const localizer = momentLocalizer(moment);

const ScheduleCalendar = ({ sessions, onSelectSlot, onSelectEvent, editable = false }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Convert sessions to calendar events
    const calendarEvents = sessions.map(session => ({
      id: session.id,
      title: `${session.start_time} - ${session.end_time}`,
      start: new Date(`${session.date}T${session.start_time}`),
      end: new Date(`${session.date}T${session.end_time}`),
      resource: session,
      style: {
        backgroundColor: session.status === 'cancelled' ? '#ef4444' :
                        session.current_enrollment >= session.max_capacity ? '#f59e0b' :
                        '#10b981'
      }
    }));
    setEvents(calendarEvents);
  }, [sessions]);

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.style.backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  return (
    <div className="h-[600px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        onSelectSlot={editable ? onSelectSlot : undefined}
        onSelectEvent={onSelectEvent}
        selectable={editable}
        eventPropGetter={eventStyleGetter}
        views={['month', 'week', 'day']}
        defaultView="month"
        style={{ height: '100%' }}
      />
    </div>
  );
};

export default ScheduleCalendar;
