import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ScheduleCreator = ({ courseId, onScheduleCreated }) => {
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '10:00',
    recurrence_type: 'once',
    recurrence_days: [],
    recurrence_interval: 1
  });
  const [creating, setCreating] = useState(false);
  const [conflicts, setConflicts] = useState(null);

  const daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' }
  ];

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter(d => d !== day)
        : [...prev.recurrence_days, day]
    }));
  };

  const checkConflicts = async () => {
    try {
      const response = await axios.post(`${API}/validate-schedule`, formData, {
        withCredentials: true
      });
      setConflicts(response.data);
      
      if (response.data.has_conflict) {
        toast.warning('Scheduling conflicts detected! Review conflicts before creating.');
      } else {
        toast.success('No conflicts detected! Safe to create schedule.');
      }
    } catch (error) {
      console.error('Conflict check failed:', error);
      toast.error('Failed to check for conflicts');
    }
  };

  const handleCreate = async () => {
    if (!formData.start_date || !formData.end_date) {
      toast.error('Please select start and end dates');
      return;
    }

    if (formData.recurrence_type === 'weekly' && formData.recurrence_days.length === 0) {
      toast.error('Please select at least one day for weekly recurrence');
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(
        `${API}/courses/${courseId}/schedules`,
        formData,
        { withCredentials: true }
      );

      toast.success(`Schedule created! ${response.data.sessions_created} sessions generated.`);
      
      // Reset form
      setFormData({
        start_date: '',
        end_date: '',
        start_time: '09:00',
        end_time: '10:00',
        recurrence_type: 'once',
        recurrence_days: [],
        recurrence_interval: 1
      });
      setConflicts(null);

      if (onScheduleCreated) {
        onScheduleCreated(response.data);
      }
    } catch (error) {
      console.error('Failed to create schedule:', error);
      toast.error(error.response?.data?.detail || 'Failed to create schedule');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Course Schedule</CardTitle>
        <CardDescription>Set up when and how often this course will run</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              min={formData.start_date || new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Time Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Time</label>
            <input
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({...formData, start_time: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Time</label>
            <input
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({...formData, end_time: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Recurrence Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Recurrence</label>
          <select
            value={formData.recurrence_type}
            onChange={(e) => setFormData({...formData, recurrence_type: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="once">Once Only</option>
            <option value="daily">Every Day</option>
            <option value="weekly">Specific Days (Weekly)</option>
            <option value="custom">Every X Days</option>
          </select>
        </div>

        {/* Days of Week (for weekly) */}
        {formData.recurrence_type === 'weekly' && (
          <div>
            <label className="block text-sm font-medium mb-2">Select Days</label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    formData.recurrence_days.includes(day.value)
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-700'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Interval (for custom) */}
        {formData.recurrence_type === 'custom' && (
          <div>
            <label className="block text-sm font-medium mb-2">Repeat Every (days)</label>
            <input
              type="number"
              min="1"
              value={formData.recurrence_interval}
              onChange={(e) => setFormData({...formData, recurrence_interval: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        )}

        {/* Conflict Warnings */}
        {conflicts && conflicts.has_conflict && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2">⚠️ Scheduling Conflicts Detected</h4>
            {conflicts.location_conflicts.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-red-700">Location Conflicts:</p>
                <ul className="text-sm text-red-600 ml-4">
                  {conflicts.location_conflicts.map((c, idx) => (
                    <li key={idx}>• {c.date} at {c.time}</li>
                  ))}
                </ul>
              </div>
            )}
            {conflicts.instructor_conflicts.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-700">Instructor Conflicts:</p>
                <ul className="text-sm text-red-600 ml-4">
                  {conflicts.instructor_conflicts.map((c, idx) => (
                    <li key={idx}>• {c.date} at {c.time}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={checkConflicts}
            disabled={!formData.start_date || !formData.end_date}
          >
            Check for Conflicts
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !formData.start_date || !formData.end_date}
            className="flex-1 bg-emerald-700 hover:bg-emerald-800"
          >
            {creating ? 'Creating...' : 'Create Schedule'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleCreator;
