import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import { APIProvider } from '@vis.gl/react-google-maps';
import LocationMapPicker from '@/components/LocationMapPicker';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SchoolDashboard = () => {
  const { t } = useTranslation();
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [locations, setLocations] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [instructorDialogOpen, setInstructorDialogOpen] = useState(false);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  
  // Branding states
  const [brandingForm, setBrandingForm] = useState({
    tagline: '',
    bio: '',
    logo_url: '',
    banner_url: '',
    certificate_urls: [],
    video_url: ''
  });
  const [uploadingBranding, setUploadingBranding] = useState(false);
  
  // Form states
  const [locationForm, setLocationForm] = useState({
    name: '', address: '', city: '', prefecture: '', capacity: '', facilities: '', facility_images: [], google_maps_url: '', description: '', latitude: null, longitude: null
  });
  const [instructorForm, setInstructorForm] = useState({
    name: '', email: '', phone: '', rank: '', years_experience: '', bio: '', specialties: ''
  });
  const [programForm, setProgramForm] = useState({
    location_id: '', instructor_id: '', title: '', description: '', martial_arts_style: 'Aikido',
    course_category: 'Martial Arts', category: 'Martial Arts', experience_level: 'beginner', class_type: 'group', price: '',
    currency: 'JPY', capacity: '', prerequisites: '', start_date: '', end_date: '', 
    daily_start_time: '09:00', daily_end_time: '17:00', image_url: ''
  });

  useEffect(() => {
    fetchSchoolData();
  }, []);

  const fetchSchoolData = async () => {
    try {
      const schoolRes = await axios.get(`${API}/schools/my/school`, { withCredentials: true });
      setSchool(schoolRes.data);
      
      // Populate branding form with existing data
      setBrandingForm({
        tagline: schoolRes.data.tagline || t('dashboard.defaultTagline'),
        bio: schoolRes.data.bio || '',
        logo_url: schoolRes.data.logo_url || '',
        banner_url: schoolRes.data.banner_url || '',
        certificate_urls: schoolRes.data.certificate_urls || [],
        video_url: schoolRes.data.video_url || ''
      });

      const [locsRes, instsRes, progsRes, booksRes] = await Promise.all([
        axios.get(`${API}/locations?school_id=${schoolRes.data.id}`),
        axios.get(`${API}/instructors?school_id=${schoolRes.data.id}`),
        axios.get(`${API}/courses?school_id=${schoolRes.data.id}`),
        axios.get(`${API}/schools/${schoolRes.data.id}/bookings`, { withCredentials: true })
      ]);
      
      setLocations(locsRes.data);
      setInstructors(instsRes.data);
      setPrograms(progsRes.data);
      setBookings(booksRes.data);
    } catch (error) {
      console.error('Failed to fetch school data:', error);
      console.error('Error details:', error.response?.data);
      const errorMsg = error.response?.data?.detail || 'Failed to load school data';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Location handlers
  const handleCreateLocation = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...locationForm, capacity: parseInt(locationForm.capacity), facilities: locationForm.facilities.split(',').map(f => f.trim()).filter(f => f) };
      await axios.post(`${API}/locations`, payload, { withCredentials: true });
      toast.success('Location created successfully');
      setLocationDialogOpen(false);
      setLocationForm({ name: '', address: '', city: '', prefecture: '', capacity: '', facilities: '', facility_images: [], google_maps_url: '', description: '', latitude: null, longitude: null });
      fetchSchoolData();
    } catch (error) {
      toast.error('Failed to create location');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Delete this location?')) return;
    try {
      await axios.delete(`${API}/locations/${id}`, { withCredentials: true });
      toast.success('Location deleted');
      fetchSchoolData();
    } catch (error) {
      toast.error('Failed to delete location');
    }
  };

  // Instructor handlers
  const handleCreateInstructor = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...instructorForm, years_experience: instructorForm.years_experience ? parseInt(instructorForm.years_experience) : null, specialties: instructorForm.specialties.split(',').map(s => s.trim()).filter(s => s) };
      await axios.post(`${API}/instructors`, payload, { withCredentials: true });
      toast.success('Instructor added successfully');
      setInstructorDialogOpen(false);
      setInstructorForm({ name: '', email: '', phone: '', rank: '', years_experience: '', bio: '', specialties: '' });
      fetchSchoolData();
    } catch (error) {
      toast.error('Failed to add instructor');
    }
  };

  const handleDeleteInstructor = async (id) => {
    if (!window.confirm('Delete this instructor?')) return;
    try {
      await axios.delete(`${API}/instructors/${id}`, { withCredentials: true });
      toast.success('Instructor deleted');
      fetchSchoolData();
    } catch (error) {
      toast.error('Failed to delete instructor');
    }
  };

  // Program handlers  
  const handleProgramSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...programForm, price: parseFloat(programForm.price), capacity: parseInt(programForm.capacity) };
      if (editingProgram) {
        await axios.put(`${API}/courses/${editingProgram.id}`, payload, { withCredentials: true });
        toast.success('Program updated successfully');
      } else {
        const isFirstCourse = programs.length === 0;
        await axios.post(`${API}/courses`, payload, { withCredentials: true });
        if (isFirstCourse) {
          toast.success('First course created! It will be reviewed by an admin before going live. Future courses will be published immediately.', { duration: 8000 });
        } else {
          toast.success('Program created and published successfully!');
        }
      }
      setProgramDialogOpen(false);
      setEditingProgram(null);
      setProgramForm({ location_id: '', instructor_id: '', title: '', description: '', martial_arts_style: 'Aikido', course_category: 'Martial Arts', category: 'Martial Arts', experience_level: 'beginner', class_type: 'group', price: '', currency: 'JPY', capacity: '', prerequisites: '', start_date: '', end_date: '', daily_start_time: '09:00', daily_end_time: '17:00', image_url: '' });
      fetchSchoolData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save program');
    }
  };

  const handleEditProgram = (program) => {
    setEditingProgram(program);
    setProgramForm({
      location_id: program.location_id, instructor_id: program.instructor_id, title: program.title, description: program.description,
      martial_arts_style: program.martial_arts_style, course_category: program.course_category || 'Martial Arts', category: program.category, experience_level: program.experience_level,
      class_type: program.class_type, price: program.price.toString(), currency: program.currency,
      capacity: program.capacity.toString(), prerequisites: program.prerequisites || '', start_date: program.start_date || '',
      end_date: program.end_date || '', daily_start_time: program.daily_start_time || '09:00', 
      daily_end_time: program.daily_end_time || '17:00', image_url: program.image_url
    });
    setProgramDialogOpen(true);
  };

  const handleDeleteProgram = async (id) => {
    if (!window.confirm('Delete this program?')) return;
    try {
      await axios.delete(`${API}/courses/${id}`, { withCredentials: true });
      toast.success('Program deleted');
      fetchSchoolData();
    } catch (error) {
      toast.error('Failed to delete program');
    }
  };

  const handleConfirmProgram = async (id) => {
    try {
      await axios.patch(`${API}/courses/${id}/confirm`, {}, { withCredentials: true });
      toast.success('Program confirmed and now active!');
      fetchSchoolData();
    } catch (error) {
      toast.error('Failed to confirm program');
    }
  };

  // Branding handlers
  const handleBrandingImageUpload = async (file, type) => {
    try {
      console.log('=== UPLOAD START ===');
      console.log('Uploading file for type:', type);
      console.log('Current brandingForm before upload:', brandingForm);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/upload/image`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Use relative URL to avoid CORS issues
      const imageUrl = response.data.url.replace('/uploads/', '/api/uploads/');
      console.log('Image uploaded successfully:', imageUrl);
      
      if (type === 'certificate') {
        // Add to certificate array
        setBrandingForm(prev => {
          const newState = {
            ...prev,
            certificate_urls: [...prev.certificate_urls, imageUrl]
          };
          console.log('Setting certificate state:', newState);
          return newState;
        });
      } else {
        // Update logo or banner
        setBrandingForm(prev => {
          const newState = {
            ...prev,
            [type]: imageUrl
          };
          console.log(`Setting ${type} state:`, newState);
          return newState;
        });
      }
      
      toast.success(`${type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)} uploaded successfully`);
      return imageUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      throw error;
    }
  };

  const handleVideoUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/upload/video`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Use relative URL to avoid CORS issues
      const videoUrl = response.data.url.replace('/uploads/', '/api/uploads/');
      setBrandingForm(prev => ({
        ...prev,
        video_url: videoUrl
      }));
      
      toast.success('Video uploaded successfully');
      return videoUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload video');
      throw error;
    }
  };

  const handleRemoveCertificate = (index) => {
    setBrandingForm(prev => ({
      ...prev,
      certificate_urls: prev.certificate_urls.filter((_, i) => i !== index)
    }));
    toast.success('Certificate removed');
  };

  const handleSaveBranding = async () => {
    if (!school) return;
    
    setUploadingBranding(true);
    try {
      await axios.put(`${API}/schools/${school.id}`, brandingForm, { withCredentials: true });
      toast.success('School branding updated successfully!');
      fetchSchoolData();
    } catch (error) {
      console.error('Failed to update branding:', error);
      toast.error('Failed to update school branding');
    } finally {
      setUploadingBranding(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 data-testid="site-logo" onClick={() => navigate('/')} className="text-2xl font-bold text-slate-900 cursor-pointer" style={{ fontFamily: 'Playfair Display, serif' }}>Train In Japan</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-slate-700 hover:text-emerald-800 font-medium transition-colors">{t('nav.home')}</button>
            <LanguageSwitcher />
            <Button data-testid="logout-btn" onClick={handleLogout} variant="outline">{t('nav.logout')}</Button>
          </div>
        </div>
      </nav>

      <div data-testid="school-dashboard" className="max-w-7xl mx-auto px-6 py-12">
        {/* Branded School Header */}
        <Card className="mb-8 overflow-hidden">
          {/* Banner Image */}
          {school?.banner_url && (
            <div className="w-full h-48 bg-gradient-to-r from-emerald-600 to-emerald-800 relative overflow-hidden">
              <img 
                src={school.banner_url} 
                alt="School Banner" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
          )}
          
          <CardContent className={`${school?.banner_url ? 'pt-6' : 'pt-8'} pb-8 px-8`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                {/* School Logo */}
                <div className={`${school?.banner_url ? '-mt-16' : ''} relative`}>
                  {school?.logo_url ? (
                    <div className="w-32 h-32 rounded-lg overflow-hidden border-4 border-white shadow-lg bg-white">
                      <img 
                        src={school.logo_url} 
                        alt={school.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                      <AvatarImage src={user?.picture} />
                      <AvatarFallback className="text-3xl">{school?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
                
                {/* School Info */}
                <div className={`${school?.banner_url ? 'mt-4' : ''}`}>
                  <h2 data-testid="school-name" className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'Spectral, serif' }}>
                    {school?.name}
                  </h2>
                  <p className="text-sm text-slate-500 uppercase tracking-wide mb-2">{school?.tagline || 'Training School'}</p>
                  <p className="text-slate-600 mb-2">📍 {school?.location}</p>
                  <div className="flex items-center gap-3">
                    <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      ✓ Approved
                    </span>
                    {school?.website && (
                      <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 hover:text-emerald-800 underline">
                        🌐 Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="text-right space-y-2 bg-slate-50 p-4 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-3 font-semibold">{t('dashboard.stats.title')}</p>
                <p className="text-sm text-slate-600">{t('dashboard.stats.locations')}: <strong className="text-slate-900">{locations.length}</strong></p>
                <p className="text-sm text-slate-600">{t('dashboard.stats.instructors')}: <strong className="text-slate-900">{instructors.length}</strong></p>
                <p className="text-sm text-slate-600">{t('dashboard.stats.programs')}: <strong className="text-slate-900">{programs.length}</strong></p>
                <p className="text-sm text-slate-600">{t('dashboard.stats.bookings')}: <strong className="text-slate-900">{bookings.length}</strong></p>
                <div className="pt-2 mt-2 border-t border-slate-200">
                  <p className="text-sm text-emerald-600 font-semibold">
                    {t('dashboard.stats.earnings')}: <strong className="text-emerald-700 text-lg">
                      ¥{bookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.school_earnings || 0), 0).toLocaleString('ja-JP')}
                    </strong>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('dashboard.stats.platformFee')}: ¥{bookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.platform_fee || 0), 0).toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* School Description */}
            {school?.description && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-slate-700 leading-relaxed">{school.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="locations" className="w-full">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger data-testid="branding-tab" value="branding">{t('dashboard.tabs.branding')}</TabsTrigger>
            <TabsTrigger data-testid="locations-tab" value="locations">{t('dashboard.tabs.locations')}</TabsTrigger>
            <TabsTrigger data-testid="instructors-tab" value="instructors">{t('dashboard.tabs.instructors')}</TabsTrigger>
            <TabsTrigger data-testid="programs-tab" value="programs">{t('dashboard.tabs.programs')}</TabsTrigger>
            <TabsTrigger data-testid="bookings-tab" value="bookings">{t('dashboard.tabs.bookings')}</TabsTrigger>
          </TabsList>

          {/* BRANDING TAB */}
          <TabsContent value="branding" className="mt-6">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>{t('branding.title')}</h2>
              <p className="text-slate-600">{t('branding.subtitle')}</p>
            </div>

            <div className="grid gap-6">
              {/* School Tagline */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('branding.tagline.title')}</CardTitle>
                  <CardDescription>{t('branding.tagline.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <input
                    type="text"
                    value={brandingForm.tagline}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, tagline: e.target.value }))}
                    placeholder={t('branding.tagline.placeholder')}
                    maxLength={50}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-slate-500 mt-2">{brandingForm.tagline?.length || 0}/50 characters</p>
                </CardContent>
              </Card>

              {/* School Bio/About */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('branding.bio.title')}</CardTitle>
                  <CardDescription>{t('branding.bio.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={brandingForm.bio}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder={t('branding.bio.placeholder')}
                    rows={8}
                    maxLength={2000}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-slate-500 mt-2">{brandingForm.bio?.length || 0}/2000 characters</p>
                </CardContent>
              </Card>

              {/* School Logo */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('branding.logo.title')}</CardTitle>
                  <CardDescription>{t('branding.logo.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    key="logo-upload"
                    currentImage={brandingForm.logo_url}
                    onUpload={(file) => handleBrandingImageUpload(file, 'logo_url')}
                    onRemove={() => setBrandingForm(prev => ({ ...prev, logo_url: '' }))}
                  />
                </CardContent>
              </Card>

              {/* School Banner */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('branding.banner.title')}</CardTitle>
                  <CardDescription>{t('branding.banner.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    key="banner-upload"
                    currentImage={brandingForm.banner_url}
                    onUpload={(file) => handleBrandingImageUpload(file, 'banner_url')}
                    onRemove={() => setBrandingForm(prev => ({ ...prev, banner_url: '' }))}
                  />
                </CardContent>
              </Card>

              {/* Certificates */}
              <Card>
                <CardHeader>
                  <CardTitle>Certificates & Accreditations</CardTitle>
                  <CardDescription>Upload images of your school's certificates, accreditations, or awards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Display existing certificates */}
                  {brandingForm.certificate_urls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {brandingForm.certificate_urls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Certificate ${index + 1}`}
                            className="w-full h-40 object-cover rounded-lg border-2 border-slate-200"
                          />
                          <button
                            onClick={() => handleRemoveCertificate(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Upload new certificate */}
                  <ImageUpload
                    currentImage=""
                    onUpload={(file) => handleBrandingImageUpload(file, 'certificate')}
                    label="Add Certificate"
                  />
                </CardContent>
              </Card>

              {/* Promotional Video */}
              <Card>
                <CardHeader>
                  <CardTitle>Promotional Video</CardTitle>
                  <CardDescription>Upload a video or provide a URL (YouTube, Vimeo). Max file size: 100MB</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Video URL (YouTube, Vimeo, etc.)</label>
                    <input
                      type="url"
                      value={brandingForm.video_url}
                      onChange={(e) => setBrandingForm(prev => ({ ...prev, video_url: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="text-center text-slate-500">OR</div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Upload Video File</label>
                    <input
                      type="file"
                      accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          handleVideoUpload(file);
                        }
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <p className="text-xs text-slate-500 mt-1">Supported formats: MP4, MPEG, MOV, AVI, WebM (Max: 100MB)</p>
                  </div>

                  {/* Video Preview */}
                  {brandingForm.video_url && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-700 mb-2">Preview:</p>
                      {brandingForm.video_url.includes('youtube.com') || brandingForm.video_url.includes('youtu.be') ? (
                        <iframe
                          width="100%"
                          height="315"
                          src={brandingForm.video_url.replace('watch?v=', 'embed/')}
                          title="Video preview"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="rounded-lg"
                        ></iframe>
                      ) : brandingForm.video_url.includes('vimeo.com') ? (
                        <iframe
                          src={`https://player.vimeo.com/video/${brandingForm.video_url.split('/').pop()}`}
                          width="100%"
                          height="315"
                          frameBorder="0"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                          className="rounded-lg"
                        ></iframe>
                      ) : (
                        <video
                          controls
                          className="w-full rounded-lg"
                          src={brandingForm.video_url}
                        >
                          Your browser does not support the video tag.
                        </video>
                      )}
                      <Button
                        onClick={() => setBrandingForm(prev => ({ ...prev, video_url: '' }))}
                        variant="outline"
                        className="mt-2"
                      >
                        Remove Video
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveBranding}
                  disabled={uploadingBranding}
                  className="bg-emerald-700 hover:bg-emerald-800 px-8"
                >
                  {uploadingBranding ? 'Saving...' : t('branding.saveBranding')}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* LOCATIONS TAB */}
          <TabsContent value="locations" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>{t('location.title')}</h2>
                <p className="text-slate-600">{t('location.subtitle')}</p>
              </div>
              <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-location-btn" className="bg-emerald-700 hover:bg-emerald-800">{t('location.addLocation')}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('location.addLocation')}</DialogTitle>
                    <DialogDescription>
                      {t('location.addLocationDesc')}
                      <span className="block mt-1 text-xs text-emerald-700">🇯🇵 {t('location.japaneseOnly')}</span>
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateLocation} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('location.name')} {t('common.required')}</label>
                      <input data-testid="location-name-input" type="text" required value={locationForm.name} onChange={(e) => setLocationForm({...locationForm, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder={t('location.namePlaceholder')} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('location.address')}</label>
                      <input 
                        data-testid="location-address-input" 
                        type="text" 
                        value={locationForm.address} 
                        onChange={(e) => setLocationForm({...locationForm, address: e.target.value})} 
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                        placeholder={t('location.addressPlaceholder') || 'Type address to search or click map below'} 
                      />
                    </div>

                    {/* Google Maps Location Picker */}
                    <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
                      <LocationMapPicker
                        onLocationSelect={(location) => {
                          setLocationForm(prev => ({
                            ...prev,
                            address: location.address,
                            city: location.city || location.address.split(',')[1]?.trim() || prev.city,
                            prefecture: location.prefecture || prev.prefecture,
                            latitude: location.lat,
                            longitude: location.lng,
                            google_maps_url: `https://www.google.com/maps/place/?q=place_id:${location.placeId}`
                          }));
                        }}
                        initialPosition={
                          locationForm.latitude && locationForm.longitude
                            ? { lat: locationForm.latitude, lng: locationForm.longitude }
                            : null
                        }
                        addressToGeocode={locationForm.address}
                      />
                    </APIProvider>

                    {/* Prefecture and City fields - Always visible */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {t('location.city')}
                          {locationForm.city && <span className="ml-2 text-xs text-emerald-600">✓ Auto-filled</span>}
                        </label>
                        <input 
                          type="text" 
                          value={locationForm.city || ''} 
                          onChange={(e) => setLocationForm({...locationForm, city: e.target.value})} 
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                          placeholder="City (auto-filled from map)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {t('location.prefecture')}
                          {locationForm.prefecture && <span className="ml-2 text-xs text-emerald-600">✓ Auto-filled</span>}
                        </label>
                        <input 
                          type="text" 
                          value={locationForm.prefecture || ''} 
                          onChange={(e) => setLocationForm({...locationForm, prefecture: e.target.value})} 
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                          placeholder="Prefecture (auto-filled from map)"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('location.capacity')} {t('common.required')}</label>
                      <input data-testid="location-capacity-input" type="number" required min="1" value={locationForm.capacity} onChange={(e) => setLocationForm({...locationForm, capacity: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder={t('location.capacityPlaceholder')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('location.facilities')}</label>
                      <input data-testid="location-facilities-input" type="text" value={locationForm.facilities} onChange={(e) => setLocationForm({...locationForm, facilities: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder={t('location.facilitiesPlaceholder')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('location.description')}</label>
                      <textarea data-testid="location-description-input" rows={2} value={locationForm.description} onChange={(e) => setLocationForm({...locationForm, description: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"></textarea>
                    </div>

                    {/* Facility Images */}
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <label className="block text-sm font-medium text-slate-700 mb-2">{t('location.facilityImages')}</label>
                      <p className="text-xs text-slate-600 mb-3">{t('location.facilityImagesHelp')}</p>
                      
                      {/* Show existing images */}
                      {locationForm.facility_images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {locationForm.facility_images.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img src={img} alt={`Facility ${idx + 1}`} className="w-full h-24 object-cover rounded border" />
                              <button
                                type="button"
                                onClick={() => setLocationForm(prev => ({
                                  ...prev,
                                  facility_images: prev.facility_images.filter((_, i) => i !== idx)
                                }))}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload button */}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files);
                          for (const file of files) {
                            try {
                              const formData = new FormData();
                              formData.append('file', file);
                              const response = await axios.post(`${API}/upload/image`, formData, {
                                withCredentials: true,
                                headers: { 'Content-Type': 'multipart/form-data' }
                              });
                              const imageUrl = response.data.url.replace('/uploads/', '/api/uploads/');
                              setLocationForm(prev => ({
                                ...prev,
                                facility_images: [...prev.facility_images, imageUrl]
                              }));
                            } catch (error) {
                              console.error('Upload failed:', error);
                              toast.error('Failed to upload image');
                            }
                          }
                          e.target.value = ''; // Reset input
                        }}
                        className="w-full text-sm"
                      />
                    </div>

                    <Button data-testid="location-save-btn" type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">{t('location.createLocation')}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {locations.length === 0 ? (
              <Card><CardContent className="p-12 text-center"><p data-testid="no-locations-msg" className="text-slate-600 mb-4">No locations added yet.</p><Button onClick={() => setLocationDialogOpen(true)} className="bg-emerald-700 hover:bg-emerald-800">Add Your First Location</Button></CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {locations.map((loc, idx) => (
                  <Card key={loc.id} data-testid={`location-card-${idx}`}>
                    <CardHeader>
                      <CardTitle>{loc.name}</CardTitle>
                      <CardDescription>{loc.city}, {loc.prefecture}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-slate-600"><strong>{t('common.address')}:</strong> {loc.address}</p>
                      <p className="text-sm text-slate-600"><strong>{t('location.capacity')}:</strong> {loc.capacity} {t('location.students')}</p>
                      {loc.facilities && loc.facilities.length > 0 && (
                        <p className="text-sm text-slate-600"><strong>{t('location.facilities')}:</strong> {loc.facilities.join(', ')}</p>
                      )}
                      
                      {/* Facility Images */}
                      {loc.facility_images && loc.facility_images.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">{t('location.facilityPhotos')}:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {loc.facility_images.map((img, imgIdx) => (
                              <img 
                                key={imgIdx} 
                                src={img} 
                                alt={`${loc.name} facility ${imgIdx + 1}`}
                                className="w-full h-20 object-cover rounded border border-slate-200"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Google Maps Link */}
                      {loc.google_maps_url && (
                        <a 
                          href={loc.google_maps_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          📍 {t('location.viewOnMaps')}
                        </a>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button data-testid={`delete-location-${idx}`} onClick={() => handleDeleteLocation(loc.id)} variant="destructive" size="sm">{t('common.delete')}</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* INSTRUCTORS TAB */}
          <TabsContent value="instructors" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>{t('instructor.title')}</h2>
                <p className="text-slate-600">{t('instructor.subtitle')}</p>
              </div>
              <Dialog open={instructorDialogOpen} onOpenChange={setInstructorDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-instructor-btn" className="bg-emerald-700 hover:bg-emerald-800">{t('instructor.addInstructor')}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t('instructor.createNew')}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateInstructor} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructor.name')} {t('common.required')}</label>
                        <input data-testid="instructor-name-input" type="text" required value={instructorForm.name} onChange={(e) => setInstructorForm({...instructorForm, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder={t('instructor.namePlaceholder')} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructor.email')} {t('common.required')}</label>
                        <input data-testid="instructor-email-input" type="email" required value={instructorForm.email} onChange={(e) => setInstructorForm({...instructorForm, email: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructor.phone')}</label>
                        <input data-testid="instructor-phone-input" type="tel" value={instructorForm.phone} onChange={(e) => setInstructorForm({...instructorForm, phone: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructor.rank')}</label>
                        <input data-testid="instructor-rank-input" type="text" value={instructorForm.rank} onChange={(e) => setInstructorForm({...instructorForm, rank: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder={t('instructor.rankPlaceholder')} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructor.yearsExperience')}</label>
                      <input data-testid="instructor-experience-input" type="number" min="0" value={instructorForm.years_experience} onChange={(e) => setInstructorForm({...instructorForm, years_experience: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructor.specialties')}</label>
                      <input data-testid="instructor-specialties-input" type="text" value={instructorForm.specialties} onChange={(e) => setInstructorForm({...instructorForm, specialties: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder={t('instructor.specialtiesPlaceholder')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructor.bio')}</label>
                      <textarea data-testid="instructor-bio-input" rows={3} value={instructorForm.bio} onChange={(e) => setInstructorForm({...instructorForm, bio: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder={t('instructor.bioPlaceholder')}></textarea>
                    </div>
                    <Button data-testid="instructor-save-btn" type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">{t('instructor.saveInstructor')}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {instructors.length === 0 ? (
              <Card><CardContent className="p-12 text-center"><p data-testid="no-instructors-msg" className="text-slate-600 mb-4">No instructors added yet.</p><Button onClick={() => setInstructorDialogOpen(true)} className="bg-emerald-700 hover:bg-emerald-800">Add Your First Instructor</Button></CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {instructors.map((inst, idx) => (
                  <Card key={inst.id} data-testid={`instructor-card-${idx}`}>
                    <CardHeader>
                      <CardTitle className="text-lg">{inst.name}</CardTitle>
                      {inst.rank && <CardDescription>{inst.rank}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 mb-1"><strong>{t('instructor.email')}:</strong> {inst.email}</p>
                      {inst.years_experience && <p className="text-sm text-slate-600 mb-2"><strong>{t('instructor.yearsExperience')}:</strong> {inst.years_experience} {t('instructor.years')}</p>}
                      {inst.specialties && inst.specialties.length > 0 && (
                        <p className="text-sm text-slate-600"><strong>{t('instructor.specialties')}:</strong> {inst.specialties.join(', ')}</p>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button data-testid={`delete-instructor-${idx}`} onClick={() => handleDeleteInstructor(inst.id)} variant="destructive" size="sm">{t('common.delete')}</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PROGRAMS TAB */}
          <TabsContent value="programs" className="mt-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>{t('program.title')}</h2>
                <p className="text-slate-600">{t('program.subtitle')}</p>
              </div>
              <Dialog open={programDialogOpen} onOpenChange={(open) => { setProgramDialogOpen(open); if (!open) { setEditingProgram(null); setProgramForm({ location_id: '', instructor_id: '', title: '', description: '', martial_arts_style: 'Aikido', course_category: 'Martial Arts', category: 'Martial Arts', experience_level: 'beginner', class_type: 'group', price: '', currency: 'JPY', capacity: '', prerequisites: '', start_date: '', end_date: '', daily_start_time: '09:00', daily_end_time: '17:00', image_url: '' }); } }}>
                <DialogTrigger asChild>
                  <Button data-testid="add-program-btn" className="bg-emerald-700 hover:bg-emerald-800">{t('program.addProgram')}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProgram ? t('program.editProgram') : t('program.createNew')}</DialogTitle>
                  </DialogHeader>
                  
                  {/* First Course Approval Warning */}
                  {programs.length === 0 && !editingProgram && (
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-emerald-900">{t('program.firstCourseTitle')}</h3>
                          <div className="mt-2 text-sm text-emerald-800">
                            <p>{t('program.firstCourseWarning')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleProgramSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('program.location')} *</label>
                        <select data-testid="program-location-input" required value={programForm.location_id} onChange={(e) => setProgramForm({...programForm, location_id: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                          <option value="">{t('program.selectLocation')}</option>
                          {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('program.instructor')} *</label>
                        <select data-testid="program-instructor-input" required value={programForm.instructor_id} onChange={(e) => setProgramForm({...programForm, instructor_id: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                          <option value="">{t('program.selectInstructor')}</option>
                          {instructors.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('program.title')} *</label>
                      <input data-testid="program-title-input" type="text" required value={programForm.title} onChange={(e) => setProgramForm({...programForm, title: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('program.description')} *</label>
                      <textarea data-testid="program-description-input" required rows={3} value={programForm.description} onChange={(e) => setProgramForm({...programForm, description: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"></textarea>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('program.courseCategory')} *</label>
                        <select data-testid="program-category-input" required value={programForm.course_category} onChange={(e) => setProgramForm({...programForm, course_category: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                          <option value="Martial Arts">{t('program.martialArts')}</option>
                          <option value="Cultural Arts">{t('program.culturalArts')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {programForm.course_category === 'Martial Arts' ? t('program.martialArtsStyle') + ' *' : t('program.culturalArtType') + ' *'}
                        </label>
                        <select data-testid="program-style-input" required value={programForm.martial_arts_style} onChange={(e) => setProgramForm({...programForm, martial_arts_style: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                          {programForm.course_category === 'Martial Arts' ? (
                            <>
                              <option>KORYU/KOBUDO</option>
                              <option>Aikido</option>
                              <option>Judo</option>
                              <option>Karate</option>
                              <option>Kendo</option>
                              <option>Iaido</option>
                              <option>Kyudo</option>
                              <option>Jiu-Jitsu</option>
                            </>
                          ) : (
                            <>
                              <option>Calligraphy (Shodō)</option>
                              <option>Ikebana (Flower Arranging)</option>
                              <option>Sumi-e (Ink Painting)</option>
                              <option>Sword Smithing (Katanakaji)</option>
                              <option>Tea Ceremony (Sadō)</option>
                              <option>Taiko Drumming</option>
                              <option>Other</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('program.experienceLevel')} *</label>
                        <select data-testid="program-level-input" required value={programForm.experience_level} onChange={(e) => setProgramForm({...programForm, experience_level: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                          <option value="beginner">{t('program.beginner')}</option><option value="intermediate">{t('program.intermediate')}</option><option value="advanced">{t('program.advanced')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('program.classType')} *</label>
                        <select data-testid="program-class-type-input" required value={programForm.class_type} onChange={(e) => setProgramForm({...programForm, class_type: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                          <option value="group">{t('program.groupAdults')}</option>
                          <option value="private">{t('program.private')}</option>
                          <option value="family">{t('program.familyAdultsChildren')}</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('program.price')} *</label>
                        <input data-testid="program-price-input" type="number" required step="0.01" value={programForm.price} onChange={(e) => setProgramForm({...programForm, price: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                        {programForm.price && (
                          <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs space-y-1">
                            <p className="text-emerald-800 font-semibold">
                              {t('program.youReceive')}: ¥{parseFloat(programForm.price).toLocaleString('ja-JP')}
                            </p>
                            <div className="text-slate-600 pl-2 border-l-2 border-slate-300 space-y-0.5">
                              <p>{t('program.bookingFeeAddedNote')}: ¥{(parseFloat(programForm.price) * 0.09).toLocaleString('ja-JP')}</p>
                              <p className="text-xs">
                                {t('program.subtotal')}: ¥{(parseFloat(programForm.price) * 1.09).toLocaleString('ja-JP')}
                              </p>
                              <p>{t('program.salesTaxNote')}: ¥{(parseFloat(programForm.price) * 1.09 * 0.10).toLocaleString('ja-JP')}</p>
                            </div>
                            <p className="text-slate-800 font-bold text-sm pt-1 border-t border-slate-300">
                              {t('program.studentPays')}: ¥{(parseFloat(programForm.price) * 1.09 * 1.10).toLocaleString('ja-JP')}
                              <span className="text-xs text-slate-500 ml-2">
                                (~${(parseFloat(programForm.price) * 1.09 * 1.10 * 0.00685).toFixed(2)} USD)
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {t('program.capacity')} * 
                          {programForm.location_id && (
                            <span className="text-xs text-slate-500 ml-1">
                              ({t('program.locationMax')}: {locations.find(l => l.id === programForm.location_id)?.capacity || 'N/A'})
                            </span>
                          )}
                        </label>
                        <input data-testid="program-capacity-input" type="number" required min="1" max={programForm.location_id ? locations.find(l => l.id === programForm.location_id)?.capacity : undefined} value={programForm.capacity} onChange={(e) => setProgramForm({...programForm, capacity: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                    
                    {/* Duration auto-calculated from dates */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-sm text-emerald-800">
                        <strong>{t('program.note')}:</strong> {t('program.durationNote')}
                      </p>
                    </div>

                    {/* Program Dates & Times */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4">
                      <h4 className="font-medium text-slate-900">{t('program.scheduleTitle')}</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('program.startDate')} *</label>
                          <input data-testid="program-start-date-input" type="date" required value={programForm.start_date} onChange={(e) => setProgramForm({...programForm, start_date: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('program.endDate')} *</label>
                          <input 
                            data-testid="program-end-date-input" 
                            type="date" 
                            required 
                            value={programForm.end_date} 
                            min={programForm.start_date || undefined}
                            onChange={(e) => setProgramForm({...programForm, end_date: e.target.value})} 
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('program.dailyStartTime')} *</label>
                          <input data-testid="program-start-time-input" type="time" required value={programForm.daily_start_time} onChange={(e) => setProgramForm({...programForm, daily_start_time: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('program.dailyEndTime')} *</label>
                          <input data-testid="program-end-time-input" type="time" required value={programForm.daily_end_time} onChange={(e) => setProgramForm({...programForm, daily_end_time: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">{t('program.fullTimeNote')}</p>
                    </div>
                    
                    {/* Image Upload */}
                    <div className="col-span-2">
                      <ImageUpload
                        currentImage={programForm.image_url}
                        onImageUploaded={(url) => setProgramForm({...programForm, image_url: url})}
                        label={t('program.programImage') + ' *'}
                      />
                      <input type="hidden" required value={programForm.image_url} />
                    </div>
                    
                    <Button data-testid="program-save-btn" type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">{editingProgram ? t('program.updateProgram') : t('program.createProgram')}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {programs.length === 0 ? (
              <Card><CardContent className="p-12 text-center"><p data-testid="no-programs-msg" className="text-slate-600 mb-4">{t('program.noProgramsYet')}</p><Button onClick={() => setProgramDialogOpen(true)} className="bg-emerald-700 hover:bg-emerald-800">{t('program.createFirstProgram')}</Button></CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {programs.map((prog, idx) => {
                  const loc = locations.find(l => l.id === prog.location_id);
                  const inst = instructors.find(i => i.id === prog.instructor_id);
                  return (
                    <Card key={prog.id} data-testid={`program-card-${idx}`} className="overflow-hidden">
                      <img src={prog.image_url} alt={prog.title} className="w-full h-32 object-cover" />
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">{prog.martial_arts_style}</span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${prog.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{prog.status}</span>
                        </div>
                        <CardTitle className="text-base">{prog.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-slate-600 mb-1"><strong>{t('program.location')}:</strong> {loc?.name || 'N/A'}</p>
                        <p className="text-xs text-slate-600 mb-1"><strong>{t('program.instructor')}:</strong> {inst?.name || 'N/A'}</p>
                        <p className="text-xs text-slate-600 mb-1"><strong>{t('program.level')}:</strong> {prog.experience_level}</p>
                        <p className="text-xs text-slate-600"><strong>{t('program.capacity')}:</strong> {prog.capacity} {t('program.students')}</p>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        {prog.status === 'pending' && <Button data-testid={`confirm-program-${idx}`} onClick={() => handleConfirmProgram(prog.id)} size="sm" className="flex-1 bg-green-600 hover:bg-green-700">{t('program.confirm')}</Button>}
                        <Button data-testid={`edit-program-${idx}`} onClick={() => handleEditProgram(prog)} variant="outline" size="sm" className="flex-1">{t('common.edit')}</Button>
                        <Button data-testid={`delete-program-${idx}`} onClick={() => handleDeleteProgram(prog.id)} variant="destructive" size="sm" className="flex-1">{t('common.delete')}</Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings" className="mt-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>{t('bookings.title')}</h2>
            {bookings.length === 0 ? (
              <Card><CardContent className="p-12 text-center"><p data-testid="no-bookings-msg" className="text-slate-600">{t('bookings.noBookingsYet')}</p></CardContent></Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking, idx) => {
                  const program = programs.find(p => p.id === booking.course_id);
                  return (
                    <Card key={booking.id} data-testid={`booking-card-${idx}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{program?.title || t('bookings.program')}</CardTitle>
                          <div className="flex gap-2">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${booking.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{booking.payment_status}</span>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{booking.status}</span>
                          </div>
                        </div>
                        <CardDescription>{t('bookings.booked')}: {new Date(booking.booking_date).toLocaleDateString()}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-slate-600"><strong>{t('bookings.student')}:</strong> {booking.student_name}</p>
                            <p className="text-sm text-slate-600"><strong>{t('bookings.email')}:</strong> {booking.student_email}</p>
                            {booking.student_phone && <p className="text-sm text-slate-600"><strong>{t('bookings.phone')}:</strong> {booking.student_phone}</p>}
                          </div>
                          {booking.message && (
                            <div>
                              <p className="text-sm font-medium text-slate-700 mb-1">{t('bookings.message')}:</p>
                              <p className="text-sm text-slate-600">{booking.message}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default SchoolDashboard;
