from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, Depends, Header, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')
WEBHOOK_BASE_URL = os.environ.get('WEBHOOK_BASE_URL', 'https://japanrail.preview.emergentagent.com')
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_DAYS = int(os.environ.get('JWT_EXPIRATION_DAYS', '30'))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    picture: str
    role: str = "student"  # Can be: student, school, admin, instructor
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    emergency_contact: Optional[str] = None
    martial_arts_background: Optional[str] = None
    experience_level: Optional[str] = None
    school_id: Optional[str] = None
    instructor_id: Optional[str] = None  # Links user to instructor entity
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class School(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    owner_id: str
    description: str
    tagline: Optional[str] = "Training School"  # Editable subtitle/tagline
    bio: Optional[str] = None  # Extended school biography/about section
    history: Optional[str] = None
    location: str
    contact_email: str
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    certificate_urls: List[str] = Field(default_factory=list)
    video_url: Optional[str] = None
    approved: bool = True  # Schools are auto-approved, only courses need approval
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SchoolCreate(BaseModel):
    name: str
    description: str
    tagline: Optional[str] = "Training School"
    bio: Optional[str] = None
    history: Optional[str] = None
    location: str
    contact_email: str
    contact_phone: Optional[str] = None
    website: Optional[str] = None

class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tagline: Optional[str] = None
    bio: Optional[str] = None
    history: Optional[str] = None
    location: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    certificate_urls: Optional[List[str]] = None
    video_url: Optional[str] = None

class SchoolSignupRequest(BaseModel):
    # User account fields
    user_name: str
    email: str
    password: str
    # School fields
    school_name: str
    description: str
    location: str
    contact_phone: Optional[str] = None
    website: Optional[str] = None

class Location(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    name: str
    address: str
    city: str
    prefecture: str
    latitude: Optional[float] = None  # Geocoded latitude
    longitude: Optional[float] = None  # Geocoded longitude
    capacity: int
    facilities: Optional[List[str]] = None
    facility_images: List[str] = Field(default_factory=list)  # Array of facility image URLs
    google_maps_url: Optional[str] = None  # Google Maps embed URL or place link
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LocationCreate(BaseModel):
    name: str
    address: str
    city: str
    prefecture: str  # Japanese prefecture (for now, only Japanese locations)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    capacity: int
    facilities: Optional[List[str]] = None
    facility_images: Optional[List[str]] = Field(default_factory=list)
    google_maps_url: Optional[str] = None
    description: Optional[str] = None

class Instructor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    name: str
    email: str
    phone: Optional[str] = None
    rank: Optional[str] = None
    years_experience: Optional[int] = None
    bio: Optional[str] = None
    specialties: Optional[List[str]] = None
    available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InstructorCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    rank: Optional[str] = None
    years_experience: Optional[int] = None
    bio: Optional[str] = None
    specialties: Optional[List[str]] = None

class Course(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    location_id: str
    instructor_id: str
    title: str
    description: str
    martial_arts_style: str  # Includes KORYU/KOBUDO option
    course_category: str = "Martial Arts"  # "Martial Arts" or "Cultural Arts"
    category: str  # Legacy field - kept for compatibility
    experience_level: str
    class_type: str
    price: float
    currency: str = "JPY"  # Base currency is Japanese Yen
    platform_fee_percentage: float = 9.0  # Booking fee percentage added on top of price (default 9%)
    sales_tax_percentage: float = 10.0  # Sales tax percentage (default 10%)
    duration: Optional[str] = None  # Auto-calculated from dates, made optional
    capacity: int
    prerequisites: Optional[str] = None
    start_date: str  # Made mandatory - intensive programs have fixed dates
    end_date: str  # Made mandatory
    daily_start_time: str = "09:00"  # Daily training start time (HH:MM format)
    daily_end_time: str = "17:00"  # Daily training end time (HH:MM format)
    image_url: Optional[str] = None
    status: str = "pending"
    instructor_confirmed: bool = False
    approved: bool = False  # First course needs admin approval
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CourseCreate(BaseModel):
    location_id: str
    instructor_id: str
    title: str
    description: str
    martial_arts_style: str
    course_category: str = "Martial Arts"  # "Martial Arts" or "Cultural Arts"
    category: str
    experience_level: str
    class_type: str
    price: float
    currency: str = "JPY"
    duration: Optional[str] = None  # Optional - auto-calculated from dates
    capacity: int
    prerequisites: Optional[str] = None
    start_date: str  # Made mandatory
    end_date: str  # Made mandatory
    daily_start_time: str = "09:00"  # Daily training start time
    daily_end_time: str = "17:00"  # Daily training end time
    image_url: str

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    course_id: str
    user_id: str
    student_name: str
    student_email: str
    student_phone: Optional[str] = None
    message: Optional[str] = None
    status: str = "pending"  # pending, confirmed, waitlisted, cancelled, completed
    payment_status: str = "unpaid"
    payment_session_id: Optional[str] = None
    amount_paid: Optional[float] = None  # Total amount student pays (school price + booking fee + sales tax)
    platform_fee: Optional[float] = None  # Booking fee amount (9% of school price, added on top)
    sales_tax: Optional[float] = None  # Sales tax amount (10% of school price + booking fee)
    school_earnings: Optional[float] = None  # School's course price (full amount they entered)
    booking_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Session-based booking support
    session_ids: List[str] = Field(default_factory=list)  # Specific sessions booked
    total_sessions: int = 0  # Number of sessions
    price_per_session: Optional[float] = None
    waitlist_position: Optional[int] = None

class BookingCreate(BaseModel):
    student_name: str
    student_email: str
    student_phone: Optional[str] = None
    message: Optional[str] = None

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    user_id: str
    session_id: str
    amount: float
    currency: str
    payment_status: str
    metadata: Optional[Dict[str, str]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    paid_at: Optional[datetime] = None


# ==================== SCHEDULING MODELS ====================

class CourseSchedule(BaseModel):
    """Schedule configuration for a course - defines when/how often classes occur"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    course_id: str
    start_date: str  # ISO format date
    end_date: str  # ISO format date
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    recurrence_type: str  # "once", "daily", "weekly", "custom"
    recurrence_days: List[int] = Field(default_factory=list)  # [1,3,5] for Mon/Wed/Fri (1=Mon, 7=Sun)
    recurrence_interval: int = 1  # Every X days/weeks
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CourseSession(BaseModel):
    """Individual session/class instance generated from a schedule"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    course_id: str
    schedule_id: str
    date: str  # ISO format date
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    location_id: str
    instructor_id: str
    max_capacity: int = 20
    current_enrollment: int = 0
    status: str = "scheduled"  # scheduled, cancelled, completed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WaitlistEntry(BaseModel):
    """Waitlist for full courses/sessions"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    course_id: str
    session_id: Optional[str] = None  # Specific session or whole course
    student_id: str
    student_email: str
    student_name: str
    position: int
    notified: bool = False
    offer_expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InstructorAvailability(BaseModel):
    """Instructor availability blocks"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    instructor_id: str
    day_of_week: int  # 1-7 (1=Monday, 7=Sunday)
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    is_available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LocationCalendarBlock(BaseModel):
    """Location maintenance/blocked time"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location_id: str
    start_date: str  # ISO format
    end_date: str  # ISO format
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    reason: str  # maintenance, event, etc.
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Create request/update models
class ScheduleCreate(BaseModel):
    start_date: str
    end_date: str
    start_time: str
    end_time: str
    recurrence_type: str = "once"
    recurrence_days: List[int] = Field(default_factory=list)
    recurrence_interval: int = 1

class SessionUpdate(BaseModel):
    status: Optional[str] = None
    max_capacity: Optional[int] = None

class AvailabilityCreate(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str
    is_available: bool = True

class WaitlistCreate(BaseModel):
    student_name: str
    student_email: str
    session_id: Optional[str] = None

class CheckoutRequest(BaseModel):
    course_id: str
    origin_url: str


# ==================== AUTH ====================

async def get_current_user(session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    token = session_token
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Convert expires_at to datetime if it's a string
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.post("/auth/session")
async def create_session(response: Response, session_id: str = Header(..., alias="X-Session-ID")):
    auth_service_url = os.environ.get('AUTH_SERVICE_URL', 'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data')
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(auth_service_url, headers={"X-Session-ID": session_id}, timeout=10.0)
            resp.raise_for_status()
            session_data = resp.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch session data: {str(e)}")
    user_id = session_data["id"]
    existing_user = await db.users.find_one({"email": session_data["email"]}, {"_id": 0})
    if not existing_user:
        user = User(id=user_id, email=session_data["email"], name=session_data["name"], picture=session_data["picture"])
        user_dict = user.model_dump()
        user_dict["created_at"] = user_dict["created_at"].isoformat()
        await db.users.insert_one(user_dict)
    else:
        user_id = existing_user["id"]
    session_token = session_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    # Delete old sessions for this user to prevent duplicate key errors
    await db.user_sessions.delete_many({"user_id": user_id})
    
    session = UserSession(user_id=user_id, session_token=session_token, expires_at=expires_at)
    session_dict = session.model_dump()
    session_dict["expires_at"] = session_dict["expires_at"].isoformat()
    session_dict["created_at"] = session_dict["created_at"].isoformat()
    await db.user_sessions.insert_one(session_dict)
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=False, samesite="lax", max_age=7*24*60*60, path="/")
    return {"success": True, "user_id": user_id}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/", samesite="lax", secure=False)
    return {"success": True}

# ==================== PASSWORD AUTH ====================

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_jwt_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {
        "user_id": user_id,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

@api_router.post("/auth/signup")
async def signup(signup_data: SignupRequest, response: Response):
    # Check if user exists
    existing_user = await db.users.find_one({"email": signup_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user with hashed password
    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(signup_data.password)
    
    user = User(
        id=user_id,
        email=signup_data.email,
        name=signup_data.name,
        picture=f"https://ui-avatars.com/api/?name={signup_data.name.replace(' ', '+')}&background=d97706&color=fff",
        role="student"
    )
    
    user_dict = user.model_dump()
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    user_dict["password_hash"] = hashed_pw
    await db.users.insert_one(user_dict)
    
    # Create session
    session_token = create_jwt_token(user_id)
    expires_at = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    
    # Delete any existing sessions for this user (edge case protection)
    await db.user_sessions.delete_many({"user_id": user_id})
    
    session = UserSession(user_id=user_id, session_token=session_token, expires_at=expires_at)
    session_dict = session.model_dump()
    session_dict["expires_at"] = session_dict["expires_at"].isoformat()
    session_dict["created_at"] = session_dict["created_at"].isoformat()
    await db.user_sessions.insert_one(session_dict)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=False,  # Set to False for HTTP deployments (use True for HTTPS)
        samesite="lax",  # Changed from 'none' to 'lax' for HTTP compatibility
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    return {"success": True, "user": user, "message": "Account created successfully"}

@api_router.post("/auth/school-signup")
async def school_signup(signup_data: SchoolSignupRequest, response: Response):
    """Combined endpoint to create user account and school in one step"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": signup_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user with hashed password
    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(signup_data.password)
    
    user = User(
        id=user_id,
        email=signup_data.email,
        name=signup_data.user_name,
        picture=f"https://ui-avatars.com/api/?name={signup_data.user_name.replace(' ', '+')}&background=d97706&color=fff",
        role="school"  # Set role to school immediately
    )
    
    # Create school
    school = School(
        owner_id=user_id,
        name=signup_data.school_name,
        description=signup_data.description,
        location=signup_data.location,
        contact_email=signup_data.email,
        contact_phone=signup_data.contact_phone,
        website=signup_data.website,
        approved=True  # Auto-approve school
    )
    
    # Insert user with school_id
    user_dict = user.model_dump()
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    user_dict["password_hash"] = hashed_pw
    user_dict["school_id"] = school.id  # Link school to user
    await db.users.insert_one(user_dict)
    
    # Insert school
    school_dict = school.model_dump()
    school_dict["created_at"] = school_dict["created_at"].isoformat()
    await db.schools.insert_one(school_dict)
    
    # Create session
    session_token = create_jwt_token(user_id)
    expires_at = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    
    session = UserSession(user_id=user_id, session_token=session_token, expires_at=expires_at)
    session_dict = session.model_dump()
    session_dict["expires_at"] = session_dict["expires_at"].isoformat()
    session_dict["created_at"] = session_dict["created_at"].isoformat()
    await db.user_sessions.insert_one(session_dict)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=False,  # Set to False for HTTP deployments (use True for HTTPS)
        samesite="lax",  # Changed from 'none' to 'lax' for HTTP compatibility
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    return {"success": True, "user": user, "school": school, "message": "School account created successfully"}

@api_router.post("/auth/login")
async def login(login_data: LoginRequest, response: Response):
    # Find user
    user_doc = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check password
    if "password_hash" not in user_doc:
        raise HTTPException(status_code=401, detail="This account uses Google login. Please sign in with Google.")
    
    if not verify_password(login_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create session
    user_id = user_doc["id"]
    session_token = create_jwt_token(user_id)
    expires_at = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    
    # Delete old sessions for this user to prevent duplicate key errors
    await db.user_sessions.delete_many({"user_id": user_id})
    
    session = UserSession(user_id=user_id, session_token=session_token, expires_at=expires_at)
    session_dict = session.model_dump()
    session_dict["expires_at"] = session_dict["expires_at"].isoformat()
    session_dict["created_at"] = session_dict["created_at"].isoformat()
    await db.user_sessions.insert_one(session_dict)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=False,  # Set to False for HTTP deployments (use True for HTTPS)
        samesite="lax",  # Changed from 'none' to 'lax' for HTTP compatibility
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    # Remove password hash from response
    user_doc.pop("password_hash", None)
    if isinstance(user_doc["created_at"], str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    user = User(**user_doc)
    return {"success": True, "user": user, "message": "Login successful"}

# ==================== SCHOOLS ====================

@api_router.post("/schools", response_model=School)
async def create_school(school_data: SchoolCreate, current_user: User = Depends(get_current_user)):
    # Check if user already has a school
    existing_school = await db.schools.find_one({"owner_id": current_user.id}, {"_id": 0})
    if existing_school:
        raise HTTPException(status_code=400, detail="You already have a registered school")
    
    # Create school with auto-approval
    school = School(**school_data.model_dump(), owner_id=current_user.id, approved=True)
    school_dict = school.model_dump()
    school_dict["created_at"] = school_dict["created_at"].isoformat()
    await db.schools.insert_one(school_dict)
    
    # Update user role to school and link school_id
    await db.users.update_one({"id": current_user.id}, {"$set": {"role": "school", "school_id": school.id}})
    return school

@api_router.get("/schools", response_model=List[School])
async def get_schools(approved_only: bool = True):
    query = {"approved": True} if approved_only else {}
    schools = await db.schools.find(query, {"_id": 0}).to_list(1000)
    for school in schools:
        if isinstance(school["created_at"], str):
            school["created_at"] = datetime.fromisoformat(school["created_at"])
    return schools

@api_router.get("/schools/{school_id}", response_model=School)
async def get_school(school_id: str):
    school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    if isinstance(school["created_at"], str):
        school["created_at"] = datetime.fromisoformat(school["created_at"])
    return School(**school)

@api_router.get("/schools/my/school", response_model=School)
async def get_my_school(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools and admins can access this")
    school = await db.schools.find_one({"owner_id": current_user.id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    if isinstance(school["created_at"], str):
        school["created_at"] = datetime.fromisoformat(school["created_at"])
    return School(**school)

@api_router.patch("/schools/{school_id}/approve")
async def approve_school(school_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can approve schools")
    result = await db.schools.update_one({"id": school_id}, {"$set": {"approved": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="School not found")
    return {"success": True}

@api_router.put("/schools/{school_id}", response_model=School)
async def update_school(school_id: str, school_data: SchoolUpdate, current_user: User = Depends(get_current_user)):
    """Update school profile including branding elements"""
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only school owners and admins can update their school")
    
    # Verify the school belongs to the current user
    school = await db.schools.find_one({"id": school_id, "owner_id": current_user.id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found or you don't have permission")
    
    # Filter out None values to only update provided fields
    update_data = {k: v for k, v in school_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Update the school
    result = await db.schools.update_one({"id": school_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Return updated school
    updated_school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if isinstance(updated_school["created_at"], str):
        updated_school["created_at"] = datetime.fromisoformat(updated_school["created_at"])
    return School(**updated_school)

# ==================== LOCATIONS ====================

@api_router.post("/locations", response_model=Location)
async def create_location(location_data: LocationCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can create locations")
    location = Location(**location_data.model_dump(), school_id=current_user.school_id)
    location_dict = location.model_dump()
    location_dict["created_at"] = location_dict["created_at"].isoformat()
    await db.locations.insert_one(location_dict)
    return location

@api_router.get("/locations", response_model=List[Location])
async def get_locations(school_id: Optional[str] = None):
    query = {"school_id": school_id} if school_id else {}
    locations = await db.locations.find(query, {"_id": 0}).to_list(1000)
    for loc in locations:
        if isinstance(loc["created_at"], str):
            loc["created_at"] = datetime.fromisoformat(loc["created_at"])
    return locations

@api_router.get("/locations/{location_id}", response_model=Location)
async def get_location(location_id: str):
    location = await db.locations.find_one({"id": location_id}, {"_id": 0})
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    if isinstance(location["created_at"], str):
        location["created_at"] = datetime.fromisoformat(location["created_at"])
    return Location(**location)

@api_router.put("/locations/{location_id}", response_model=Location)
async def update_location(location_id: str, location_data: LocationCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can update locations")
    existing = await db.locations.find_one({"id": location_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Location not found")
    if current_user.role == "school" and existing["school_id"] != current_user.school_id:
        raise HTTPException(status_code=403, detail="You can only update your own locations")
    update_dict = location_data.model_dump()
    await db.locations.update_one({"id": location_id}, {"$set": update_dict})
    updated = await db.locations.find_one({"id": location_id}, {"_id": 0})
    if isinstance(updated["created_at"], str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return Location(**updated)

@api_router.delete("/locations/{location_id}")
async def delete_location(location_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can delete locations")
    existing = await db.locations.find_one({"id": location_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Location not found")
    if current_user.role == "school" and existing["school_id"] != current_user.school_id:
        raise HTTPException(status_code=403, detail="You can only delete your own locations")
    await db.locations.delete_one({"id": location_id})
    return {"success": True}

# ==================== INSTRUCTORS ====================

@api_router.post("/instructors", response_model=Instructor)
async def create_instructor(instructor_data: InstructorCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can create instructors")
    instructor = Instructor(**instructor_data.model_dump(), school_id=current_user.school_id)
    instructor_dict = instructor.model_dump()
    instructor_dict["created_at"] = instructor_dict["created_at"].isoformat()
    await db.instructors.insert_one(instructor_dict)
    return instructor

@api_router.get("/instructors", response_model=List[Instructor])
async def get_instructors(school_id: Optional[str] = None):
    query = {"school_id": school_id} if school_id else {}
    instructors = await db.instructors.find(query, {"_id": 0}).to_list(1000)
    for inst in instructors:
        if isinstance(inst["created_at"], str):
            inst["created_at"] = datetime.fromisoformat(inst["created_at"])
    return instructors

# ==================== INSTRUCTOR USER MANAGEMENT ====================
# NOTE: These specific routes must come BEFORE the parameterized routes

class InstructorLinkRequest(BaseModel):
    instructor_id: str

@api_router.post("/instructors/link-account")
async def link_instructor_account(link_data: InstructorLinkRequest, current_user: User = Depends(get_current_user)):
    """Link current user account to an instructor entity"""
    # Verify instructor exists
    instructor = await db.instructors.find_one({"id": link_data.instructor_id}, {"_id": 0})
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    
    # Check if instructor email matches user email
    if instructor["email"] != current_user.email:
        raise HTTPException(status_code=403, detail="Instructor email must match your account email")
    
    # Check if instructor is already linked to another user
    existing_user = await db.users.find_one({"instructor_id": link_data.instructor_id}, {"_id": 0})
    if existing_user and existing_user["id"] != current_user.id:
        raise HTTPException(status_code=400, detail="This instructor is already linked to another account")
    
    # Update user to link instructor and change role
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"instructor_id": link_data.instructor_id, "role": "instructor"}}
    )
    
    # Update session
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    return {"success": True, "user": User(**updated_user)}

@api_router.get("/instructors/me", response_model=Instructor)
async def get_my_instructor_profile(current_user: User = Depends(get_current_user)):
    """Get current instructor's profile"""
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can access this endpoint")
    
    if not current_user.instructor_id:
        raise HTTPException(status_code=404, detail="No instructor profile linked to your account")
    
    instructor = await db.instructors.find_one({"id": current_user.instructor_id}, {"_id": 0})
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor profile not found")
    
    if isinstance(instructor["created_at"], str):
        instructor["created_at"] = datetime.fromisoformat(instructor["created_at"])
    
    return Instructor(**instructor)

@api_router.get("/instructors/my-courses", response_model=List[Course])
async def get_my_instructor_courses(current_user: User = Depends(get_current_user)):
    """Get all courses assigned to current instructor"""
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can access this endpoint")
    
    if not current_user.instructor_id:
        raise HTTPException(status_code=404, detail="No instructor profile linked to your account")
    
    # Get all courses for this instructor
    courses = await db.courses.find(
        {"instructor_id": current_user.instructor_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Populate with location and school info
    for course in courses:
        if isinstance(course["created_at"], str):
            course["created_at"] = datetime.fromisoformat(course["created_at"])
        
        location = await db.locations.find_one({"id": course["location_id"]}, {"_id": 0})
        school = await db.schools.find_one({"id": course["school_id"]}, {"_id": 0})
        if location:
            if isinstance(location["created_at"], str):
                location["created_at"] = datetime.fromisoformat(location["created_at"])
            course["location"] = location
        if school:
            course["school"] = {
                "id": school["id"],
                "name": school["name"],
                "logo_url": school.get("logo_url")
            }
    
    return courses

@api_router.get("/instructors/my-schedule")
async def get_my_instructor_schedule(current_user: User = Depends(get_current_user)):
    """Get instructor's schedule/calendar data"""
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can access this endpoint")
    
    if not current_user.instructor_id:
        raise HTTPException(status_code=404, detail="No instructor profile linked to your account")
    
    # Get all courses with their schedules
    courses = await db.courses.find(
        {"instructor_id": current_user.instructor_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Format for calendar
    schedule_events = []
    for course in courses:
        # Get location details
        location = await db.locations.find_one({"id": course["location_id"]}, {"_id": 0})
        school = await db.schools.find_one({"id": course["school_id"]}, {"_id": 0})
        
        # Get bookings count
        bookings_count = await db.bookings.count_documents({
            "course_id": course["id"],
            "status": {"$in": ["confirmed", "paid"]}
        })
        
        event = {
            "id": course["id"],
            "title": course["title"],
            "start_date": course["start_date"],
            "end_date": course["end_date"],
            "start_time": course.get("start_time"),
            "end_time": course.get("end_time"),
            "status": course["status"],
            "capacity": course["capacity"],
            "enrolled": bookings_count,
            "location": location["name"] if location else "Unknown",
            "school_name": school["name"] if school else "Unknown",
            "price": course["price"],
            "currency": course["currency"]
        }
        schedule_events.append(event)
    
    return {"schedule": schedule_events}

# ==================== PARAMETERIZED INSTRUCTOR ROUTES ====================
# NOTE: These must come AFTER the specific routes above

@api_router.get("/instructors/{instructor_id}", response_model=Instructor)
async def get_instructor(instructor_id: str):
    instructor = await db.instructors.find_one({"id": instructor_id}, {"_id": 0})
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    if isinstance(instructor["created_at"], str):
        instructor["created_at"] = datetime.fromisoformat(instructor["created_at"])
    return Instructor(**instructor)

@api_router.put("/instructors/{instructor_id}", response_model=Instructor)
async def update_instructor(instructor_id: str, instructor_data: InstructorCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can update instructors")
    existing = await db.instructors.find_one({"id": instructor_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Instructor not found")
    if current_user.role == "school" and existing["school_id"] != current_user.school_id:
        raise HTTPException(status_code=403, detail="You can only update your own instructors")
    update_dict = instructor_data.model_dump()
    await db.instructors.update_one({"id": instructor_id}, {"$set": update_dict})
    updated = await db.instructors.find_one({"id": instructor_id}, {"_id": 0})
    if isinstance(updated["created_at"], str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return Instructor(**updated)

@api_router.delete("/instructors/{instructor_id}")
async def delete_instructor(instructor_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can delete instructors")
    existing = await db.instructors.find_one({"id": instructor_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Instructor not found")
    if current_user.role == "school" and existing["school_id"] != current_user.school_id:
        raise HTTPException(status_code=403, detail="You can only delete your own instructors")
    await db.instructors.delete_one({"id": instructor_id})
    return {"success": True}

# ==================== COURSES ====================

@api_router.post("/courses", response_model=Course)
async def create_course(course_data: CourseCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can create courses")
    
    # Verify location and instructor belong to school
    location = await db.locations.find_one({"id": course_data.location_id, "school_id": current_user.school_id}, {"_id": 0})
    if not location:
        raise HTTPException(status_code=400, detail="Invalid location for your school")
    
    instructor = await db.instructors.find_one({"id": course_data.instructor_id, "school_id": current_user.school_id}, {"_id": 0})
    if not instructor:
        raise HTTPException(status_code=400, detail="Invalid instructor for your school")
    
    # LOCATION CAPACITY VALIDATION
    # Check if course capacity exceeds location capacity
    if course_data.capacity > location["capacity"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Course capacity ({course_data.capacity}) cannot exceed location capacity ({location['capacity']})"
        )
    
    # Check for overlapping courses at the same location
    # Find all courses at this location that overlap with the new course's dates
    from datetime import datetime as dt
    new_start = dt.fromisoformat(course_data.start_date).date()
    new_end = dt.fromisoformat(course_data.end_date).date()
    
    overlapping_courses = await db.courses.find({
        "location_id": course_data.location_id,
        "status": {"$in": ["confirmed", "active", "pending_first_approval"]},
        "$or": [
            # Course starts during new course
            {"start_date": {"$lte": course_data.end_date}, "end_date": {"$gte": course_data.start_date}},
        ]
    }, {"_id": 0}).to_list(1000)
    
    # Calculate total capacity during overlap
    total_capacity_during_overlap = course_data.capacity
    overlap_details = []
    
    for existing_course in overlapping_courses:
        total_capacity_during_overlap += existing_course["capacity"]
        overlap_details.append({
            "title": existing_course["title"],
            "dates": f"{existing_course['start_date']} to {existing_course['end_date']}",
            "capacity": existing_course["capacity"]
        })
    
    # Check if total exceeds location capacity
    if total_capacity_during_overlap > location["capacity"]:
        overlap_info = "\n".join([f"- {c['title']} ({c['dates']}): {c['capacity']} students" for c in overlap_details])
        raise HTTPException(
            status_code=400,
            detail=f"Location capacity exceeded. {location['name']} can accommodate {location['capacity']} students maximum.\n\n"
                   f"Existing courses during {course_data.start_date} to {course_data.end_date}:\n{overlap_info}\n"
                   f"Total with your course: {total_capacity_during_overlap} students (exceeds {location['capacity']} limit)"
        )
    
    # Auto-calculate duration from dates if not provided
    if not course_data.duration:
        delta = new_end - new_start
        days = delta.days + 1  # Include both start and end days
        if days == 1:
            course_data.duration = "1 day"
        elif days < 7:
            course_data.duration = f"{days} days"
        elif days < 30:
            weeks = days // 7
            remaining_days = days % 7
            if remaining_days == 0:
                course_data.duration = f"{weeks} week{'s' if weeks > 1 else ''}"
            else:
                course_data.duration = f"{weeks} week{'s' if weeks > 1 else ''} {remaining_days} day{'s' if remaining_days > 1 else ''}"
        else:
            weeks = days // 7
            course_data.duration = f"{weeks} weeks"
    
    # Check if this is the school's first course
    existing_courses_count = await db.courses.count_documents({"school_id": current_user.school_id})
    
    # First course needs admin approval, subsequent courses are auto-approved
    if existing_courses_count == 0:
        course_status = "pending_first_approval"
    else:
        course_status = "confirmed"
    
    course = Course(**course_data.model_dump(), school_id=current_user.school_id, status=course_status)
    course_dict = course.model_dump()
    course_dict["created_at"] = course_dict["created_at"].isoformat()
    await db.courses.insert_one(course_dict)
    return course

@api_router.get("/courses", response_model=List[Course])
async def get_courses(school_id: Optional[str] = None, location_id: Optional[str] = None, instructor_id: Optional[str] = None, martial_arts_style: Optional[str] = None, experience_level: Optional[str] = None):
    query = {"status": {"$in": ["confirmed", "active"]}}
    if school_id:
        query["school_id"] = school_id
    if location_id:
        query["location_id"] = location_id
    if instructor_id:
        query["instructor_id"] = instructor_id
    if martial_arts_style:
        query["martial_arts_style"] = martial_arts_style
    if experience_level:
        query["experience_level"] = experience_level
    
    courses = await db.courses.find(query, {"_id": 0}).to_list(1000)
    for course in courses:
        if isinstance(course["created_at"], str):
            course["created_at"] = datetime.fromisoformat(course["created_at"])
    return courses


@api_router.get("/currency/convert")
async def convert_currency(amount: float, from_currency: str = "JPY", to_currency: str = "USD"):
    """
    Convert currency between JPY and USD
    Using approximate exchange rate: 1 USD = 146 JPY (update as needed)
    """
    # Exchange rates (can be updated or fetched from external API)
    rates = {
        "JPY_TO_USD": 0.00685,  # 1 JPY = 0.00685 USD (approximately 1 USD = 146 JPY)
        "USD_TO_JPY": 146.0     # 1 USD = 146 JPY
    }
    
    if from_currency == "JPY" and to_currency == "USD":
        converted = round(amount * rates["JPY_TO_USD"], 2)
    elif from_currency == "USD" and to_currency == "JPY":
        converted = round(amount * rates["USD_TO_JPY"], 2)
    else:
        converted = amount  # Same currency or unsupported
    
    return {
        "amount": amount,
        "from_currency": from_currency,
        "to_currency": to_currency,
        "converted_amount": converted,
        "exchange_rate": rates.get(f"{from_currency}_TO_{to_currency}", 1.0)
    }

@api_router.get("/debug/db-info")
async def debug_db_info():
    """Debug endpoint to check database connection"""
    import socket
    course_count = await db.courses.count_documents({})
    confirmed_count = await db.courses.count_documents({"status": {"$in": ["confirmed", "active"]}})
    sample_courses = await db.courses.find({"status": {"$in": ["confirmed", "active"]}}, {"_id": 0, "title": 1}).limit(3).to_list(3)
    return {
        "hostname": socket.gethostname(),
        "mongo_url": os.environ['MONGO_URL'],
        "db_name": os.environ['DB_NAME'],
        "total_courses": course_count,
        "confirmed_courses": confirmed_count,
        "sample_courses": [c["title"] for c in sample_courses],
        "message": "If you see this, backend is working"
    }

@api_router.post("/admin/populate-courses")
async def populate_courses_endpoint():
    """Endpoint to populate 2027 courses - temporary open access for setup"""
    # TODO: Add admin auth after initial setup
    # if current_user.role != "admin":
    #     raise HTTPException(status_code=403, detail="Only admins can populate courses")
    
    # Course data
    courses_data = [
        {
            "title": "Foundation Koryu - Asayama Ichiden Ryu",
            "description": "Asayama Ichiden-ryū is a venerable koryū (old school) of comprehensive Japanese martial arts founded around 1566.",
            "martial_arts_style": "Asayama Ichiden Ryu",
            "category": "Martial Arts",
            "experience_level": "beginner",
            "class_type": "group",
            "price": 4750.00,
            "currency": "AUD",
            "duration": "4 weeks",
            "capacity": 20,
            "prerequisites": "No prior experience required.",
            "start_date": "2027-04-01",
            "end_date": "2027-04-30",
            "image_url": "https://static.wixstatic.com/media/3ed8bf_af9bb49d7ced4b5eb09fbcb0a187c9ef~mv2.jpg"
        },
        {
            "title": "Shotokan Karate Seminar - Black Belt Level",
            "description": "Exclusive black belt seminar in traditional Shotokan Karate.",
            "martial_arts_style": "Shotokan Karate",
            "category": "Martial Arts",
            "experience_level": "advanced",
            "class_type": "seminar",
            "price": 1900.00,
            "currency": "AUD",
            "duration": "1 week",
            "capacity": 20,
            "prerequisites": "Black belt (Shodan or higher) required.",
            "start_date": "2027-05-11",
            "end_date": "2027-05-18",
            "image_url": "https://static.wixstatic.com/media/3ed8bf_f00ff143586641efa2844b7ecbcc9388~mv2.jpg"
        },
        {
            "title": "Aikikai Aikido Seminar - Black Belt Level",
            "description": "Advanced Aikikai Aikido seminar for black belt practitioners.",
            "martial_arts_style": "Aikikai Aikido",
            "category": "Martial Arts",
            "experience_level": "advanced",
            "class_type": "seminar",
            "price": 1900.00,
            "currency": "AUD",
            "duration": "2 weeks",
            "capacity": 20,
            "prerequisites": "Black belt in Aikido required.",
            "start_date": "2027-05-25",
            "end_date": "2027-06-08",
            "image_url": "https://static.wixstatic.com/media/3ed8bf_a0a531f225e041cc96ac6c91121b2664~mv2.jpg"
        },
        {
            "title": "ANKF Kyudo - Traditional Japanese Archery",
            "description": "Learn the Way of the Bow with the All Nippon Kyudo Federation standards.",
            "martial_arts_style": "Kyudo",
            "category": "Archery",
            "experience_level": "beginner",
            "class_type": "group",
            "price": 2400.00,
            "currency": "AUD",
            "duration": "3 weeks",
            "capacity": 15,
            "prerequisites": "No experience required.",
            "start_date": "2027-06-15",
            "end_date": "2027-07-06",
            "image_url": "https://static.wixstatic.com/media/3ed8bf_84b7ccbd5cb3402f8ff805304b01dc63~mv2.jpg"
        },
        {
            "title": "Mugai Ryū Iaihyōdō - Sword Drawing Art",
            "description": "Mugai Ryū is a highly regarded style of Iaido with strong emphasis on practical application.",
            "martial_arts_style": "Mugai Ryu Iaido",
            "category": "Sword Arts",
            "experience_level": "intermediate",
            "class_type": "group",
            "price": 3200.00,
            "currency": "AUD",
            "duration": "4 weeks",
            "capacity": 15,
            "prerequisites": "Previous martial arts experience recommended.",
            "start_date": "2027-07-10",
            "end_date": "2027-08-07",
            "image_url": "https://static.wixstatic.com/media/3ed8bf_2d489f971dff4eee8200bbd24ec58637~mv2.jpg"
        },
        {
            "title": "Musō Jikiden Eishin-ryū Iaido",
            "description": "MJER is a prominent traditional school of Iaido with roots over 450 years old.",
            "martial_arts_style": "Muso Jikiden Eishin-ryu",
            "category": "Sword Arts",
            "experience_level": "beginner",
            "class_type": "group",
            "price": 2800.00,
            "currency": "AUD",
            "duration": "3 weeks",
            "capacity": 15,
            "prerequisites": "No experience required.",
            "start_date": "2027-08-15",
            "end_date": "2027-09-05",
            "image_url": "https://static.wixstatic.com/media/3ed8bf_304e3db2e47742189c663d48942799fd~mv2.jpg"
        },
        {
            "title": "Daito Ryu Aikijujutsu - Classical Jujutsu",
            "description": "Daitō-ryū is a classical martial art with over 1,000 years of history.",
            "martial_arts_style": "Daito Ryu",
            "category": "Martial Arts",
            "experience_level": "intermediate",
            "class_type": "group",
            "price": 3800.00,
            "currency": "AUD",
            "duration": "4 weeks",
            "capacity": 18,
            "prerequisites": "Previous jujutsu or aikido experience recommended.",
            "start_date": "2027-09-10",
            "end_date": "2027-10-08",
            "image_url": "https://static.wixstatic.com/media/3ed8bf_67188e03f937488b930fb0a7c9b9a63e~mv2.jpg"
        },
        {
            "title": "Katanakaji - The Art of Sword Smithing",
            "description": "Rare opportunity to learn authentic Japanese swordsmithing methods.",
            "martial_arts_style": "Sword Smithing",
            "category": "Cultural Arts",
            "experience_level": "beginner",
            "class_type": "workshop",
            "price": 7900.00,
            "currency": "AUD",
            "duration": "6 weeks",
            "capacity": 8,
            "prerequisites": "Physical fitness required.",
            "start_date": "2027-10-15",
            "end_date": "2027-11-26",
            "image_url": "https://static.wixstatic.com/media/3ed8bf_304e3db2e47742189c663d48942799fd~mv2.jpg"
        },
        {
            "title": "Ikebana - Japanese Flower Arrangement",
            "description": "Discover the ancient art of Ikebana, the Japanese way of arranging flowers.",
            "martial_arts_style": "Ikebana",
            "category": "Cultural Arts",
            "experience_level": "beginner",
            "class_type": "workshop",
            "price": 1100.00,
            "currency": "AUD",
            "duration": "1 week",
            "capacity": 12,
            "prerequisites": "None. All materials provided.",
            "start_date": "2027-11-01",
            "end_date": "2027-11-08",
            "image_url": "https://static.wixstatic.com/media/3ed8bf_2290a70c3f374e13909e19c38b3d4dc4~mv2.webp"
        },
        {
            "title": "Shodō - Japanese Calligraphy",
            "description": "Begin the Way of Writing. Learn the fundamental strokes and proper brush techniques.",
            "martial_arts_style": "Calligraphy",
            "category": "Cultural Arts",
            "experience_level": "beginner",
            "class_type": "workshop",
            "price": 1100.00,
            "currency": "AUD",
            "duration": "1 week",
            "capacity": 15,
            "prerequisites": "None. All materials provided.",
            "start_date": "2027-11-10",
            "end_date": "2027-11-17",
            "image_url": "https://static.wixstatic.com/media/3ed8bf_4d5d717bc8124193988096c5a35d6e78~mv2.jpg"
        },
        {
            "title": "Sumi-e - Ink Wash Painting",
            "description": "Master the elegant art of Japanese ink wash painting.",
            "martial_arts_style": "Ink Painting",
            "category": "Cultural Arts",
            "experience_level": "beginner",
            "class_type": "workshop",
            "price": 1900.00,
            "currency": "AUD",
            "duration": "2 weeks",
            "capacity": 12,
            "prerequisites": "None. Artistic inclination helpful.",
            "start_date": "2027-11-20",
            "end_date": "2027-12-04",
            "image_url": "https://static.wixstatic.com/media/3ed8bf_e8c12d1378d54fa1929d67129ee9b464~mv2.jpg"
        },
        {
            "title": "Taiko - Japanese Drumming",
            "description": "Learn the powerful performing art of Japanese drumming.",
            "martial_arts_style": "Taiko",
            "category": "Cultural Arts",
            "experience_level": "beginner",
            "class_type": "group",
            "price": 1450.00,
            "currency": "AUD",
            "duration": "2 weeks",
            "capacity": 15,
            "prerequisites": "Physical fitness. No music experience required.",
            "start_date": "2027-12-05",
            "end_date": "2027-12-19",
            "image_url": "https://static.wixstatic.com/media/3ed8bf_0fee5a4dd34141feae895425e4f7c815~mv2.jpg"
        }
    ]
    
    # Step 1: Get or create admin user for ownership
    admin_user = await db.users.find_one({"role": "admin"}, {"_id": 0})
    if not admin_user:
        admin_id = str(uuid.uuid4())
        admin_user = {
            "id": admin_id,
            "email": "admin@traininjapan.com",
            "name": "Admin",
            "picture": "",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
    
    # Step 2: Get or create school
    school = await db.schools.find_one({"name": "Kowakan Dojo"}, {"_id": 0})
    if not school:
        school_id = str(uuid.uuid4())
        school = {
            "id": school_id,
            "name": "Kowakan Dojo",
            "owner_id": admin_user["id"],
            "description": "Traditional martial arts and cultural training center in the heart of the Japanese Alps.",
            "location": "Matsumoto, Nagano Prefecture, Japan",
            "contact_email": "administration@traininjapan.com",
            "contact_phone": "+81-263-xxx-xxxx",
            "website": "https://traininjapan.com",
            "logo_url": "https://static.wixstatic.com/media/3ed8bf_67188e03f937488b930fb0a7c9b9a63e~mv2.jpg",
            "approved": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.schools.insert_one(school)
    else:
        school_id = school["id"]
    
    # Step 3: Get or create location
    location = await db.locations.find_one({"school_id": school_id}, {"_id": 0})
    if not location:
        location_id = str(uuid.uuid4())
        location = {
            "id": location_id,
            "school_id": school_id,
            "name": "Main Dojo",
            "address": "Kowakan Dojo, Matsumoto City",
            "city": "Matsumoto",
            "prefecture": "Nagano",
            "capacity": 30,
            "facilities": ["Tatami mats", "Weapon racks", "Changing rooms"],
            "description": "Traditional training hall with authentic Japanese atmosphere.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.locations.insert_one(location)
    else:
        location_id = location["id"]
    
    # Step 4: Get or create instructor
    instructor = await db.instructors.find_one({"school_id": school_id}, {"_id": 0})
    if not instructor:
        instructor_id = str(uuid.uuid4())
        instructor = {
            "id": instructor_id,
            "school_id": school_id,
            "name": "Master Instructor Team",
            "email": "instructors@traininjapan.com",
            "phone": "+81-263-xxx-xxxx",
            "rank": "Various Ranks",
            "years_experience": 30,
            "bio": "Our team of master instructors brings decades of combined experience.",
            "specialties": ["Koryu Bujutsu", "Modern Budo", "Cultural Arts"],
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.instructors.insert_one(instructor)
    else:
        instructor_id = instructor["id"]
    
    # Step 5: Create courses
    created_count = 0
    for course_data in courses_data:
        existing = await db.courses.find_one({
            "school_id": school_id,
            "title": course_data["title"]
        }, {"_id": 0})
        
        if not existing:
            course_id = str(uuid.uuid4())
            course = {
                "id": course_id,
                "school_id": school_id,
                "location_id": location_id,
                "instructor_id": instructor_id,
                "status": "confirmed",
                "instructor_confirmed": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                **course_data
            }
            await db.courses.insert_one(course)
            created_count += 1
    
    return {
        "success": True,
        "message": f"Created {created_count} courses",
        "school_id": school_id,
        "location_id": location_id,
        "instructor_id": instructor_id
    }

# ==================== FILE UPLOADS ====================
from fastapi import File, UploadFile
from fastapi.staticfiles import StaticFiles
import shutil
from pathlib import Path

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Static files mounted at end of file (after router)

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """General file upload endpoint - supports images and videos"""
    # Validate file type
    allowed_types = ['image/', 'video/']
    if not any(file.content_type.startswith(t) for t in allowed_types):
        raise HTTPException(status_code=400, detail="File must be an image or video")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return URL
    file_url = f"/uploads/{unique_filename}"
    return {"success": True, "url": file_url, "filename": unique_filename}

@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload an image file and return the URL"""
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return URL
    file_url = f"/uploads/{unique_filename}"
    return {"success": True, "url": file_url, "filename": unique_filename}

@api_router.post("/upload/video")
async def upload_video(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload a video file and return the URL"""
    # Validate file type
    allowed_video_types = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm']
    if file.content_type not in allowed_video_types:
        raise HTTPException(
            status_code=400, 
            detail=f"File must be a video (mp4, mpeg, mov, avi, webm). Got: {file.content_type}"
        )
    
    # Check file size (limit to 100MB)
    max_size = 100 * 1024 * 1024  # 100MB
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > max_size:
        raise HTTPException(status_code=400, detail="Video file too large. Max size: 100MB")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return URL
    file_url = f"/uploads/{unique_filename}"
    return {"success": True, "url": file_url, "filename": unique_filename}

@api_router.put("/courses/{course_id}", response_model=Course)
async def update_course(course_id: str, course_data: CourseCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can update courses")
    existing = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Verify ownership: Only the school that owns the course (or admin managing their school) can update it
    if current_user.role == "school":
        if existing["school_id"] != current_user.school_id:
            raise HTTPException(status_code=403, detail="You can only update courses from your own school")
    elif current_user.role == "admin":
        # Admin can only update courses from their admin school
        if existing["school_id"] != current_user.school_id:
            raise HTTPException(status_code=403, detail="You can only update courses from your admin school")
    
    # LOCATION CAPACITY VALIDATION (same as create)
    location = await db.locations.find_one({"id": course_data.location_id}, {"_id": 0})
    if not location:
        raise HTTPException(status_code=400, detail="Invalid location")
    
    if course_data.capacity > location["capacity"]:
        raise HTTPException(
            status_code=400,
            detail=f"Course capacity ({course_data.capacity}) cannot exceed location capacity ({location['capacity']})"
        )
    
    # Check for overlapping courses (excluding current course being edited)
    from datetime import datetime as dt
    new_start = dt.fromisoformat(course_data.start_date).date()
    new_end = dt.fromisoformat(course_data.end_date).date()
    
    overlapping_courses = await db.courses.find({
        "id": {"$ne": course_id},  # Exclude current course
        "location_id": course_data.location_id,
        "status": {"$in": ["confirmed", "active", "pending_first_approval"]},
        "$or": [
            {"start_date": {"$lte": course_data.end_date}, "end_date": {"$gte": course_data.start_date}},
        ]
    }, {"_id": 0}).to_list(1000)
    
    total_capacity_during_overlap = course_data.capacity
    overlap_details = []
    
    for existing_course in overlapping_courses:
        total_capacity_during_overlap += existing_course["capacity"]
        overlap_details.append({
            "title": existing_course["title"],
            "dates": f"{existing_course['start_date']} to {existing_course['end_date']}",
            "capacity": existing_course["capacity"]
        })
    
    if total_capacity_during_overlap > location["capacity"]:
        overlap_info = "\n".join([f"- {c['title']} ({c['dates']}): {c['capacity']} students" for c in overlap_details])
        raise HTTPException(
            status_code=400,
            detail=f"Location capacity exceeded. {location['name']} can accommodate {location['capacity']} students maximum.\n\n"
                   f"Existing courses during {course_data.start_date} to {course_data.end_date}:\n{overlap_info}\n"
                   f"Total with your course: {total_capacity_during_overlap} students (exceeds {location['capacity']} limit)"
        )
    
    # Prepare update data - preserve system fields like school_id, status, etc.
    update_data = course_data.model_dump()
    # CRITICAL: Do not update school_id, status, approved, instructor_confirmed, created_at
    # These are system-managed fields that should not be changed by user updates
    update_data.pop('duration', None)  # Duration should be auto-calculated if needed
    
    await db.courses.update_one({"id": course_id}, {"$set": update_data})
    updated_course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if isinstance(updated_course["created_at"], str):
        updated_course["created_at"] = datetime.fromisoformat(updated_course["created_at"])
    return Course(**updated_course)

@api_router.get("/uploads/{filename}")
async def serve_uploaded_file(filename: str):
    """Serve uploaded files with correct content-type"""
    from fastapi.responses import FileResponse
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine content type
    content_type = "image/jpeg"
    if filename.endswith('.png'):
        content_type = "image/png"
    elif filename.endswith('.webp'):
        content_type = "image/webp"
    elif filename.endswith('.gif'):
        content_type = "image/gif"
    
    return FileResponse(file_path, media_type=content_type)

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can delete courses")
    existing = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Verify ownership
    if current_user.role == "school" and existing["school_id"] != current_user.school_id:
        raise HTTPException(status_code=403, detail="You can only delete your own courses")
    elif current_user.role == "admin" and existing["school_id"] != current_user.school_id:
        raise HTTPException(status_code=403, detail="You can only delete courses from your admin school")
    
    await db.courses.delete_one({"id": course_id})
    return {"success": True}

@api_router.patch("/courses/{course_id}/confirm")
async def confirm_course(course_id: str, current_user: User = Depends(get_current_user)):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # For MVP: school admin can confirm directly
    if current_user.role == "school" and course["school_id"] == current_user.school_id:
        await db.courses.update_one({"id": course_id}, {"$set": {"instructor_confirmed": True, "status": "confirmed"}})
        return {"success": True}
    
    raise HTTPException(status_code=403, detail="Not authorized")


@api_router.patch("/courses/{course_id}/approve-first")
async def approve_first_course(course_id: str, current_user: User = Depends(get_current_user)):
    """Admin endpoint to approve a school's first course"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can approve first courses")
    
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course["status"] != "pending_first_approval":
        raise HTTPException(status_code=400, detail="This course is not pending first approval")
    
    # Approve the first course
    await db.courses.update_one({"id": course_id}, {"$set": {"status": "confirmed", "instructor_confirmed": True}})
    
    return {"success": True, "message": "First course approved. School can now create courses without approval."}


# ==================== BOOKINGS ====================

@api_router.post("/courses/{course_id}/bookings", response_model=Booking)
async def create_booking(course_id: str, booking_data: BookingCreate, current_user: User = Depends(get_current_user)):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course["status"] != "confirmed" and course["status"] != "active":
        raise HTTPException(status_code=400, detail="Course is not available for booking")
    
    # Check capacity
    existing_bookings = await db.bookings.count_documents({"course_id": course_id, "status": {"$in": ["pending", "confirmed"]}})
    if existing_bookings >= course["capacity"]:
        raise HTTPException(status_code=400, detail="Course is full")
    
    # Calculate booking fee, sales tax, and school earnings
    school_price = course["price"]  # Amount school receives
    platform_fee_percentage = course.get("platform_fee_percentage", 9.0)
    sales_tax_percentage = course.get("sales_tax_percentage", 10.0)
    
    # Step 1: Calculate booking fee (9% of school price)
    platform_fee = round(school_price * (platform_fee_percentage / 100), 2)
    
    # Step 2: Calculate subtotal (school price + booking fee)
    subtotal = school_price + platform_fee
    
    # Step 3: Calculate sales tax (10% of subtotal)
    sales_tax = round(subtotal * (sales_tax_percentage / 100), 2)
    
    # Step 4: Calculate total amount student pays
    total_amount = round(subtotal + sales_tax, 2)
    
    booking = Booking(
        **booking_data.model_dump(), 
        course_id=course_id, 
        user_id=current_user.id, 
        amount_paid=total_amount,  # Total: school price + booking fee + sales tax
        platform_fee=platform_fee,
        sales_tax=sales_tax,
        school_earnings=school_price  # School receives their full entered price
    )
    booking_dict = booking.model_dump()
    booking_dict["booking_date"] = booking_dict["booking_date"].isoformat()
    await db.bookings.insert_one(booking_dict)
    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_my_bookings(current_user: User = Depends(get_current_user)):
    bookings = await db.bookings.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    for booking in bookings:
        if isinstance(booking["booking_date"], str):
            booking["booking_date"] = datetime.fromisoformat(booking["booking_date"])
    return bookings

@api_router.get("/schools/{school_id}/bookings", response_model=List[Booking])
async def get_school_bookings(school_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role == "school" and current_user.school_id != school_id:
        raise HTTPException(status_code=403, detail="You can only view your own school's bookings")
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools and admins can view bookings")
    
    courses = await db.courses.find({"school_id": school_id}, {"_id": 0}).to_list(1000)
    course_ids = [c["id"] for c in courses]
    bookings = await db.bookings.find({"course_id": {"$in": course_ids}}, {"_id": 0}).to_list(1000)
    for booking in bookings:
        if isinstance(booking["booking_date"], str):
            booking["booking_date"] = datetime.fromisoformat(booking["booking_date"])
    return bookings



# ==================== SCHEDULING ====================

@api_router.post("/courses/{course_id}/schedules")
async def create_course_schedule(
    course_id: str,
    schedule_data: ScheduleCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a schedule for a course and generate sessions"""
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can create schedules")
    
    # Verify course exists and user owns it
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role == "school":
        school = await db.schools.find_one({"owner_id": current_user.id}, {"_id": 0})
        if not school or school["id"] != course["school_id"]:
            raise HTTPException(status_code=403, detail="You don't own this course")
    
    # Create schedule
    schedule = CourseSchedule(
        course_id=course_id,
        **schedule_data.model_dump()
    )
    schedule_dict = schedule.model_dump()
    schedule_dict["created_at"] = schedule_dict["created_at"].isoformat()
    await db.course_schedules.insert_one(schedule_dict)
    
    # Generate sessions based on schedule
    from datetime import datetime, timedelta
    from datetime import time as datetime_time
    
    start_date = datetime.fromisoformat(schedule_data.start_date).date()
    end_date = datetime.fromisoformat(schedule_data.end_date).date()
    
    sessions_created = []
    current_date = start_date
    
    while current_date <= end_date:
        should_create_session = False
        
        if schedule_data.recurrence_type == "once":
            should_create_session = (current_date == start_date)
        elif schedule_data.recurrence_type == "daily":
            should_create_session = True
        elif schedule_data.recurrence_type == "weekly":
            # Check if current day is in recurrence_days
            day_of_week = current_date.isoweekday()  # 1=Monday, 7=Sunday
            should_create_session = day_of_week in schedule_data.recurrence_days
        elif schedule_data.recurrence_type == "custom":
            days_diff = (current_date - start_date).days
            should_create_session = (days_diff % schedule_data.recurrence_interval == 0)
        
        if should_create_session:
            session = CourseSession(
                course_id=course_id,
                schedule_id=schedule.id,
                date=current_date.isoformat(),
                start_time=schedule_data.start_time,
                end_time=schedule_data.end_time,
                location_id=course["location_id"],
                instructor_id=course["instructor_id"],
                max_capacity=course["capacity"]
            )
            session_dict = session.model_dump()
            session_dict["created_at"] = session_dict["created_at"].isoformat()
            await db.course_sessions.insert_one(session_dict)
            sessions_created.append(session.id)
        
        current_date += timedelta(days=1)
    
    return {
        "success": True,
        "schedule_id": schedule.id,
        "sessions_created": len(sessions_created),
        "session_ids": sessions_created
    }

@api_router.get("/courses/{course_id}/schedules")
async def get_course_schedules(course_id: str):
    """Get all schedules for a course"""
    schedules = await db.course_schedules.find({"course_id": course_id}, {"_id": 0}).to_list(100)
    return schedules

@api_router.get("/courses/{course_id}/sessions")
async def get_course_sessions(course_id: str, status: Optional[str] = None):
    """Get all sessions for a course"""
    query = {"course_id": course_id}
    if status:
        query["status"] = status
    
    sessions = await db.course_sessions.find(query, {"_id": 0}).to_list(1000)
    return sessions

@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a specific session"""
    session = await db.course_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@api_router.patch("/sessions/{session_id}")
async def update_session(
    session_id: str,
    update_data: SessionUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a session (status, capacity, etc.)"""
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can update sessions")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    result = await db.course_sessions.update_one(
        {"id": session_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"success": True}

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a schedule and all its sessions"""
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can delete schedules")
    
    # Delete all sessions for this schedule
    await db.course_sessions.delete_many({"schedule_id": schedule_id})
    
    # Delete the schedule
    result = await db.course_schedules.delete_one({"id": schedule_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return {"success": True}

# ==================== CONFLICT CHECKING ====================

@api_router.post("/validate-schedule")
async def validate_schedule(request: dict):
    """Check for scheduling conflicts"""
    location_id = request.get("location_id")
    instructor_id = request.get("instructor_id")
    start_date = request.get("start_date")
    end_date = request.get("end_date")
    start_time = request.get("start_time")
    end_time = request.get("end_time")
    
    conflicts = {
        "has_conflict": False,
        "location_conflicts": [],
        "instructor_conflicts": []
    }
    
    # Check location conflicts
    if location_id:
        # Find all sessions at this location in the date range
        location_sessions = await db.course_sessions.find({
            "location_id": location_id,
            "date": {"$gte": start_date, "$lte": end_date},
            "status": "scheduled"
        }, {"_id": 0}).to_list(1000)
        
        for session in location_sessions:
            # Check time overlap
            if (start_time < session["end_time"] and end_time > session["start_time"]):
                conflicts["location_conflicts"].append({
                    "session_id": session["id"],
                    "date": session["date"],
                    "time": f"{session['start_time']}-{session['end_time']}"
                })
                conflicts["has_conflict"] = True
    
    # Check instructor conflicts
    if instructor_id:
        instructor_sessions = await db.course_sessions.find({
            "instructor_id": instructor_id,
            "date": {"$gte": start_date, "$lte": end_date},
            "status": "scheduled"
        }, {"_id": 0}).to_list(1000)
        
        for session in instructor_sessions:
            if (start_time < session["end_time"] and end_time > session["start_time"]):
                conflicts["instructor_conflicts"].append({
                    "session_id": session["id"],
                    "date": session["date"],
                    "time": f"{session['start_time']}-{session['end_time']}"
                })
                conflicts["has_conflict"] = True
    
    return conflicts

# ==================== INSTRUCTOR AVAILABILITY ====================

@api_router.post("/instructors/{instructor_id}/availability")
async def create_instructor_availability(
    instructor_id: str,
    availability_data: AvailabilityCreate,
    current_user: User = Depends(get_current_user)
):
    """Set instructor availability"""
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can set availability")
    
    availability = InstructorAvailability(
        instructor_id=instructor_id,
        **availability_data.model_dump()
    )
    availability_dict = availability.model_dump()
    availability_dict["created_at"] = availability_dict["created_at"].isoformat()
    await db.instructor_availability.insert_one(availability_dict)
    
    return {"success": True, "availability_id": availability.id}

@api_router.get("/instructors/{instructor_id}/availability")
async def get_instructor_availability(instructor_id: str):
    """Get instructor availability blocks"""
    availability = await db.instructor_availability.find(
        {"instructor_id": instructor_id},
        {"_id": 0}
    ).to_list(100)
    return availability

@api_router.delete("/availability/{availability_id}")
async def delete_availability(
    availability_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete availability block"""
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can delete availability")
    
    result = await db.instructor_availability.delete_one({"id": availability_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Availability not found")
    
    return {"success": True}

@api_router.patch("/courses/{course_id}/instructor-confirm")
async def instructor_confirm_course(
    course_id: str,
    current_user: User = Depends(get_current_user)
):
    """Instructor confirms they can teach this course"""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Verify user is the assigned instructor or admin
    if current_user.role != "admin":
        instructor = await db.instructors.find_one(
            {"id": course["instructor_id"]},
            {"_id": 0}
        )
        if not instructor or instructor["email"] != current_user.email:
            raise HTTPException(status_code=403, detail="You are not the assigned instructor")
    
    # Update course status
    await db.courses.update_one(
        {"id": course_id},
        {"$set": {"instructor_confirmed": True, "status": "confirmed"}}
    )
    
    return {"success": True, "message": "Course confirmed"}

@api_router.patch("/courses/{course_id}/instructor-decline")
async def instructor_decline_course(
    course_id: str,
    current_user: User = Depends(get_current_user)
):
    """Instructor declines course assignment"""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Mark as declined and pending reassignment
    await db.courses.update_one(
        {"id": course_id},
        {"$set": {"instructor_confirmed": False, "status": "pending_instructor"}}
    )
    
    return {"success": True, "message": "Course declined, needs new instructor"}

# ==================== WAITLIST ====================

@api_router.post("/courses/{course_id}/waitlist")
async def join_waitlist(
    course_id: str,
    waitlist_data: WaitlistCreate,
    current_user: User = Depends(get_current_user)
):
    """Join waitlist for a full course"""
    # Get current waitlist position
    existing_entries = await db.waitlist.count_documents({"course_id": course_id})
    
    entry = WaitlistEntry(
        course_id=course_id,
        student_id=current_user.id,
        student_email=waitlist_data.student_email,
        student_name=waitlist_data.student_name,
        position=existing_entries + 1,
        session_id=waitlist_data.session_id
    )
    
    entry_dict = entry.model_dump()
    entry_dict["created_at"] = entry_dict["created_at"].isoformat()
    entry_dict["offer_expires_at"] = entry_dict.get("offer_expires_at").isoformat() if entry_dict.get("offer_expires_at") else None
    
    await db.waitlist.insert_one(entry_dict)
    
    return {
        "success": True,
        "waitlist_id": entry.id,
        "position": entry.position
    }

@api_router.get("/courses/{course_id}/waitlist")
async def get_waitlist(course_id: str):
    """Get waitlist for a course"""
    waitlist = await db.waitlist.find(
        {"course_id": course_id},
        {"_id": 0}
    ).sort("position", 1).to_list(1000)
    return waitlist

@api_router.delete("/waitlist/{waitlist_id}")
async def leave_waitlist(
    waitlist_id: str,
    current_user: User = Depends(get_current_user)
):
    """Leave waitlist"""
    result = await db.waitlist.delete_one({
        "id": waitlist_id,
        "student_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    
    return {"success": True}

# ==================== SESSION-BASED BOOKINGS ====================

@api_router.post("/bookings/sessions")
async def book_sessions(
    booking_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Book specific sessions"""
    session_ids = booking_data.get("session_ids", [])
    student_name = booking_data.get("student_name")
    student_email = booking_data.get("student_email")
    student_phone = booking_data.get("student_phone")
    
    if not session_ids:
        raise HTTPException(status_code=400, detail="No sessions selected")
    
    # Get sessions and validate
    sessions = await db.course_sessions.find(
        {"id": {"$in": session_ids}},
        {"_id": 0}
    ).to_list(len(session_ids))
    
    if len(sessions) != len(session_ids):
        raise HTTPException(status_code=404, detail="Some sessions not found")
    
    # Check capacity for each session
    for session in sessions:
        if session["current_enrollment"] >= session["max_capacity"]:
            raise HTTPException(
                status_code=400,
                detail=f"Session on {session['date']} is full"
            )
    
    # Get course for pricing
    course_id = sessions[0]["course_id"]
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    
    # Calculate price (simple: course price / total sessions, or per session)
    price_per_session = course["price"] / len(session_ids) if len(session_ids) > 1 else course["price"]
    total_price = price_per_session * len(session_ids)
    
    # Create booking
    booking = Booking(
        course_id=course_id,
        user_id=current_user.id,
        student_name=student_name,
        student_email=student_email,
        student_phone=student_phone,
        session_ids=session_ids,
        total_sessions=len(session_ids),
        price_per_session=price_per_session,
        amount_paid=total_price,
        status="pending"
    )
    
    booking_dict = booking.model_dump()
    booking_dict["booking_date"] = booking_dict["booking_date"].isoformat()
    await db.bookings.insert_one(booking_dict)
    
    # Update session enrollment
    for session_id in session_ids:
        await db.course_sessions.update_one(
            {"id": session_id},
            {"$inc": {"current_enrollment": 1}}
        )
    
    return {
        "success": True,
        "booking_id": booking.id,
        "total_price": total_price,
        "sessions_booked": len(session_ids)
    }

@api_router.patch("/bookings/{booking_id}/confirm")
async def confirm_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user)
):
    """School confirms a booking"""
    if current_user.role not in ["school", "admin"]:
        raise HTTPException(status_code=403, detail="Only schools can confirm bookings")
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "confirmed"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"success": True, "message": "Booking confirmed"}

@api_router.patch("/bookings/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel a booking"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Verify user owns the booking or is school/admin
    if current_user.role not in ["school", "admin"] and booking["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update booking status
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled"}}
    )
    
    # Free up session slots
    for session_id in booking.get("session_ids", []):
        await db.course_sessions.update_one(
            {"id": session_id},
            {"$inc": {"current_enrollment": -1}}
        )
    
    # Check waitlist and notify next person
    course_id = booking["course_id"]
    next_in_waitlist = await db.waitlist.find_one(
        {"course_id": course_id, "notified": False},
        {"_id": 0},
        sort=[("position", 1)]
    )
    
    if next_in_waitlist:
        # Mark as notified and set expiration (24 hours)
        from datetime import datetime, timedelta, timezone
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        await db.waitlist.update_one(
            {"id": next_in_waitlist["id"]},
            {"$set": {
                "notified": True,
                "offer_expires_at": expires_at.isoformat()
            }}
        )
    
    return {"success": True, "message": "Booking cancelled"}



# ==================== COURSES ====================

@api_router.get("/courses/{course_id}", response_model=Course)
async def get_course(course_id: str):
    """Get a single course by ID"""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if isinstance(course["created_at"], str):
        course["created_at"] = datetime.fromisoformat(course["created_at"])
    return Course(**course)

# ==================== PROGRAM ALIASES (for frontend compatibility) ====================
# These endpoints are aliases for /courses endpoints

@api_router.get("/programs")
async def get_programs(school_id: Optional[str] = None, location_id: Optional[str] = None, instructor_id: Optional[str] = None, martial_arts_style: Optional[str] = None, experience_level: Optional[str] = None):
    """Get programs with school branding information"""
    logging.info(f"get_programs called with params: school_id={school_id}, location_id={location_id}, instructor_id={instructor_id}, martial_arts_style={martial_arts_style}, experience_level={experience_level}")
    
    # Build query
    query = {"status": {"$in": ["confirmed", "active"]}}
    if school_id:
        query["school_id"] = school_id
    if location_id:
        query["location_id"] = location_id
    if instructor_id:
        query["instructor_id"] = instructor_id
    if martial_arts_style:
        query["martial_arts_style"] = martial_arts_style
    if experience_level:
        query["experience_level"] = experience_level
    
    # Fetch courses
    courses = await db.courses.find(query, {"_id": 0}).to_list(1000)
    
    # Fetch all unique school IDs and batch fetch school data (optimized to avoid N+1)
    school_ids = list(set([c.get("school_id") for c in courses if c.get("school_id")]))
    school_cache = {}
    
    if school_ids:
        schools = await db.schools.find(
            {"id": {"$in": school_ids}},
            {"_id": 0, "id": 1, "name": 1, "logo_url": 1, "banner_url": 1}
        ).to_list(len(school_ids))
        school_cache = {s["id"]: s for s in schools}
    
    # Add school data to courses
    for course in courses:
        if isinstance(course["created_at"], str):
            course["created_at"] = datetime.fromisoformat(course["created_at"])
        
        school_id_val = course.get("school_id")
        course["school"] = school_cache.get(school_id_val)
    
    logging.info(f"get_programs returning {len(courses)} courses with school data")
    return courses

@api_router.get("/programs/{program_id}", response_model=Course)
async def get_program(program_id: str):
    """Alias for get_course"""
    return await get_course(program_id)

@api_router.post("/programs/{program_id}/bookings", response_model=Booking)
async def create_program_booking(program_id: str, booking_data: BookingCreate, current_user: User = Depends(get_current_user)):
    """Alias for create_booking"""
    return await create_booking(program_id, booking_data, current_user)

# ==================== PAYMENTS ====================

@api_router.post("/payments/checkout")
async def create_checkout(checkout_data: CheckoutRequest, current_user: User = Depends(get_current_user)):
    course_id = checkout_data.course_id
    origin_url = checkout_data.origin_url
    
    # Get course
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if user already has pending booking
    existing_booking = await db.bookings.find_one({"course_id": course_id, "user_id": current_user.id, "payment_status": "unpaid"}, {"_id": 0})
    if not existing_booking:
        raise HTTPException(status_code=400, detail="No pending booking found. Please create a booking first.")
    
    booking_id = existing_booking["id"]
    
    # Initialize Stripe
    host_url = origin_url
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create checkout session
    amount = float(course["price"])
    currency = course["currency"].lower()
    success_url = f"{origin_url}/booking-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/courses/{course_id}"
    
    metadata = {
        "booking_id": booking_id,
        "course_id": course_id,
        "user_id": current_user.id,
        "course_title": course["title"]
    }
    
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    payment_transaction = PaymentTransaction(
        booking_id=booking_id,
        user_id=current_user.id,
        session_id=session.session_id,
        amount=amount,
        currency=currency,
        payment_status="initiated",
        metadata=metadata
    )
    payment_dict = payment_transaction.model_dump()
    payment_dict["created_at"] = payment_dict["created_at"].isoformat()
    await db.payment_transactions.insert_one(payment_dict)
    
    # Update booking with session ID
    await db.bookings.update_one({"id": booking_id}, {"$set": {"payment_session_id": session.session_id}})
    
    return {"checkout_url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, current_user: User = Depends(get_current_user)):
    # Check if already processed
    existing_transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not existing_transaction:
        raise HTTPException(status_code=404, detail="Payment transaction not found")
    
    if existing_transaction["payment_status"] == "paid":
        return {"status": "paid", "booking_id": existing_transaction["booking_id"]}
    
    # Initialize Stripe
    webhook_url = f"{WEBHOOK_BASE_URL}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Get status from Stripe
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    if checkout_status.payment_status == "paid" and existing_transaction["payment_status"] != "paid":
        # Update payment transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Update booking
        await db.bookings.update_one(
            {"id": existing_transaction["booking_id"]},
            {"$set": {"payment_status": "paid", "status": "confirmed", "amount_paid": checkout_status.amount_total / 100.0}}
        )
        
        return {"status": "paid", "booking_id": existing_transaction["booking_id"]}
    
    return {"status": checkout_status.payment_status, "booking_id": existing_transaction["booking_id"]}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    webhook_url = f"{WEBHOOK_BASE_URL}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            # Update payment transaction
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Get booking ID from metadata
            if webhook_response.metadata and "booking_id" in webhook_response.metadata:
                booking_id = webhook_response.metadata["booking_id"]
                await db.bookings.update_one(
                    {"id": booking_id},
                    {"$set": {"payment_status": "paid", "status": "confirmed"}}
                )
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== ADMIN ====================

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can access stats")
    
    total_schools = await db.schools.count_documents({})
    approved_schools = await db.schools.count_documents({"approved": True})
    pending_schools = await db.schools.count_documents({"approved": False})
    total_courses = await db.courses.count_documents({})
    active_courses = await db.courses.count_documents({"status": {"$in": ["confirmed", "active"]}})
    pending_courses = await db.courses.count_documents({"approved": False})
    total_bookings = await db.bookings.count_documents({})
    paid_bookings = await db.bookings.count_documents({"payment_status": "paid"})
    total_revenue = 0
    
    # Calculate revenue
    revenue_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_paid"}}}
    ]
    revenue_result = await db.bookings.aggregate(revenue_pipeline).to_list(1)
    if revenue_result:
        total_revenue = revenue_result[0].get("total", 0)
    
    # Calculate total booking fees collected
    booking_fees_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$platform_fee"}}}
    ]
    booking_fees_result = await db.bookings.aggregate(booking_fees_pipeline).to_list(1)
    total_booking_fees = 0
    if booking_fees_result:
        total_booking_fees = booking_fees_result[0].get("total", 0)
    
    # Calculate total sales tax collected
    sales_tax_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$sales_tax"}}}
    ]
    sales_tax_result = await db.bookings.aggregate(sales_tax_pipeline).to_list(1)
    total_sales_tax = 0
    if sales_tax_result:
        total_sales_tax = sales_tax_result[0].get("total", 0)
    
    # Calculate total school earnings
    school_earnings_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$school_earnings"}}}
    ]
    school_earnings_result = await db.bookings.aggregate(school_earnings_pipeline).to_list(1)
    total_school_earnings = 0
    if school_earnings_result:
        total_school_earnings = school_earnings_result[0].get("total", 0)
    
    total_locations = await db.locations.count_documents({})
    total_instructors = await db.instructors.count_documents({})
    
    return {
        "total_schools": total_schools,
        "approved_schools": approved_schools,
        "pending_schools": pending_schools,
        "total_courses": total_courses,
        "active_courses": active_courses,
        "pending_courses": pending_courses,
        "total_bookings": total_bookings,
        "paid_bookings": paid_bookings,
        "total_revenue": total_revenue,
        "total_booking_fees": total_booking_fees,
        "total_sales_tax": total_sales_tax,
        "total_school_earnings": total_school_earnings,
        "total_locations": total_locations,
        "total_instructors": total_instructors
    }

@api_router.get("/admin/schools", response_model=List[School])
async def get_all_schools_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can access this")
    schools = await db.schools.find({}, {"_id": 0}).to_list(1000)
    for school in schools:
        if isinstance(school["created_at"], str):
            school["created_at"] = datetime.fromisoformat(school["created_at"])
    return schools

@api_router.get("/admin/programs", response_model=List[Course])
async def get_all_programs_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can access this")
    courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
    for course in courses:
        if isinstance(course["created_at"], str):
            course["created_at"] = datetime.fromisoformat(course["created_at"])
    return courses

# ==================== ADMIN USER MANAGEMENT ====================

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: str = "student"
    phone: Optional[str] = None
    picture: Optional[str] = None
    school_id: Optional[str] = None  # For instructors
    instructor_id: Optional[str] = None  # Link to instructor entity

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None  # New password (optional)
    role: Optional[str] = None  # Can be: student, school, admin, instructor
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    emergency_contact: Optional[str] = None
    martial_arts_background: Optional[str] = None
    experience_level: Optional[str] = None
    school_id: Optional[str] = None  # For instructors
    instructor_id: Optional[str] = None  # Link user to instructor entity

@api_router.get("/admin/users", response_model=List[User])
async def get_all_users_admin(current_user: User = Depends(get_current_user)):
    """Get all users - Admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can access users")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for user in users:
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
    return users

@api_router.post("/admin/users", response_model=User)
async def create_user_admin(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    """Create a new user - Admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    # Check if user already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(user_data.password)
    
    new_user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hashed_password,
        "picture": user_data.picture or f"https://ui-avatars.com/api/?name={user_data.name.replace(' ', '+')}&background=059669&color=fff",
        "role": user_data.role,
        "phone": user_data.phone,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(new_user)
    
    # Remove password_hash from response
    new_user.pop("password_hash", None)
    return User(**new_user)

@api_router.put("/admin/users/{user_id}", response_model=User)
async def update_user_admin(user_id: str, user_data: UserUpdate, current_user: User = Depends(get_current_user)):
    """Update a user - Admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update users")
    
    # Check if user exists
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prepare update data (only update provided fields)
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    
    # Handle password change separately
    if 'password' in update_data and update_data['password']:
        # Validate password length
        if len(update_data['password']) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        # Hash the new password
        update_data['password_hash'] = pwd_context.hash(update_data['password'])
        # Remove plain password from update
        del update_data['password']
    else:
        # Remove password field if it's None or empty
        update_data.pop('password', None)
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    # Get updated user
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if isinstance(updated_user.get("created_at"), str):
        updated_user["created_at"] = datetime.fromisoformat(updated_user["created_at"])
    
    return User(**updated_user)

@api_router.delete("/admin/users/{user_id}")
async def delete_user_admin(user_id: str, current_user: User = Depends(get_current_user)):
    """Delete a user with cascading delete of all related data - Admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    # Prevent deleting self
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Check if user exists
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_role = existing.get("role")
    deleted_items = {
        "user": 1,
        "sessions": 0,
        "schools": 0,
        "courses": 0,
        "locations": 0,
        "instructors": 0,
        "bookings": 0
    }
    
    # If user is a school owner, delete all their school data
    if user_role == "school" or user_role == "admin":
        # Find all schools owned by this user
        schools = await db.schools.find({"owner_id": user_id}).to_list(None)
        
        for school in schools:
            school_id = school["id"]
            
            # Delete all courses associated with this school
            courses_result = await db.courses.delete_many({"school_id": school_id})
            deleted_items["courses"] += courses_result.deleted_count
            
            # Delete all locations associated with this school
            locations_result = await db.locations.delete_many({"school_id": school_id})
            deleted_items["locations"] += locations_result.deleted_count
            
            # Delete all instructors associated with this school
            instructors_result = await db.instructors.delete_many({"school_id": school_id})
            deleted_items["instructors"] += instructors_result.deleted_count
            
            # Delete all bookings for this school's courses
            bookings_result = await db.bookings.delete_many({"school_id": school_id})
            deleted_items["bookings"] += bookings_result.deleted_count
            
            # Delete the school itself
            await db.schools.delete_one({"id": school_id})
            deleted_items["schools"] += 1
    
    # Delete bookings made BY this user (if they're a student)
    if user_role == "student":
        bookings_result = await db.bookings.delete_many({"user_id": user_id})
        deleted_items["bookings"] += bookings_result.deleted_count
    
    # Delete user sessions
    sessions_result = await db.user_sessions.delete_many({"user_id": user_id})
    deleted_items["sessions"] = sessions_result.deleted_count
    
    # Finally, delete the user
    await db.users.delete_one({"id": user_id})
    
    return {
        "success": True, 
        "message": "User and all related data deleted successfully",
        "deleted": deleted_items
    }

@api_router.post("/admin/users/{user_id}/assign-instructor")
async def assign_instructor_to_user_admin(
    user_id: str, 
    instructor_id: str = None,
    current_user: User = Depends(get_current_user)
):
    """Assign instructor role and link to instructor entity - Admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign instructor roles")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # If instructor_id provided, validate it
    if instructor_id:
        instructor = await db.instructors.find_one({"id": instructor_id}, {"_id": 0})
        if not instructor:
            raise HTTPException(status_code=404, detail="Instructor entity not found")
        
        # Check if emails match
        if instructor["email"] != user["email"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Instructor email ({instructor['email']}) must match user email ({user['email']})"
            )
        
        # Check if instructor already linked to another user
        existing_user = await db.users.find_one(
            {"instructor_id": instructor_id, "id": {"$ne": user_id}}, 
            {"_id": 0}
        )
        if existing_user:
            raise HTTPException(
                status_code=400, 
                detail="This instructor is already linked to another user account"
            )
        
        # Update user with instructor role and link
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"role": "instructor", "instructor_id": instructor_id}}
        )
    else:
        # Just set role to instructor without linking
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"role": "instructor"}}
        )
    
    # Return updated user
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if isinstance(updated_user.get("created_at"), str):
        updated_user["created_at"] = datetime.fromisoformat(updated_user["created_at"])
    
    return {"success": True, "user": User(**updated_user)}

@api_router.delete("/admin/schools/{school_id}")
async def delete_school_admin(school_id: str, current_user: User = Depends(get_current_user)):
    """Delete a school with cascading delete of all related data - Admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete schools")
    
    # Check if school exists
    school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    deleted_items = {
        "schools": 0,
        "locations": 0,
        "instructors": 0,
        "courses": 0,
        "bookings": 0
    }
    
    # Delete all courses associated with this school
    courses_result = await db.courses.delete_many({"school_id": school_id})
    deleted_items["courses"] = courses_result.deleted_count
    
    # Delete all locations associated with this school
    locations_result = await db.locations.delete_many({"school_id": school_id})
    deleted_items["locations"] = locations_result.deleted_count
    
    # Delete all instructors associated with this school
    instructors_result = await db.instructors.delete_many({"school_id": school_id})
    deleted_items["instructors"] = instructors_result.deleted_count
    
    # Delete all bookings for this school's courses
    bookings_result = await db.bookings.delete_many({"school_id": school_id})
    deleted_items["bookings"] = bookings_result.deleted_count
    
    # Delete the school itself
    await db.schools.delete_one({"id": school_id})
    deleted_items["schools"] = 1
    
    return {
        "success": True, 
        "message": f"School '{school['name']}' and all related data deleted successfully",
        "deleted": deleted_items
    }

@api_router.delete("/admin/bookings/{booking_id}")
async def delete_booking_admin(booking_id: str, current_user: User = Depends(get_current_user)):
    """Delete a booking - Admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete bookings")
    
    # Check if booking exists
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Delete the booking
    await db.bookings.delete_one({"id": booking_id})
    
    return {
        "success": True, 
        "message": "Booking deleted successfully"
    }


app.include_router(api_router)

# Mount static files AFTER router to avoid conflicts
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','), allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
