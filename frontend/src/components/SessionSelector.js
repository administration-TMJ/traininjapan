import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SessionSelector = ({ courseId, onSessionsSelected }) => {
  const [sessions, setSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [courseId]);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API}/courses/${courseId}/sessions?status=scheduled`);
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to load available sessions');
    } finally {
      setLoading(false);
    }
  };

  const toggleSession = (sessionId) => {
    setSelectedSessions(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
  };

  const handleConfirmSelection = () => {
    if (selectedSessions.length === 0) {
      toast.error('Please select at least one session');
      return;
    }
    const selectedSessionData = sessions.filter(s => selectedSessions.includes(s.id));
    onSessionsSelected(selectedSessionData);
  };

  const groupSessionsByDate = () => {
    const grouped = {};
    sessions.forEach(session => {
      if (!grouped[session.date]) {
        grouped[session.date] = [];
      }
      grouped[session.date].push(session);
    });
    return grouped;
  };

  const getSpotsRemaining = (session) => {
    return session.max_capacity - session.current_enrollment;
  };

  if (loading) {
    return <div className="text-center py-8">Loading available sessions...</div>;
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-slate-600">No sessions available for this course yet.</p>
        </CardContent>
      </Card>
    );
  }

  const groupedSessions = groupSessionsByDate();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Select Sessions
          </CardTitle>
          <CardDescription>
            Choose the dates and times you want to attend. You can select multiple sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.keys(groupedSessions).sort().map(date => (
              <div key={date} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                <div className="grid gap-2">
                  {groupedSessions[date].map(session => {
                    const spotsRemaining = getSpotsRemaining(session);
                    const isFull = spotsRemaining === 0;
                    const isSelected = selectedSessions.includes(session.id);

                    return (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-emerald-500 bg-emerald-50' :
                          isFull ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed' :
                          'border-slate-200 hover:border-emerald-300'
                        }`}
                        onClick={() => !isFull && toggleSession(session.id)}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isFull}
                            onChange={() => {}}
                            className="w-5 h-5"
                          />
                          <div>
                            <p className="font-medium">
                              {session.start_time} - {session.end_time}
                            </p>
                            <p className="text-sm text-slate-600">
                              {isFull ? (
                                <span className="text-red-600 font-semibold">Full (Waitlist Available)</span>
                              ) : (
                                <span>{spotsRemaining} spots remaining</span>
                              )}
                            </p>
                          </div>
                        </div>
                        {isFull && (
                          <Button variant="outline" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Join waitlist
                            toast.info('Waitlist feature coming soon!');
                          }}>
                            Join Waitlist
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedSessions.length > 0 && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="font-medium mb-2">
                {selectedSessions.length} session{selectedSessions.length > 1 ? 's' : ''} selected
              </p>
              <Button 
                onClick={handleConfirmSelection}
                className="w-full bg-emerald-700 hover:bg-emerald-800"
              >
                Continue to Booking
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionSelector;
