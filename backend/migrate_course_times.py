"""
Migration script to add daily_start_time and daily_end_time to existing courses
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def migrate():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("Starting migration: Adding daily_start_time and daily_end_time to courses...")
    
    # Update all courses that don't have these fields
    result = await db.courses.update_many(
        {
            "$or": [
                {"daily_start_time": {"$exists": False}},
                {"daily_end_time": {"$exists": False}}
            ]
        },
        {
            "$set": {
                "daily_start_time": "09:00",
                "daily_end_time": "17:00"
            }
        }
    )
    
    print(f"✅ Migration complete! Updated {result.modified_count} courses")
    print(f"   Matched {result.matched_count} courses")
    
    # Verify
    total_courses = await db.courses.count_documents({})
    courses_with_times = await db.courses.count_documents({
        "daily_start_time": {"$exists": True},
        "daily_end_time": {"$exists": True}
    })
    
    print(f"\n📊 Verification:")
    print(f"   Total courses: {total_courses}")
    print(f"   Courses with time fields: {courses_with_times}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate())
