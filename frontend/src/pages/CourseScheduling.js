import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ScheduleCreator from '@/components/ScheduleCreator';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import { ArrowLeft } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CourseScheduling = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseAndSessions();
  }, [courseId]);

  const fetchCourseAndSessions = async () => {
    try {
      const [courseRes, sessionsRes] = await Promise.all([
        axios.get(`${API}/courses/${courseId}`, { withCredentials: true }),
        axios.get(`${API}/courses/${courseId}/sessions`, { withCredentials: true })
      ]);
      setCourse(courseRes.data);
      setSessions(sessionsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCreated = () => {
    fetchCourseAndSessions();
  };

  const handleSelectEvent = (event) => {
    const session = event.resource;
    console.log('Selected session:', session);
    // Could open a detail modal here
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!course) {
    return <div className="text-center py-8">Course not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <Button
          variant="outline"
          onClick={() => navigate('/school-dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
        <p className="text-slate-600 mb-8">Manage scheduling for this course</p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <ScheduleCreator 
            courseId={courseId}
            onScheduleCreated={handleScheduleCreated}
          />

          <Card>
            <CardHeader>
              <CardTitle>Session Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Sessions:</span>
                  <span className="font-semibold">{sessions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Scheduled:</span>
                  <span className="font-semibold text-green-600">
                    {sessions.filter(s => s.status === 'scheduled').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cancelled:</span>
                  <span className="font-semibold text-red-600">
                    {sessions.filter(s => s.status === 'cancelled').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Completed:</span>
                  <span className="font-semibold text-blue-600">
                    {sessions.filter(s => s.status === 'completed').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Course Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length > 0 ? (
              <ScheduleCalendar 
                sessions={sessions}
                onSelectEvent={handleSelectEvent}
              />
            ) : (
              <div className="text-center py-12 text-slate-600">
                No sessions scheduled yet. Create a schedule above to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CourseScheduling;
