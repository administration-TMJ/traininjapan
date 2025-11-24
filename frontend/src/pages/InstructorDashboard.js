import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InstructorDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [instructor, setInstructor] = useState(null);
  const [courses, setCourses] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');

  useEffect(() => {
    fetchInstructorData();
  }, []);

  const fetchInstructorData = async () => {
    try {
      // Fetch instructor profile
      const instructorRes = await axios.get(`${API}/instructors/me`, { withCredentials: true });
      setInstructor(instructorRes.data);

      // Fetch courses
      const coursesRes = await axios.get(`${API}/instructors/my-courses`, { withCredentials: true });
      setCourses(coursesRes.data);

      // Fetch schedule
      const scheduleRes = await axios.get(`${API}/instructors/my-schedule`, { withCredentials: true });
      setSchedule(scheduleRes.data.schedule);
    } catch (error) {
      console.error('Failed to fetch instructor data:', error);
      toast.error('Failed to load instructor dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'confirmed': { label: 'Active', variant: 'default', className: 'bg-emerald-100 text-emerald-800' },
      'active': { label: 'Active', variant: 'default', className: 'bg-emerald-100 text-emerald-800' },
      'pending_first_approval': { label: 'Pending', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800' },
      'completed': { label: 'Completed', variant: 'outline', className: 'bg-slate-100 text-slate-800' },
      'cancelled': { label: 'Cancelled', variant: 'destructive', className: 'bg-red-100 text-red-800' }
    };
    const config = statusConfig[status] || statusConfig['confirmed'];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // HH:MM format
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 
            data-testid="site-logo" 
            onClick={() => navigate('/')} 
            className="text-2xl font-bold text-slate-900 cursor-pointer" 
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Train In Japan
          </h1>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/programs')} 
              className="text-slate-700 hover:text-emerald-800 font-medium transition-colors"
            >
              Browse Programs
            </button>
            <Button data-testid="logout-btn" onClick={handleLogout} variant="outline">Logout</Button>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div data-testid="instructor-dashboard" className="max-w-7xl mx-auto px-6 py-12">
        {/* Profile Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.picture} />
                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 data-testid="instructor-name" className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Spectral, serif' }}>
                  {instructor?.name}
                </h2>
                <p data-testid="instructor-email" className="text-slate-600">{instructor?.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    Instructor
                  </span>
                  {instructor?.rank && (
                    <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                      {instructor.rank}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {instructor?.years_experience && (
                  <div className="text-2xl font-bold text-emerald-700">{instructor.years_experience}</div>
                )}
                {instructor?.years_experience && (
                  <div className="text-sm text-slate-600">Years Experience</div>
                )}
              </div>
            </div>
            {instructor?.bio && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-slate-700">{instructor.bio}</p>
              </div>
            )}
            {instructor?.specialties && instructor.specialties.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-slate-700 mb-2">Specialties:</div>
                <div className="flex flex-wrap gap-2">
                  {instructor.specialties.map((specialty, index) => (
                    <Badge key={index} variant="outline" className="bg-white">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-emerald-700" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{courses.length}</div>
                  <div className="text-sm text-slate-600">Total Courses</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {courses.filter(c => c.status === 'confirmed' || c.status === 'active').length}
                  </div>
                  <div className="text-sm text-slate-600">Active Courses</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-700" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {schedule.reduce((sum, event) => sum + (event.enrolled || 0), 0)}
                  </div>
                  <div className="text-sm text-slate-600">Total Students</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-4 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'courses'
                  ? 'text-emerald-700 border-b-2 border-emerald-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Courses
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'schedule'
                  ? 'text-emerald-700 border-b-2 border-emerald-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Schedule
            </button>
          </div>
        </div>

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            {courses.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Courses Assigned</h3>
                  <p className="text-slate-500">You don't have any courses assigned yet.</p>
                </CardContent>
              </Card>
            ) : (
              courses.map((course) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-900">{course.title}</h3>
                          {getStatusBadge(course.status)}
                        </div>
                        <p className="text-slate-600 mb-4">{course.description}</p>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(course.start_date)} - {formatDate(course.end_date)}</span>
                          </div>
                          {course.start_time && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Clock className="h-4 w-4" />
                              <span>{formatTime(course.start_time)} - {formatTime(course.end_time)}</span>
                            </div>
                          )}
                          {course.location && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <MapPin className="h-4 w-4" />
                              <span>{course.location.name}</span>
                            </div>
                          )}
                          {course.school && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <span className="font-medium">{course.school.name}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex items-center gap-4">
                          <div className="text-sm">
                            <span className="font-semibold text-slate-700">Price: </span>
                            <span className="text-emerald-700 font-bold">
                              {course.currency === 'AUD' ? 'A$' : '¥'}
                              {course.price.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-slate-700">Capacity: </span>
                            <span className="text-slate-600">{course.capacity} students</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {schedule.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Upcoming Classes</h3>
                  <p className="text-slate-500">Your schedule is currently empty.</p>
                </CardContent>
              </Card>
            ) : (
              schedule.map((event) => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>
                          {getStatusBadge(event.status)}
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-3 mb-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(event.start_date)} - {formatDate(event.end_date)}</span>
                          </div>
                          {event.start_time && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Clock className="h-4 w-4" />
                              <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Users className="h-4 w-4" />
                            <span>{event.enrolled} / {event.capacity} enrolled</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-sm text-slate-600">
                            <span className="font-medium">{event.school_name}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-emerald-700 font-bold">
                              {event.currency === 'AUD' ? 'A$' : '¥'}
                              {event.price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorDashboard;
