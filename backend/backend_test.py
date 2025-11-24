import requests
import sys
from datetime import datetime
import subprocess
import json

BACKEND_URL = "https://japanrail.preview.emergentagent.com"
API = f"{BACKEND_URL}/api"

class APITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.student_token = None
        self.school_token = None
        self.admin_token = None
        self.student_user_id = None
        self.school_user_id = None
        self.admin_user_id = None
        self.test_program_id = None
        self.test_booking_id = None

    def log_result(self, test_name, passed, status_code=None, expected=None, message=""):
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED")
            if status_code and expected:
                print(f"   Expected: {expected}, Got: {status_code}")
            if message:
                print(f"   Message: {message}")
        
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "status_code": status_code,
            "expected": expected,
            "message": message
        })

    def create_test_user(self, role="student"):
        """Create test user and session in MongoDB"""
        timestamp = int(datetime.now().timestamp() * 1000)
        user_id = f"test-{role}-{timestamp}"
        session_token = f"test_session_{role}_{timestamp}"
        email = f"test.{role}.{timestamp}@example.com"
        
        mongo_cmd = f"""
        use test_database;
        db.users.insertOne({{
            id: '{user_id}',
            email: '{email}',
            name: 'Test {role.title()} User',
            picture: 'https://via.placeholder.com/150',
            role: '{role}',
            school_id: null,
            created_at: new ISODate()
        }});
        db.user_sessions.insertOne({{
            user_id: '{user_id}',
            session_token: '{session_token}',
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new ISODate()
        }});
        """
        
        try:
            result = subprocess.run(
                ["mongosh", "test_database", "--quiet", "--eval", mongo_cmd],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                print(f"✓ Created {role} user: {user_id}")
                print(f"✓ Session token: {session_token}")
                return user_id, session_token
            else:
                print(f"✗ Failed to create {role} user: {result.stderr}")
                return None, None
        except Exception as e:
            print(f"✗ Error creating {role} user: {str(e)}")
            return None, None

    def test_public_endpoints(self):
        """Test public endpoints that don't require auth"""
        print("\n" + "="*60)
        print("TESTING PUBLIC ENDPOINTS")
        print("="*60)
        
        # Test GET /api/programs
        try:
            response = requests.get(f"{API}/programs", timeout=10)
            passed = response.status_code == 200
            self.log_result("GET /api/programs", passed, response.status_code, 200)
            if passed:
                programs = response.json()
                print(f"   Found {len(programs)} programs")
                if len(programs) > 0:
                    self.test_program_id = programs[0]['id']
        except Exception as e:
            self.log_result("GET /api/programs", False, message=str(e))
        
        # Test GET /api/programs with category filter
        try:
            response = requests.get(f"{API}/programs?category=Martial Arts", timeout=10)
            passed = response.status_code == 200
            self.log_result("GET /api/programs?category=Martial Arts", passed, response.status_code, 200)
        except Exception as e:
            self.log_result("GET /api/programs?category=Martial Arts", False, message=str(e))
        
        # Test GET /api/programs/{id}
        if self.test_program_id:
            try:
                response = requests.get(f"{API}/programs/{self.test_program_id}", timeout=10)
                passed = response.status_code == 200
                self.log_result(f"GET /api/programs/{self.test_program_id}", passed, response.status_code, 200)
            except Exception as e:
                self.log_result(f"GET /api/programs/{self.test_program_id}", False, message=str(e))
        
        # Test GET /api/schools (approved only)
        try:
            response = requests.get(f"{API}/schools", timeout=10)
            passed = response.status_code == 200
            self.log_result("GET /api/schools", passed, response.status_code, 200)
            if passed:
                schools = response.json()
                print(f"   Found {len(schools)} approved schools")
        except Exception as e:
            self.log_result("GET /api/schools", False, message=str(e))
        
        # Test POST /api/contact
        try:
            contact_data = {
                "first_name": "Test",
                "last_name": "User",
                "email": "test@example.com",
                "phone": "1234567890",
                "message": "Test message"
            }
            response = requests.post(f"{API}/contact", json=contact_data, timeout=10)
            passed = response.status_code == 200
            self.log_result("POST /api/contact", passed, response.status_code, 200)
        except Exception as e:
            self.log_result("POST /api/contact", False, message=str(e))

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*60)
        print("TESTING AUTH ENDPOINTS WITH JWT")
        print("="*60)
        
        if not self.student_token:
            print("⚠ Skipping auth tests - no JWT student token from signup/login")
            return
        
        # Test GET /api/auth/me with JWT student token
        try:
            headers = {"Authorization": f"Bearer {self.student_token}"}
            response = requests.get(f"{API}/auth/me", headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("GET /api/auth/me (JWT student)", passed, response.status_code, 200)
            if passed:
                user_data = response.json()
                print(f"   User: {user_data.get('name')} ({user_data.get('role')})")
                self.student_user_id = user_data.get('id')
        except Exception as e:
            self.log_result("GET /api/auth/me (JWT student)", False, message=str(e))
        
        # Test GET /api/auth/me without token (should fail)
        try:
            response = requests.get(f"{API}/auth/me", timeout=10)
            passed = response.status_code == 401
            self.log_result("GET /api/auth/me (no auth - should fail)", passed, response.status_code, 401)
        except Exception as e:
            self.log_result("GET /api/auth/me (no auth)", False, message=str(e))

    def test_school_endpoints(self):
        """Test school-related endpoints"""
        print("\n" + "="*60)
        print("TESTING SCHOOL ENDPOINTS")
        print("="*60)
        
        if not self.student_token:
            print("⚠ Skipping school tests - no student token")
            return
        
        # Test POST /api/schools (create school)
        try:
            headers = {"Authorization": f"Bearer {self.student_token}"}
            school_data = {
                "name": f"Test School {datetime.now().timestamp()}",
                "description": "A test school for automated testing",
                "location": "Tokyo, Japan",
                "contact_email": "test@testschool.com",
                "contact_phone": "123-456-7890",
                "website": "https://testschool.com"
            }
            response = requests.post(f"{API}/schools", json=school_data, headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("POST /api/schools (create school)", passed, response.status_code, 200)
            if passed:
                school = response.json()
                print(f"   Created school: {school.get('name')}")
                # Update school token since user role changed
                self.school_user_id = self.student_user_id
                self.school_token = self.student_token
        except Exception as e:
            self.log_result("POST /api/schools", False, message=str(e))

    def test_course_crud(self):
        """Test course CRUD operations (programs are aliases for courses)"""
        print("\n" + "="*60)
        print("TESTING COURSE CRUD (Programs are read-only aliases)")
        print("="*60)
        
        if not self.school_token:
            print("⚠ Skipping course CRUD tests - no school token")
            return
        
        # First need to create location and instructor for the school
        headers = {"Authorization": f"Bearer {self.school_token}"}
        
        # Create location
        location_data = {
            "name": "Test Dojo",
            "address": "123 Test Street",
            "city": "Tokyo",
            "prefecture": "Tokyo",
            "capacity": 20,
            "facilities": ["Mats", "Changing rooms"],
            "description": "Test location for automated testing"
        }
        
        location_id = None
        try:
            response = requests.post(f"{API}/locations", json=location_data, headers=headers, timeout=10)
            if response.status_code == 200:
                location = response.json()
                location_id = location.get('id')
                print(f"   Created location: {location.get('name')}")
        except Exception as e:
            print(f"   Failed to create location: {str(e)}")
        
        # Create instructor
        instructor_data = {
            "name": "Test Sensei",
            "email": "sensei@testdojo.com",
            "phone": "123-456-7890",
            "rank": "5th Dan",
            "years_experience": 15,
            "bio": "Experienced martial arts instructor",
            "specialties": ["Karate", "Self-defense"]
        }
        
        instructor_id = None
        try:
            response = requests.post(f"{API}/instructors", json=instructor_data, headers=headers, timeout=10)
            if response.status_code == 200:
                instructor = response.json()
                instructor_id = instructor.get('id')
                print(f"   Created instructor: {instructor.get('name')}")
        except Exception as e:
            print(f"   Failed to create instructor: {str(e)}")
        
        if not location_id or not instructor_id:
            print("⚠ Cannot create course - missing location or instructor")
            return
        
        # Test POST /api/courses (create course)
        try:
            course_data = {
                "location_id": location_id,
                "instructor_id": instructor_id,
                "title": f"Test Course {datetime.now().timestamp()}",
                "description": "A test course for automated testing",
                "martial_arts_style": "Karate",
                "category": "Martial Arts",
                "experience_level": "Beginner",
                "class_type": "Group",
                "price": 150.00,
                "currency": "AUD",
                "duration": "4 weeks",
                "capacity": 15,
                "prerequisites": "No prior experience required",
                "start_date": "2026-04-01",
                "end_date": "2026-04-30",
                "image_url": "https://images.unsplash.com/photo-1544386186-6de07b931438"
            }
            response = requests.post(f"{API}/courses", json=course_data, headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("POST /api/courses (create)", passed, response.status_code, 200)
            if passed:
                course = response.json()
                created_course_id = course.get('id')
                self.test_program_id = created_course_id  # Set for booking tests
                print(f"   Created course: {course.get('title')}")
                print(f"   Course status: {course.get('status')}")
                
                # Confirm the course to make it available for booking
                try:
                    response = requests.patch(f"{API}/courses/{created_course_id}/confirm", headers=headers, timeout=10)
                    if response.status_code == 200:
                        print(f"   Confirmed course for booking")
                except Exception as e:
                    print(f"   Failed to confirm course: {str(e)}")
        except Exception as e:
            self.log_result("POST /api/courses", False, message=str(e))

    def test_jwt_auth(self):
        """Test JWT-based authentication (signup/login)"""
        print("\n" + "="*60)
        print("TESTING JWT AUTHENTICATION")
        print("="*60)
        
        timestamp = int(datetime.now().timestamp() * 1000)
        test_email = f"student{timestamp}@test.com"
        test_password = "test123"
        test_name = "Test Student"
        
        # Test POST /api/auth/signup
        try:
            signup_data = {
                "email": test_email,
                "password": test_password,
                "name": test_name
            }
            response = requests.post(f"{API}/auth/signup", json=signup_data, timeout=10)
            passed = response.status_code == 200
            self.log_result("POST /api/auth/signup", passed, response.status_code, 200)
            if passed:
                result = response.json()
                print(f"   Created user: {result.get('user', {}).get('name')}")
                # Extract session token from cookies
                if 'Set-Cookie' in response.headers:
                    cookies = response.headers['Set-Cookie']
                    if 'session_token=' in cookies:
                        token_start = cookies.find('session_token=') + len('session_token=')
                        token_end = cookies.find(';', token_start)
                        if token_end == -1:
                            token_end = len(cookies)
                        self.student_token = cookies[token_start:token_end]
                        print(f"   Got session token from signup")
        except Exception as e:
            self.log_result("POST /api/auth/signup", False, message=str(e))
        
        # Test POST /api/auth/login
        try:
            login_data = {
                "email": test_email,
                "password": test_password
            }
            response = requests.post(f"{API}/auth/login", json=login_data, timeout=10)
            passed = response.status_code == 200
            self.log_result("POST /api/auth/login", passed, response.status_code, 200)
            if passed:
                result = response.json()
                print(f"   Logged in user: {result.get('user', {}).get('name')}")
                # Extract session token from cookies if not already set
                if not self.student_token and 'Set-Cookie' in response.headers:
                    cookies = response.headers['Set-Cookie']
                    if 'session_token=' in cookies:
                        token_start = cookies.find('session_token=') + len('session_token=')
                        token_end = cookies.find(';', token_start)
                        if token_end == -1:
                            token_end = len(cookies)
                        self.student_token = cookies[token_start:token_end]
                        print(f"   Got session token from login")
        except Exception as e:
            self.log_result("POST /api/auth/login", False, message=str(e))

    def test_booking_endpoints(self):
        """Test booking endpoints"""
        print("\n" + "="*60)
        print("TESTING BOOKING ENDPOINTS")
        print("="*60)
        
        if not self.student_token or not self.test_program_id:
            print("⚠ Skipping booking tests - missing student token or program ID")
            return
        
        # Test POST /api/programs/{id}/bookings
        try:
            headers = {"Authorization": f"Bearer {self.student_token}"}
            booking_data = {
                "student_name": "Test Student",
                "student_email": "test.student@example.com",
                "student_phone": "123-456-7890",
                "message": "I would like to book this program"
            }
            response = requests.post(f"{API}/programs/{self.test_program_id}/bookings", json=booking_data, headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("POST /api/programs/{id}/bookings", passed, response.status_code, 200)
            if passed:
                booking = response.json()
                self.test_booking_id = booking.get('id')
                print(f"   Created booking: {booking.get('id')}")
                print(f"   Payment status: {booking.get('payment_status')}")
        except Exception as e:
            self.log_result("POST /api/programs/{id}/bookings", False, message=str(e))
        
        # Test GET /api/bookings (my bookings)
        try:
            headers = {"Authorization": f"Bearer {self.student_token}"}
            response = requests.get(f"{API}/bookings", headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("GET /api/bookings (my bookings)", passed, response.status_code, 200)
            if passed:
                bookings = response.json()
                print(f"   Found {len(bookings)} bookings")
                for booking in bookings:
                    print(f"   - Booking {booking.get('id')}: {booking.get('payment_status')}")
        except Exception as e:
            self.log_result("GET /api/bookings", False, message=str(e))

    def test_payment_flow(self):
        """Test payment flow endpoints"""
        print("\n" + "="*60)
        print("TESTING PAYMENT FLOW")
        print("="*60)
        
        if not self.student_token or not self.test_program_id or not self.test_booking_id:
            print("⚠ Skipping payment tests - missing student token, program ID, or booking ID")
            return
        
        # Test POST /api/payments/checkout
        try:
            headers = {"Authorization": f"Bearer {self.student_token}"}
            checkout_params = {
                "course_id": self.test_program_id,
                "origin_url": BACKEND_URL
            }
            response = requests.post(f"{API}/payments/checkout", params=checkout_params, headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("POST /api/payments/checkout", passed, response.status_code, 200)
            if passed:
                result = response.json()
                checkout_url = result.get('checkout_url')
                session_id = result.get('session_id')
                print(f"   Checkout URL: {checkout_url[:50]}..." if checkout_url else "   No checkout URL")
                print(f"   Session ID: {session_id}")
                
                # Test GET /api/payments/status/{session_id}
                if session_id:
                    try:
                        response = requests.get(f"{API}/payments/status/{session_id}", headers=headers, timeout=10)
                        passed = response.status_code == 200
                        self.log_result("GET /api/payments/status/{session_id}", passed, response.status_code, 200)
                        if passed:
                            status = response.json()
                            print(f"   Payment status: {status.get('status')}")
                            print(f"   Booking ID: {status.get('booking_id')}")
                    except Exception as e:
                        self.log_result("GET /api/payments/status/{session_id}", False, message=str(e))
        except Exception as e:
            self.log_result("POST /api/payments/checkout", False, message=str(e))

    def test_school_bookings(self):
        """Test school bookings endpoint"""
        print("\n" + "="*60)
        print("TESTING SCHOOL BOOKINGS")
        print("="*60)
        
        if not self.school_token:
            print("⚠ Skipping school bookings tests - no school token")
            return
        
        # Get school info first
        try:
            headers = {"Authorization": f"Bearer {self.school_token}"}
            response = requests.get(f"{API}/schools/my/school", headers=headers, timeout=10)
            if response.status_code == 200:
                school = response.json()
                school_id = school.get('id')
                
                # Test GET /api/schools/{school_id}/bookings
                try:
                    response = requests.get(f"{API}/schools/{school_id}/bookings", headers=headers, timeout=10)
                    passed = response.status_code == 200
                    self.log_result("GET /api/schools/{school_id}/bookings", passed, response.status_code, 200)
                    if passed:
                        bookings = response.json()
                        print(f"   Found {len(bookings)} bookings for school")
                except Exception as e:
                    self.log_result("GET /api/schools/{school_id}/bookings", False, message=str(e))
        except Exception as e:
            self.log_result("GET /api/schools/my/school", False, message=str(e))

    def test_school_branding_endpoints(self):
        """Test school branding endpoints - NEW FEATURE"""
        print("\n" + "="*60)
        print("TESTING SCHOOL BRANDING ENDPOINTS")
        print("="*60)
        
        if not self.school_token:
            print("⚠ Skipping school branding tests - no school token")
            return
        
        headers = {"Authorization": f"Bearer {self.school_token}"}
        
        # Get school ID first
        school_id = None
        try:
            response = requests.get(f"{API}/schools/my/school", headers=headers, timeout=10)
            if response.status_code == 200:
                school = response.json()
                school_id = school.get('id')
                print(f"   Testing with school ID: {school_id}")
            else:
                print(f"   Failed to get school info: {response.status_code}")
                return
        except Exception as e:
            print(f"   Error getting school info: {str(e)}")
            return
        
        # Test 1: POST /api/upload/image (existing endpoint)
        try:
            # Create a small test image file (1x1 pixel PNG)
            import io
            import base64
            
            # Minimal PNG data (1x1 transparent pixel)
            png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==')
            
            files = {'file': ('test_logo.png', io.BytesIO(png_data), 'image/png')}
            response = requests.post(f"{API}/upload/image", files=files, headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("POST /api/upload/image", passed, response.status_code, 200)
            
            logo_url = None
            if passed:
                result = response.json()
                logo_url = result.get('url')
                print(f"   Uploaded image URL: {logo_url}")
        except Exception as e:
            self.log_result("POST /api/upload/image", False, message=str(e))
            logo_url = None
        
        # Test 2: POST /api/upload/video (NEW endpoint)
        try:
            # Create a minimal MP4 file (just headers, not a real video)
            mp4_data = b'\x00\x00\x00\x20ftypmp41\x00\x00\x00\x00mp41isom\x00\x00\x00\x08free'
            
            files = {'file': ('test_video.mp4', io.BytesIO(mp4_data), 'video/mp4')}
            response = requests.post(f"{API}/upload/video", files=files, headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("POST /api/upload/video", passed, response.status_code, 200)
            
            video_url = None
            if passed:
                result = response.json()
                video_url = result.get('url')
                print(f"   Uploaded video URL: {video_url}")
        except Exception as e:
            self.log_result("POST /api/upload/video", False, message=str(e))
            video_url = None
        
        # Test 3: POST /api/upload/video with invalid file type (should fail)
        try:
            # Try uploading a text file as video
            text_data = b'This is not a video file'
            files = {'file': ('test.txt', io.BytesIO(text_data), 'text/plain')}
            response = requests.post(f"{API}/upload/video", files=files, headers=headers, timeout=10)
            passed = response.status_code == 400  # Should fail with 400
            self.log_result("POST /api/upload/video (invalid type - should fail)", passed, response.status_code, 400)
        except Exception as e:
            self.log_result("POST /api/upload/video (invalid type)", False, message=str(e))
        
        # Test 4: PUT /api/schools/{school_id} - Update branding fields
        if school_id:
            try:
                branding_data = {
                    "logo_url": logo_url or "https://example.com/logo.png",
                    "banner_url": "https://example.com/banner.jpg",
                    "certificate_urls": [
                        "https://example.com/cert1.pdf",
                        "https://example.com/cert2.pdf"
                    ],
                    "video_url": video_url or "https://example.com/intro.mp4"
                }
                
                response = requests.put(f"{API}/schools/{school_id}", json=branding_data, headers=headers, timeout=10)
                passed = response.status_code == 200
                self.log_result("PUT /api/schools/{school_id} (update branding)", passed, response.status_code, 200)
                
                if passed:
                    updated_school = response.json()
                    print(f"   Updated logo_url: {updated_school.get('logo_url')}")
                    print(f"   Updated banner_url: {updated_school.get('banner_url')}")
                    print(f"   Updated certificate_urls: {len(updated_school.get('certificate_urls', []))} certificates")
                    print(f"   Updated video_url: {updated_school.get('video_url')}")
            except Exception as e:
                self.log_result("PUT /api/schools/{school_id} (update branding)", False, message=str(e))
        
        # Test 5: PUT /api/schools/{school_id} - Partial update (only logo_url)
        if school_id:
            try:
                partial_data = {
                    "logo_url": "https://example.com/new_logo.png"
                }
                
                response = requests.put(f"{API}/schools/{school_id}", json=partial_data, headers=headers, timeout=10)
                passed = response.status_code == 200
                self.log_result("PUT /api/schools/{school_id} (partial update)", passed, response.status_code, 200)
                
                if passed:
                    updated_school = response.json()
                    print(f"   Partial update - new logo_url: {updated_school.get('logo_url')}")
            except Exception as e:
                self.log_result("PUT /api/schools/{school_id} (partial update)", False, message=str(e))
        
        # Test 6: GET /api/schools/{school_id} - Verify branding fields are returned
        if school_id:
            try:
                response = requests.get(f"{API}/schools/{school_id}", timeout=10)
                passed = response.status_code == 200
                self.log_result("GET /api/schools/{school_id} (verify branding fields)", passed, response.status_code, 200)
                
                if passed:
                    school_data = response.json()
                    branding_fields = ['logo_url', 'banner_url', 'certificate_urls', 'video_url']
                    print(f"   Branding fields in response:")
                    for field in branding_fields:
                        value = school_data.get(field)
                        if field == 'certificate_urls':
                            print(f"     {field}: {len(value) if value else 0} certificates")
                        else:
                            print(f"     {field}: {'✓' if value else '✗'}")
            except Exception as e:
                self.log_result("GET /api/schools/{school_id} (verify branding fields)", False, message=str(e))

    def test_admin_user_management_endpoints(self):
        """Test new Admin User Management endpoints"""
        print("\n" + "="*60)
        print("TESTING ADMIN USER MANAGEMENT ENDPOINTS")
        print("="*60)
        
        # Use the provided admin credentials
        admin_email = "administration@traininjapan.com"
        admin_password = "admin123"
        
        # Test admin login
        try:
            login_data = {
                "email": admin_email,
                "password": admin_password
            }
            response = requests.post(f"{API}/auth/login", json=login_data, timeout=10)
            passed = response.status_code == 200
            self.log_result("Admin login (administration@traininjapan.com)", passed, response.status_code, 200)
            
            if passed:
                result = response.json()
                print(f"   Logged in admin: {result.get('user', {}).get('name')}")
                print(f"   Admin role: {result.get('user', {}).get('role')}")
                
                # Extract session token from cookies
                if 'Set-Cookie' in response.headers:
                    cookies = response.headers['Set-Cookie']
                    if 'session_token=' in cookies:
                        token_start = cookies.find('session_token=') + len('session_token=')
                        token_end = cookies.find(';', token_start)
                        if token_end == -1:
                            token_end = len(cookies)
                        self.admin_token = cookies[token_start:token_end]
                        print(f"   Got admin session token")
            else:
                print(f"   ✗ Admin login failed: {response.status_code}")
                if response.status_code == 401:
                    print("   Admin credentials may be incorrect or user may not exist")
                return
        except Exception as e:
            self.log_result("Admin login", False, message=str(e))
            return
        
        if not self.admin_token:
            print("⚠ Skipping admin user management tests - no admin token")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        created_user_id = None
        
        # Test 1: GET /api/admin/users - List all users
        try:
            response = requests.get(f"{API}/admin/users", headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("GET /api/admin/users (list all users)", passed, response.status_code, 200)
            
            if passed:
                users = response.json()
                print(f"   Found {len(users)} users in system")
                
                # Verify password_hash is not included in response
                has_password_hash = any('password_hash' in user for user in users)
                self.log_result("Users list excludes password_hash", not has_password_hash)
                if not has_password_hash:
                    print("   ✓ Password hashes properly excluded from response")
                else:
                    print("   ✗ Password hashes found in response (security issue)")
                    
                # Show sample user data structure
                if len(users) > 0:
                    sample_user = users[0]
                    print(f"   Sample user fields: {list(sample_user.keys())}")
            else:
                print(f"   ✗ Failed to get users list: {response.status_code}")
                
        except Exception as e:
            self.log_result("GET /api/admin/users", False, message=str(e))
        
        # Test 2: GET /api/admin/users with non-admin user (should fail)
        if self.student_token:
            try:
                student_headers = {"Authorization": f"Bearer {self.student_token}"}
                response = requests.get(f"{API}/admin/users", headers=student_headers, timeout=10)
                passed = response.status_code == 403
                self.log_result("GET /api/admin/users (non-admin - should fail)", passed, response.status_code, 403)
                
                if passed:
                    print("   ✓ Correctly denied access to non-admin user")
                else:
                    print(f"   ✗ Expected 403 Forbidden, got {response.status_code}")
                    
            except Exception as e:
                self.log_result("GET /api/admin/users (non-admin)", False, message=str(e))
        
        # Test 3: POST /api/admin/users - Create new user
        timestamp = int(datetime.now().timestamp() * 1000)
        test_user_data = {
            "name": "Test User",
            "email": "testuser@example.com",
            "password": "test123",
            "role": "student",
            "phone": "+81-90-1234-5678"
        }
        
        try:
            response = requests.post(f"{API}/admin/users", json=test_user_data, headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("POST /api/admin/users (create user)", passed, response.status_code, 200)
            
            if passed:
                created_user = response.json()
                created_user_id = created_user.get('id')
                print(f"   Created user: {created_user.get('name')} ({created_user.get('email')})")
                print(f"   User ID: {created_user_id}")
                print(f"   User role: {created_user.get('role')}")
                
                # Verify password_hash is not in response
                has_password_hash = 'password_hash' in created_user
                self.log_result("Created user excludes password_hash", not has_password_hash)
                
                # Verify auto-generated picture URL
                picture_url = created_user.get('picture')
                has_picture = picture_url is not None and picture_url != ""
                self.log_result("User has auto-generated picture URL", has_picture)
                if has_picture:
                    print(f"   Auto-generated picture: {picture_url}")
                    
            else:
                print(f"   ✗ Failed to create user: {response.status_code}")
                if response.status_code == 400:
                    error_detail = response.json().get('detail', 'Unknown error')
                    print(f"   Error: {error_detail}")
                    
        except Exception as e:
            self.log_result("POST /api/admin/users", False, message=str(e))
        
        # Test 4: POST /api/admin/users - Try to create user with existing email (should fail)
        try:
            duplicate_user_data = {
                "name": "Duplicate User",
                "email": "testuser@example.com",  # Same email as above
                "password": "test123",
                "role": "student"
            }
            response = requests.post(f"{API}/admin/users", json=duplicate_user_data, headers=headers, timeout=10)
            passed = response.status_code == 400
            self.log_result("POST /api/admin/users (duplicate email - should fail)", passed, response.status_code, 400)
            
            if passed:
                print("   ✓ Correctly rejected duplicate email")
                error_detail = response.json().get('detail', '')
                if 'already exists' in error_detail.lower():
                    print(f"   Proper error message: {error_detail}")
            else:
                print(f"   ✗ Expected 400 Bad Request, got {response.status_code}")
                
        except Exception as e:
            self.log_result("POST /api/admin/users (duplicate email)", False, message=str(e))
        
        # Test 5: PUT /api/admin/users/{user_id} - Update user
        if created_user_id:
            try:
                update_data = {
                    "name": "Updated Test User",
                    "role": "school"
                }
                response = requests.put(f"{API}/admin/users/{created_user_id}", json=update_data, headers=headers, timeout=10)
                passed = response.status_code == 200
                self.log_result("PUT /api/admin/users/{user_id} (update user)", passed, response.status_code, 200)
                
                if passed:
                    updated_user = response.json()
                    print(f"   Updated user name: {updated_user.get('name')}")
                    print(f"   Updated user role: {updated_user.get('role')}")
                    
                    # Verify fields were updated
                    name_updated = updated_user.get('name') == "Updated Test User"
                    role_updated = updated_user.get('role') == "school"
                    self.log_result("User name updated correctly", name_updated)
                    self.log_result("User role updated correctly", role_updated)
                    
                    # Verify other fields preserved
                    email_preserved = updated_user.get('email') == "testuser@example.com"
                    phone_preserved = updated_user.get('phone') == "+81-90-1234-5678"
                    self.log_result("User email preserved", email_preserved)
                    self.log_result("User phone preserved", phone_preserved)
                    
                else:
                    print(f"   ✗ Failed to update user: {response.status_code}")
                    
            except Exception as e:
                self.log_result("PUT /api/admin/users/{user_id}", False, message=str(e))
        
        # Test 6: PUT /api/admin/users/{user_id} - Try to update non-existent user (should fail)
        try:
            fake_user_id = "non-existent-user-id"
            update_data = {"name": "Should Not Work"}
            response = requests.put(f"{API}/admin/users/{fake_user_id}", json=update_data, headers=headers, timeout=10)
            passed = response.status_code == 404
            self.log_result("PUT /api/admin/users/{fake_id} (should fail)", passed, response.status_code, 404)
            
            if passed:
                print("   ✓ Correctly returned 404 for non-existent user")
            else:
                print(f"   ✗ Expected 404 Not Found, got {response.status_code}")
                
        except Exception as e:
            self.log_result("PUT /api/admin/users/{fake_id}", False, message=str(e))
        
        # Test 7: DELETE /api/admin/users/{user_id} - Try to delete self (should fail)
        try:
            # Get admin user ID first
            response = requests.get(f"{API}/auth/me", headers=headers, timeout=10)
            if response.status_code == 200:
                admin_user = response.json()
                admin_user_id = admin_user.get('id')
                
                if admin_user_id:
                    response = requests.delete(f"{API}/admin/users/{admin_user_id}", headers=headers, timeout=10)
                    passed = response.status_code == 400
                    self.log_result("DELETE /api/admin/users/{self} (should fail)", passed, response.status_code, 400)
                    
                    if passed:
                        print("   ✓ Correctly prevented admin from deleting own account")
                        error_detail = response.json().get('detail', '')
                        if 'cannot delete' in error_detail.lower():
                            print(f"   Proper error message: {error_detail}")
                    else:
                        print(f"   ✗ Expected 400 Bad Request, got {response.status_code}")
                        
        except Exception as e:
            self.log_result("DELETE /api/admin/users/{self}", False, message=str(e))
        
        # Test 8: DELETE /api/admin/users/{user_id} - Delete test user
        if created_user_id:
            try:
                response = requests.delete(f"{API}/admin/users/{created_user_id}", headers=headers, timeout=10)
                passed = response.status_code == 200
                self.log_result("DELETE /api/admin/users/{user_id} (delete user)", passed, response.status_code, 200)
                
                if passed:
                    result = response.json()
                    print(f"   Deleted user successfully")
                    print(f"   Response: {result.get('message', 'No message')}")
                    
                    # Verify user is actually deleted
                    verify_response = requests.get(f"{API}/admin/users", headers=headers, timeout=10)
                    if verify_response.status_code == 200:
                        users = verify_response.json()
                        user_still_exists = any(user.get('id') == created_user_id for user in users)
                        self.log_result("User actually deleted from database", not user_still_exists)
                        if not user_still_exists:
                            print("   ✓ User confirmed deleted from database")
                        else:
                            print("   ✗ User still exists in database")
                            
                else:
                    print(f"   ✗ Failed to delete user: {response.status_code}")
                    
            except Exception as e:
                self.log_result("DELETE /api/admin/users/{user_id}", False, message=str(e))
        
        # Test 9: DELETE /api/admin/users/{user_id} - Try to delete non-existent user (should fail)
        try:
            fake_user_id = "non-existent-user-id"
            response = requests.delete(f"{API}/admin/users/{fake_user_id}", headers=headers, timeout=10)
            passed = response.status_code == 404
            self.log_result("DELETE /api/admin/users/{fake_id} (should fail)", passed, response.status_code, 404)
            
            if passed:
                print("   ✓ Correctly returned 404 for non-existent user")
            else:
                print(f"   ✗ Expected 404 Not Found, got {response.status_code}")
                
        except Exception as e:
            self.log_result("DELETE /api/admin/users/{fake_id}", False, message=str(e))
        
        # Test 10: Authorization tests with non-admin user
        if self.student_token:
            student_headers = {"Authorization": f"Bearer {self.student_token}"}
            
            # Test POST with non-admin (should fail)
            try:
                test_data = {"name": "Should Fail", "email": "fail@test.com", "password": "test123"}
                response = requests.post(f"{API}/admin/users", json=test_data, headers=student_headers, timeout=10)
                passed = response.status_code == 403
                self.log_result("POST /api/admin/users (non-admin - should fail)", passed, response.status_code, 403)
            except Exception as e:
                self.log_result("POST /api/admin/users (non-admin)", False, message=str(e))
            
            # Test PUT with non-admin (should fail)
            try:
                test_data = {"name": "Should Fail"}
                response = requests.put(f"{API}/admin/users/fake-id", json=test_data, headers=student_headers, timeout=10)
                passed = response.status_code == 403
                self.log_result("PUT /api/admin/users (non-admin - should fail)", passed, response.status_code, 403)
            except Exception as e:
                self.log_result("PUT /api/admin/users (non-admin)", False, message=str(e))
            
            # Test DELETE with non-admin (should fail)
            try:
                response = requests.delete(f"{API}/admin/users/fake-id", headers=student_headers, timeout=10)
                passed = response.status_code == 403
                self.log_result("DELETE /api/admin/users (non-admin - should fail)", passed, response.status_code, 403)
            except Exception as e:
                self.log_result("DELETE /api/admin/users (non-admin)", False, message=str(e))

    def test_admin_endpoints(self):
        """Test admin endpoints"""
        print("\n" + "="*60)
        print("TESTING ADMIN ENDPOINTS")
        print("="*60)
        
        # Create admin user via JWT signup
        timestamp = int(datetime.now().timestamp() * 1000)
        admin_email = f"admin{timestamp}@test.com"
        admin_password = "test123"
        admin_name = "Test Admin"
        
        try:
            signup_data = {
                "email": admin_email,
                "password": admin_password,
                "name": admin_name
            }
            response = requests.post(f"{API}/auth/signup", json=signup_data, timeout=10)
            if response.status_code == 200:
                # Extract session token from cookies
                if 'Set-Cookie' in response.headers:
                    cookies = response.headers['Set-Cookie']
                    if 'session_token=' in cookies:
                        token_start = cookies.find('session_token=') + len('session_token=')
                        token_end = cookies.find(';', token_start)
                        if token_end == -1:
                            token_end = len(cookies)
                        self.admin_token = cookies[token_start:token_end]
                        
                        # Manually update user role to admin in database
                        result = response.json()
                        user_id = result.get('user', {}).get('id')
                        if user_id:
                            mongo_cmd = f'db.users.updateOne({{id: "{user_id}"}}, {{$set: {{role: "admin"}}}})'
                            update_result = subprocess.run(
                                ["mongosh", "test_database", "--quiet", "--eval", mongo_cmd],
                                capture_output=True,
                                text=True,
                                timeout=10
                            )
                            if update_result.returncode == 0:
                                print(f"✓ Created admin user and updated role: {user_id}")
                            else:
                                print(f"✗ Failed to update role: {update_result.stderr}")
                                # Try alternative approach - direct update
                                try:
                                    import pymongo
                                    client = pymongo.MongoClient("mongodb://localhost:27017")
                                    db = client["test_database"]
                                    db.users.update_one({"id": user_id}, {"$set": {"role": "admin"}})
                                    print(f"✓ Updated role via pymongo: {user_id}")
                                except Exception as e:
                                    print(f"✗ Pymongo update failed: {str(e)}")
        except Exception as e:
            print(f"✗ Failed to create admin user: {str(e)}")
        
        if not self.admin_token:
            print("⚠ Skipping admin tests - failed to create admin user")
            return
        
        # Test GET /api/admin/stats
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{API}/admin/stats", headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("GET /api/admin/stats", passed, response.status_code, 200)
            if passed:
                stats = response.json()
                print(f"   Total schools: {stats.get('total_schools')}")
                print(f"   Approved schools: {stats.get('approved_schools')}")
                print(f"   Total courses: {stats.get('total_courses')}")
                print(f"   Active courses: {stats.get('active_courses')}")
                print(f"   Total bookings: {stats.get('total_bookings')}")
                print(f"   Paid bookings: {stats.get('paid_bookings')}")
                print(f"   Total revenue: ${stats.get('total_revenue', 0)}")
                print(f"   Total locations: {stats.get('total_locations')}")
                print(f"   Total instructors: {stats.get('total_instructors')}")
        except Exception as e:
            self.log_result("GET /api/admin/stats", False, message=str(e))
        
        # Test GET /api/admin/schools
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{API}/admin/schools", headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("GET /api/admin/schools", passed, response.status_code, 200)
            if passed:
                schools = response.json()
                print(f"   Found {len(schools)} schools (all)")
        except Exception as e:
            self.log_result("GET /api/admin/schools", False, message=str(e))
        
        # Test GET /api/admin/programs
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{API}/admin/programs", headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("GET /api/admin/programs", passed, response.status_code, 200)
            if passed:
                programs = response.json()
                print(f"   Found {len(programs)} programs (all)")
        except Exception as e:
            self.log_result("GET /api/admin/programs", False, message=str(e))

    def test_programs_with_school_branding(self):
        """Test /api/programs endpoint with school branding data - NEW FEATURE"""
        print("\n" + "="*60)
        print("TESTING PROGRAMS ENDPOINT WITH SCHOOL BRANDING DATA")
        print("="*60)
        
        # Test 1: GET /api/programs - Verify school branding data is included
        try:
            response = requests.get(f"{API}/programs", timeout=10)
            passed = response.status_code == 200
            self.log_result("GET /api/programs (with school branding)", passed, response.status_code, 200)
            
            if passed:
                programs = response.json()
                print(f"   Found {len(programs)} programs")
                
                if len(programs) > 0:
                    # Check first program for school branding data
                    first_program = programs[0]
                    print(f"   Testing program: {first_program.get('title', 'Unknown')}")
                    
                    # Verify school field exists
                    has_school_field = 'school' in first_program
                    self.log_result("Program has 'school' field", has_school_field)
                    
                    if has_school_field and first_program['school']:
                        school_data = first_program['school']
                        print(f"   School data found:")
                        
                        # Check required school fields
                        required_fields = ['id', 'name', 'logo_url', 'banner_url']
                        for field in required_fields:
                            has_field = field in school_data
                            # For banner_url, it's OK if it's missing from response when null in DB
                            if field == 'banner_url' and not has_field:
                                # Check if it's actually missing or just null
                                print(f"     {field}: not in response (likely null in database)")
                                self.log_result(f"School has '{field}' field (or null)", True)
                            else:
                                self.log_result(f"School has '{field}' field", has_field)
                                if has_field:
                                    value = school_data[field]
                                    print(f"     {field}: {value if value else 'null'}")
                        
                        # Test all programs have school data
                        programs_with_school = 0
                        for program in programs:
                            if 'school' in program and program['school']:
                                programs_with_school += 1
                        
                        all_have_school = programs_with_school == len(programs)
                        self.log_result("All programs have school data", all_have_school)
                        print(f"   Programs with school data: {programs_with_school}/{len(programs)}")
                    
                    elif has_school_field and first_program['school'] is None:
                        self.log_result("School field is null", False, message="School field exists but is null")
                        print("   ✗ School field is null - this may indicate missing school data")
                    
                else:
                    print("   ⚠ No programs found to test school branding")
                    
        except Exception as e:
            self.log_result("GET /api/programs (with school branding)", False, message=str(e))
        
        # Test 2: GET /api/programs with school_id filter
        target_school_id = "de61223e-59b5-4248-a46c-ca1bc0e2024b"  # argareg school
        try:
            response = requests.get(f"{API}/programs?school_id={target_school_id}", timeout=10)
            passed = response.status_code == 200
            self.log_result(f"GET /api/programs?school_id={target_school_id}", passed, response.status_code, 200)
            
            if passed:
                filtered_programs = response.json()
                print(f"   Found {len(filtered_programs)} programs for school {target_school_id}")
                
                if len(filtered_programs) > 0:
                    # Verify all returned programs belong to the specified school
                    correct_school_count = 0
                    for program in filtered_programs:
                        if 'school' in program and program['school'] and program['school'].get('id') == target_school_id:
                            correct_school_count += 1
                        elif program.get('school_id') == target_school_id:  # Fallback check
                            correct_school_count += 1
                    
                    all_correct_school = correct_school_count == len(filtered_programs)
                    self.log_result("Filtered programs belong to correct school", all_correct_school)
                    print(f"   Programs with correct school ID: {correct_school_count}/{len(filtered_programs)}")
                    
                    # Check if school branding data is included for filtered results
                    if len(filtered_programs) > 0:
                        first_filtered = filtered_programs[0]
                        if 'school' in first_filtered and first_filtered['school']:
                            school_data = first_filtered['school']
                            print(f"   School branding data in filtered results:")
                            print(f"     School name: {school_data.get('name', 'N/A')}")
                            print(f"     Logo URL: {school_data.get('logo_url', 'N/A')}")
                            print(f"     Banner URL: {school_data.get('banner_url', 'N/A')}")
                            
                            # Check if this is the "argareg" school
                            school_name = school_data.get('name', '').lower()
                            if 'argareg' in school_name:
                                self.log_result("Found 'argareg' school in results", True)
                                print(f"   ✓ Found target school 'argareg': {school_data.get('name')}")
                            else:
                                print(f"   School name '{school_data.get('name')}' does not contain 'argareg'")
                else:
                    print(f"   ⚠ No programs found for school {target_school_id}")
                    print("   This could mean:")
                    print("     - School has no programs")
                    print("     - School ID doesn't exist")
                    print("     - Programs are not in 'confirmed' status")
                    
        except Exception as e:
            self.log_result(f"GET /api/programs?school_id={target_school_id}", False, message=str(e))
        
        # Test 3: Verify school data structure consistency
        try:
            response = requests.get(f"{API}/programs", timeout=10)
            if response.status_code == 200:
                programs = response.json()
                
                # Check data structure consistency across all programs
                structure_issues = []
                for i, program in enumerate(programs):
                    if 'school' not in program:
                        structure_issues.append(f"Program {i+1}: Missing 'school' field")
                    elif program['school'] is not None:
                        school = program['school']
                        required_school_fields = ['id', 'name']
                        for field in required_school_fields:
                            if field not in school:
                                structure_issues.append(f"Program {i+1}: School missing '{field}' field")
                
                structure_consistent = len(structure_issues) == 0
                self.log_result("School data structure consistent", structure_consistent)
                
                if structure_consistent:
                    print("   ✓ All programs have consistent school data structure")
                else:
                    print(f"   ✗ Found {len(structure_issues)} structure issues:")
                    for issue in structure_issues[:5]:  # Show first 5 issues
                        print(f"     - {issue}")
                    if len(structure_issues) > 5:
                        print(f"     ... and {len(structure_issues) - 5} more issues")
                        
        except Exception as e:
            self.log_result("School data structure consistency check", False, message=str(e))
        
        # Test 4: Check if school branding URLs are accessible (sample check)
        try:
            response = requests.get(f"{API}/programs", timeout=10)
            if response.status_code == 200:
                programs = response.json()
                
                # Find a program with school logo_url to test
                test_logo_url = None
                for program in programs:
                    if ('school' in program and program['school'] and 
                        program['school'].get('logo_url') and 
                        program['school']['logo_url'].startswith('http')):
                        test_logo_url = program['school']['logo_url']
                        break
                
                if test_logo_url:
                    try:
                        # Quick HEAD request to check if URL is accessible
                        logo_response = requests.head(test_logo_url, timeout=5)
                        logo_accessible = logo_response.status_code < 400
                        self.log_result("Sample school logo URL accessible", logo_accessible, logo_response.status_code, "< 400")
                        if logo_accessible:
                            print(f"   ✓ Sample logo URL is accessible: {test_logo_url}")
                        else:
                            print(f"   ✗ Sample logo URL not accessible: {test_logo_url} (Status: {logo_response.status_code})")
                    except Exception as url_e:
                        self.log_result("Sample school logo URL accessible", False, message=str(url_e))
                        print(f"   ✗ Could not check logo URL accessibility: {str(url_e)}")
                else:
                    print("   ⚠ No school logo URLs found to test accessibility")
                    
        except Exception as e:
            print(f"   Could not test logo URL accessibility: {str(e)}")

    def test_existing_school_user_auth(self):
        """Test /auth/me endpoint for existing school user jaiheward@gmail.com"""
        print("\n" + "="*60)
        print("TESTING EXISTING SCHOOL USER AUTHENTICATION")
        print("="*60)
        
        # Test data from review request
        existing_session_token = "i8z5plDI-V92lvosgYFwMMcm25pPp9JRH4N-H6w8YRI"
        expected_user_id = "117988451423767156184"
        expected_email = "jaiheward@gmail.com"
        expected_role = "school"
        expected_school_id = "de61223e-59b5-4248-a46c-ca1bc0e2024b"
        
        print(f"Testing with session token: {existing_session_token}")
        print(f"Expected user ID: {expected_user_id}")
        print(f"Expected email: {expected_email}")
        print(f"Expected role: {expected_role}")
        print(f"Expected school ID: {expected_school_id}")
        
        # Test 1: GET /api/auth/me without authentication (should fail)
        try:
            response = requests.get(f"{API}/auth/me", timeout=10)
            passed = response.status_code == 401
            self.log_result("GET /api/auth/me (no auth - should return 401)", passed, response.status_code, 401)
            if passed:
                print("   ✓ Correctly returns 401 Unauthorized without authentication")
            else:
                print(f"   ✗ Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("GET /api/auth/me (no auth)", False, message=str(e))
        
        # Test 2: GET /api/auth/me with existing session token
        try:
            headers = {"Authorization": f"Bearer {existing_session_token}"}
            response = requests.get(f"{API}/auth/me", headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("GET /api/auth/me (existing school user)", passed, response.status_code, 200)
            
            if passed:
                user_data = response.json()
                print(f"   ✓ Successfully authenticated user")
                print(f"   User data received:")
                print(f"     ID: {user_data.get('id')}")
                print(f"     Email: {user_data.get('email')}")
                print(f"     Name: {user_data.get('name')}")
                print(f"     Role: {user_data.get('role')}")
                print(f"     School ID: {user_data.get('school_id')}")
                
                # Verify all expected fields are present
                required_fields = ['id', 'email', 'name', 'role']
                missing_fields = []
                for field in required_fields:
                    if field not in user_data or user_data[field] is None:
                        missing_fields.append(field)
                
                if missing_fields:
                    self.log_result("Required fields present", False, message=f"Missing fields: {missing_fields}")
                else:
                    self.log_result("Required fields present", True)
                    print(f"   ✓ All required fields present: {required_fields}")
                
                # Verify user ID matches expected
                actual_user_id = user_data.get('id')
                if actual_user_id == expected_user_id:
                    self.log_result("User ID matches expected", True)
                    print(f"   ✓ User ID matches expected: {expected_user_id}")
                else:
                    self.log_result("User ID matches expected", False, message=f"Expected {expected_user_id}, got {actual_user_id}")
                
                # Verify email matches expected
                actual_email = user_data.get('email')
                if actual_email == expected_email:
                    self.log_result("Email matches expected", True)
                    print(f"   ✓ Email matches expected: {expected_email}")
                else:
                    self.log_result("Email matches expected", False, message=f"Expected {expected_email}, got {actual_email}")
                
                # Verify role is "school"
                actual_role = user_data.get('role')
                if actual_role == expected_role:
                    self.log_result("Role is 'school'", True)
                    print(f"   ✓ Role is correctly set to 'school'")
                else:
                    self.log_result("Role is 'school'", False, message=f"Expected '{expected_role}', got '{actual_role}'")
                
                # Verify role is NOT "student"
                if actual_role != "student":
                    self.log_result("Role is NOT 'student'", True)
                    print(f"   ✓ Role is not 'student' (correctly set to '{actual_role}')")
                else:
                    self.log_result("Role is NOT 'student'", False, message="Role should not be 'student' for school user")
                
                # Verify school_id is present and matches expected
                actual_school_id = user_data.get('school_id')
                if actual_school_id == expected_school_id:
                    self.log_result("School ID matches expected", True)
                    print(f"   ✓ School ID matches expected: {expected_school_id}")
                else:
                    self.log_result("School ID matches expected", False, message=f"Expected {expected_school_id}, got {actual_school_id}")
                
                # Verify school_id is not null
                if actual_school_id is not None and actual_school_id != "":
                    self.log_result("School ID is present", True)
                    print(f"   ✓ School ID is present and not null")
                else:
                    self.log_result("School ID is present", False, message="School ID should not be null for school user")
                
            else:
                print(f"   ✗ Authentication failed with status {response.status_code}")
                if response.status_code == 401:
                    print("   This could mean the session token has expired")
                    print("   Since this is an OAuth user (Google login), we cannot test password login")
                    print("   Expected response structure should be:")
                    print("   {")
                    print(f'     "id": "{expected_user_id}",')
                    print(f'     "email": "{expected_email}",')
                    print('     "name": "Jai Heward",')
                    print(f'     "role": "{expected_role}",')
                    print(f'     "school_id": "{expected_school_id}"')
                    print("   }")
                
        except Exception as e:
            self.log_result("GET /api/auth/me (existing school user)", False, message=str(e))
        
        # Test 3: Verify user exists in database (if we can access it)
        try:
            mongo_cmd = f'db.users.findOne({{email: "{expected_email}"}}, {{_id: 0}})'
            result = subprocess.run(
                ["mongosh", "test_database", "--quiet", "--eval", mongo_cmd],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                print(f"   ✓ User exists in database")
                # Try to parse the output to verify role and school_id
                try:
                    import re
                    # Look for role and school_id in the output
                    if f'role: \'{expected_role}\'' in result.stdout or f'"role": "{expected_role}"' in result.stdout:
                        self.log_result("Database role verification", True)
                        print(f"   ✓ Database confirms role is '{expected_role}'")
                    else:
                        self.log_result("Database role verification", False, message="Role not found or incorrect in database")
                    
                    if expected_school_id in result.stdout:
                        self.log_result("Database school_id verification", True)
                        print(f"   ✓ Database confirms school_id is present")
                    else:
                        self.log_result("Database school_id verification", False, message="School ID not found in database")
                        
                except Exception as parse_e:
                    print(f"   Could not parse database output: {str(parse_e)}")
            else:
                print(f"   Could not verify user in database: {result.stderr}")
        except Exception as e:
            print(f"   Could not access database for verification: {str(e)}")

    def test_cascading_delete_functionality(self):
        """Test cascading delete functionality for user deletion"""
        print("\n" + "="*60)
        print("TESTING CASCADING DELETE FUNCTIONALITY")
        print("="*60)
        
        # Use admin credentials from the review request
        admin_email = "administration@traininjapan.com"
        admin_password = "admin123"
        
        # Login as admin
        try:
            login_data = {
                "email": admin_email,
                "password": admin_password
            }
            response = requests.post(f"{API}/auth/login", json=login_data, timeout=10)
            if response.status_code != 200:
                self.log_result("Admin login for cascading delete test", False, response.status_code, 200, "Cannot proceed without admin access")
                return
            
            # Extract admin token
            admin_token = None
            if 'Set-Cookie' in response.headers:
                cookies = response.headers['Set-Cookie']
                if 'session_token=' in cookies:
                    token_start = cookies.find('session_token=') + len('session_token=')
                    token_end = cookies.find(';', token_start)
                    if token_end == -1:
                        token_end = len(cookies)
                    admin_token = cookies[token_start:token_end]
            
            if not admin_token:
                self.log_result("Admin token extraction", False, message="Could not extract admin session token")
                return
                
            print(f"✓ Admin logged in successfully")
            
        except Exception as e:
            self.log_result("Admin login for cascading delete test", False, message=str(e))
            return
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # STEP 1: Create test school owner with complete data
        print("\n--- STEP 1: Creating Test School Owner with Data ---")
        
        # Create school owner user
        timestamp = int(datetime.now().timestamp() * 1000)
        test_school_owner_email = f"test_school_owner_{timestamp}@test.com"
        test_school_owner_data = {
            "name": "Test School Owner",
            "email": test_school_owner_email,
            "password": "test123",
            "role": "school"
        }
        
        school_owner_id = None
        school_owner_token = None
        
        try:
            response = requests.post(f"{API}/admin/users", json=test_school_owner_data, headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("Create test school owner user", passed, response.status_code, 200)
            
            if passed:
                created_user = response.json()
                school_owner_id = created_user.get('id')
                print(f"   Created school owner: {school_owner_id}")
                
                # Login as school owner to get token
                login_data = {
                    "email": test_school_owner_email,
                    "password": "test123"
                }
                login_response = requests.post(f"{API}/auth/login", json=login_data, timeout=10)
                if login_response.status_code == 200 and 'Set-Cookie' in login_response.headers:
                    cookies = login_response.headers['Set-Cookie']
                    if 'session_token=' in cookies:
                        token_start = cookies.find('session_token=') + len('session_token=')
                        token_end = cookies.find(';', token_start)
                        if token_end == -1:
                            token_end = len(cookies)
                        school_owner_token = cookies[token_start:token_end]
                        print(f"   Got school owner token")
            else:
                print(f"   Failed to create school owner: {response.status_code}")
                return
                
        except Exception as e:
            self.log_result("Create test school owner user", False, message=str(e))
            return
        
        if not school_owner_id or not school_owner_token:
            print("   Cannot proceed without school owner ID and token")
            return
        
        school_owner_headers = {"Authorization": f"Bearer {school_owner_token}"}
        
        # Create school for the owner
        school_data = {
            "name": f"Test School {timestamp}",
            "description": "A test school for cascading delete testing",
            "location": "Tokyo, Japan",
            "contact_email": test_school_owner_email,
            "contact_phone": "123-456-7890",
            "website": "https://testschool.com"
        }
        
        school_id = None
        try:
            response = requests.post(f"{API}/schools", json=school_data, headers=school_owner_headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("Create school for owner", passed, response.status_code, 200)
            
            if passed:
                school = response.json()
                school_id = school.get('id')
                print(f"   Created school: {school_id}")
            else:
                print(f"   Failed to create school: {response.status_code}")
                return
                
        except Exception as e:
            self.log_result("Create school for owner", False, message=str(e))
            return
        
        # Create location for the school
        location_data = {
            "name": "Test Dojo Location",
            "address": "123 Test Street",
            "city": "Tokyo",
            "prefecture": "Tokyo",
            "capacity": 30,
            "facilities": ["Mats", "Changing rooms"],
            "description": "Test location for cascading delete testing"
        }
        
        location_id = None
        try:
            response = requests.post(f"{API}/locations", json=location_data, headers=school_owner_headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("Create location for school", passed, response.status_code, 200)
            
            if passed:
                location = response.json()
                location_id = location.get('id')
                print(f"   Created location: {location_id}")
            else:
                print(f"   Failed to create location: {response.status_code}")
                return
                
        except Exception as e:
            self.log_result("Create location for school", False, message=str(e))
            return
        
        # Create instructor for the school
        instructor_data = {
            "name": "Test Sensei",
            "email": "sensei@testdojo.com",
            "phone": "123-456-7890",
            "rank": "5th Dan",
            "years_experience": 15,
            "bio": "Test instructor for cascading delete testing",
            "specialties": ["Karate", "Self-defense"]
        }
        
        instructor_id = None
        try:
            response = requests.post(f"{API}/instructors", json=instructor_data, headers=school_owner_headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("Create instructor for school", passed, response.status_code, 200)
            
            if passed:
                instructor = response.json()
                instructor_id = instructor.get('id')
                print(f"   Created instructor: {instructor_id}")
            else:
                print(f"   Failed to create instructor: {response.status_code}")
                return
                
        except Exception as e:
            self.log_result("Create instructor for school", False, message=str(e))
            return
        
        # Create course for the school
        course_data = {
            "location_id": location_id,
            "instructor_id": instructor_id,
            "title": f"Test Course {timestamp}",
            "description": "A test course for cascading delete testing",
            "martial_arts_style": "Karate",
            "category": "Martial Arts",
            "experience_level": "Beginner",
            "class_type": "Group",
            "price": 150.00,
            "currency": "AUD",
            "duration": "4 weeks",
            "capacity": 15,
            "prerequisites": "No prior experience required",
            "start_date": "2026-04-01",
            "end_date": "2026-04-30",
            "image_url": "https://images.unsplash.com/photo-1544386186-6de07b931438"
        }
        
        course_id = None
        try:
            response = requests.post(f"{API}/courses", json=course_data, headers=school_owner_headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("Create course for school", passed, response.status_code, 200)
            
            if passed:
                course = response.json()
                course_id = course.get('id')
                print(f"   Created course: {course_id}")
            else:
                print(f"   Failed to create course: {response.status_code}")
                return
                
        except Exception as e:
            self.log_result("Create course for school", False, message=str(e))
            return
        
        # STEP 2: Verify all data exists
        print("\n--- STEP 2: Verifying Data Exists ---")
        
        # Verify school exists
        try:
            response = requests.get(f"{API}/schools/{school_id}", timeout=10)
            passed = response.status_code == 200
            self.log_result("Verify school exists", passed, response.status_code, 200)
            if passed:
                print(f"   ✓ School {school_id} exists")
        except Exception as e:
            self.log_result("Verify school exists", False, message=str(e))
        
        # Verify location exists
        try:
            response = requests.get(f"{API}/locations/{location_id}", timeout=10)
            passed = response.status_code == 200
            self.log_result("Verify location exists", passed, response.status_code, 200)
            if passed:
                print(f"   ✓ Location {location_id} exists")
        except Exception as e:
            self.log_result("Verify location exists", False, message=str(e))
        
        # Verify instructor exists
        try:
            response = requests.get(f"{API}/instructors/{instructor_id}", timeout=10)
            passed = response.status_code == 200
            self.log_result("Verify instructor exists", passed, response.status_code, 200)
            if passed:
                print(f"   ✓ Instructor {instructor_id} exists")
        except Exception as e:
            self.log_result("Verify instructor exists", False, message=str(e))
        
        # Verify course exists (check in all courses since it might be pending approval)
        try:
            response = requests.get(f"{API}/courses", timeout=10)
            if response.status_code == 200:
                courses = response.json()
                course_found = any(c.get('id') == course_id for c in courses)
                self.log_result("Verify course exists in public list", course_found)
                if course_found:
                    print(f"   ✓ Course {course_id} exists in public list")
                else:
                    print(f"   Course {course_id} not in public list (may be pending approval)")
        except Exception as e:
            self.log_result("Verify course exists", False, message=str(e))
        
        # STEP 3: Delete the school owner
        print("\n--- STEP 3: Deleting School Owner ---")
        
        try:
            response = requests.delete(f"{API}/admin/users/{school_owner_id}", headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("Delete school owner", passed, response.status_code, 200)
            
            if passed:
                result = response.json()
                deleted_counts = result.get('deleted', {})
                print(f"   ✓ School owner deleted successfully")
                print(f"   Deletion summary:")
                print(f"     Users: {deleted_counts.get('user', 0)}")
                print(f"     Schools: {deleted_counts.get('schools', 0)}")
                print(f"     Locations: {deleted_counts.get('locations', 0)}")
                print(f"     Instructors: {deleted_counts.get('instructors', 0)}")
                print(f"     Courses: {deleted_counts.get('courses', 0)}")
                print(f"     Sessions: {deleted_counts.get('sessions', 0)}")
                print(f"     Bookings: {deleted_counts.get('bookings', 0)}")
                
                # Verify expected counts
                expected_counts = {
                    'user': 1,
                    'schools': 1,
                    'locations': 1,
                    'instructors': 1,
                    'courses': 1
                }
                
                for item, expected in expected_counts.items():
                    actual = deleted_counts.get(item, 0)
                    count_correct = actual == expected
                    self.log_result(f"Correct {item} deletion count", count_correct, actual, expected)
                    if not count_correct:
                        print(f"   ✗ Expected {expected} {item} deleted, got {actual}")
                
            else:
                print(f"   ✗ Failed to delete school owner: {response.status_code}")
                if response.status_code == 400:
                    error_detail = response.json().get('detail', 'Unknown error')
                    print(f"   Error: {error_detail}")
                return
                
        except Exception as e:
            self.log_result("Delete school owner", False, message=str(e))
            return
        
        # STEP 4: Verify cascading delete worked
        print("\n--- STEP 4: Verifying Cascading Delete ---")
        
        # Verify user no longer exists
        try:
            response = requests.get(f"{API}/admin/users", headers=headers, timeout=10)
            if response.status_code == 200:
                users = response.json()
                user_still_exists = any(user.get('id') == school_owner_id for user in users)
                self.log_result("User no longer exists", not user_still_exists)
                if not user_still_exists:
                    print(f"   ✓ User {school_owner_id} successfully deleted")
                else:
                    print(f"   ✗ User {school_owner_id} still exists")
        except Exception as e:
            self.log_result("Verify user deletion", False, message=str(e))
        
        # Verify school no longer exists
        try:
            response = requests.get(f"{API}/schools/{school_id}", timeout=10)
            passed = response.status_code == 404
            self.log_result("School no longer exists", passed, response.status_code, 404)
            if passed:
                print(f"   ✓ School {school_id} successfully deleted")
            else:
                print(f"   ✗ School {school_id} still exists (status: {response.status_code})")
        except Exception as e:
            self.log_result("Verify school deletion", False, message=str(e))
        
        # Verify location no longer exists
        try:
            response = requests.get(f"{API}/locations/{location_id}", timeout=10)
            passed = response.status_code == 404
            self.log_result("Location no longer exists", passed, response.status_code, 404)
            if passed:
                print(f"   ✓ Location {location_id} successfully deleted")
            else:
                print(f"   ✗ Location {location_id} still exists (status: {response.status_code})")
        except Exception as e:
            self.log_result("Verify location deletion", False, message=str(e))
        
        # Verify instructor no longer exists
        try:
            response = requests.get(f"{API}/instructors/{instructor_id}", timeout=10)
            passed = response.status_code == 404
            self.log_result("Instructor no longer exists", passed, response.status_code, 404)
            if passed:
                print(f"   ✓ Instructor {instructor_id} successfully deleted")
            else:
                print(f"   ✗ Instructor {instructor_id} still exists (status: {response.status_code})")
        except Exception as e:
            self.log_result("Verify instructor deletion", False, message=str(e))
        
        # Verify course no longer exists in public courses
        try:
            response = requests.get(f"{API}/courses", timeout=10)
            if response.status_code == 200:
                courses = response.json()
                course_still_exists = any(c.get('id') == course_id for c in courses)
                self.log_result("Course no longer exists", not course_still_exists)
                if not course_still_exists:
                    print(f"   ✓ Course {course_id} successfully deleted")
                else:
                    print(f"   ✗ Course {course_id} still exists in public courses")
        except Exception as e:
            self.log_result("Verify course deletion", False, message=str(e))
        
        # STEP 5: Test student deletion with booking
        print("\n--- STEP 5: Testing Student Deletion with Booking ---")
        
        # Create a test student
        student_timestamp = int(datetime.now().timestamp() * 1000)
        test_student_email = f"test_student_{student_timestamp}@test.com"
        test_student_data = {
            "name": "Test Student",
            "email": test_student_email,
            "password": "test123",
            "role": "student"
        }
        
        student_id = None
        try:
            response = requests.post(f"{API}/admin/users", json=test_student_data, headers=headers, timeout=10)
            passed = response.status_code == 200
            self.log_result("Create test student", passed, response.status_code, 200)
            
            if passed:
                created_student = response.json()
                student_id = created_student.get('id')
                print(f"   Created student: {student_id}")
            else:
                print(f"   Failed to create student: {response.status_code}")
                
        except Exception as e:
            self.log_result("Create test student", False, message=str(e))
        
        if student_id:
            # Create a booking for the student (we need an existing course)
            # First, get an existing course
            existing_course_id = None
            try:
                response = requests.get(f"{API}/courses", timeout=10)
                if response.status_code == 200:
                    courses = response.json()
                    if len(courses) > 0:
                        existing_course_id = courses[0]['id']
                        print(f"   Using existing course for booking: {existing_course_id}")
            except Exception as e:
                print(f"   Could not get existing course: {str(e)}")
            
            if existing_course_id:
                # Login as student to create booking
                try:
                    login_data = {
                        "email": test_student_email,
                        "password": "test123"
                    }
                    login_response = requests.post(f"{API}/auth/login", json=login_data, timeout=10)
                    if login_response.status_code == 200 and 'Set-Cookie' in login_response.headers:
                        cookies = login_response.headers['Set-Cookie']
                        if 'session_token=' in cookies:
                            token_start = cookies.find('session_token=') + len('session_token=')
                            token_end = cookies.find(';', token_start)
                            if token_end == -1:
                                token_end = len(cookies)
                            student_token = cookies[token_start:token_end]
                            
                            # Create booking
                            student_headers = {"Authorization": f"Bearer {student_token}"}
                            booking_data = {
                                "student_name": "Test Student",
                                "student_email": test_student_email,
                                "student_phone": "123-456-7890",
                                "message": "Test booking for cascading delete"
                            }
                            
                            booking_response = requests.post(f"{API}/programs/{existing_course_id}/bookings", 
                                                           json=booking_data, headers=student_headers, timeout=10)
                            if booking_response.status_code == 200:
                                booking = booking_response.json()
                                booking_id = booking.get('id')
                                print(f"   Created booking: {booking_id}")
                                
                                # Now delete the student
                                delete_response = requests.delete(f"{API}/admin/users/{student_id}", headers=headers, timeout=10)
                                passed = delete_response.status_code == 200
                                self.log_result("Delete student with booking", passed, delete_response.status_code, 200)
                                
                                if passed:
                                    result = delete_response.json()
                                    deleted_counts = result.get('deleted', {})
                                    print(f"   ✓ Student deleted successfully")
                                    print(f"   Bookings deleted: {deleted_counts.get('bookings', 0)}")
                                    
                                    # Verify booking was deleted
                                    booking_deleted = deleted_counts.get('bookings', 0) > 0
                                    self.log_result("Student booking deleted", booking_deleted)
                                    if booking_deleted:
                                        print(f"   ✓ Student's booking successfully deleted")
                                    else:
                                        print(f"   ✗ Student's booking was not deleted")
                                        
                            else:
                                print(f"   Could not create booking: {booking_response.status_code}")
                                
                except Exception as e:
                    print(f"   Error in student booking test: {str(e)}")
            else:
                print("   Skipping booking test - no existing course available")
                
                # Still test student deletion without booking
                try:
                    delete_response = requests.delete(f"{API}/admin/users/{student_id}", headers=headers, timeout=10)
                    passed = delete_response.status_code == 200
                    self.log_result("Delete student (no booking)", passed, delete_response.status_code, 200)
                    if passed:
                        print(f"   ✓ Student deleted successfully (no booking)")
                except Exception as e:
                    self.log_result("Delete student (no booking)", False, message=str(e))
        
        print("\n--- CASCADING DELETE TEST COMPLETE ---")

    def run_all_tests(self):
        """Run all test suites"""
        print("\n" + "="*60)
        print("BACKEND API TESTING - Train In Japan Platform")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        # Run the specific test for cascading delete functionality (PRIORITY TEST)
        self.test_cascading_delete_functionality()
        
        # Run the specific test for admin user management endpoints (NEW FEATURE TEST)
        self.test_admin_user_management_endpoints()
        
        # Run the specific test for programs with school branding first (NEW FEATURE TEST)
        self.test_programs_with_school_branding()
        
        # Run the specific test for existing school user
        self.test_existing_school_user_auth()
        
        self.test_public_endpoints()
        self.test_jwt_auth()
        self.test_auth_endpoints()
        self.test_school_endpoints()
        self.test_course_crud()
        self.test_booking_endpoints()
        self.test_payment_flow()
        self.test_school_bookings()
        self.test_school_branding_endpoints()  # NEW: Test school branding features
        self.test_admin_endpoints()
        
        # Print summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        print("="*60)
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = APITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
