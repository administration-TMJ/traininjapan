"""Create database indexes for scheduling collections"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def create_indexes():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("Creating indexes for scheduling collections...")
    
    # Course Schedules indexes
    await db.course_schedules.create_index("course_id")
    await db.course_schedules.create_index("start_date")
    print("✓ Course schedules indexes created")
    
    # Course Sessions indexes
    await db.course_sessions.create_index("course_id")
    await db.course_sessions.create_index("schedule_id")
    await db.course_sessions.create_index("date")
    await db.course_sessions.create_index("location_id")
    await db.course_sessions.create_index("instructor_id")
    await db.course_sessions.create_index("status")
    await db.course_sessions.create_index([("date", 1), ("location_id", 1)])
    await db.course_sessions.create_index([("date", 1), ("instructor_id", 1)])
    print("✓ Course sessions indexes created")
    
    # Waitlist indexes
    await db.waitlist.create_index("course_id")
    await db.waitlist.create_index("student_id")
    await db.waitlist.create_index("position")
    await db.waitlist.create_index([("course_id", 1), ("position", 1)])
    print("✓ Waitlist indexes created")
    
    # Instructor Availability indexes
    await db.instructor_availability.create_index("instructor_id")
    await db.instructor_availability.create_index("day_of_week")
    print("✓ Instructor availability indexes created")
    
    # Location Calendar Blocks indexes
    await db.location_calendar_blocks.create_index("location_id")
    await db.location_calendar_blocks.create_index("start_date")
    print("✓ Location calendar blocks indexes created")
    
    # Update bookings indexes for session support
    await db.bookings.create_index("session_ids")
    print("✓ Bookings session indexes created")
    
    print("\n✅ All scheduling indexes created successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_indexes())
