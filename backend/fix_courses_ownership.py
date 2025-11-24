#!/usr/bin/env python3
"""
Script to fix course ownership issues:
1. Reassign all courses to admin's school
2. Verify all courses have proper school_id
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

async def fix_courses_ownership():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("="*60)
    print("FIXING COURSE OWNERSHIP")
    print("="*60)
    
    # Get admin user
    admin = await db.users.find_one({"email": "administration@traininjapan.com"})
    if not admin:
        print("❌ Admin user not found!")
        return
    
    admin_school_id = admin.get('school_id')
    print(f"✓ Admin user found: {admin['email']}")
    print(f"✓ Admin school ID: {admin_school_id}")
    
    # Get all courses
    all_courses = await db.courses.find({}).to_list(None)
    print(f"\n✓ Found {len(all_courses)} total courses")
    
    # Count courses by school
    courses_by_school = {}
    courses_without_school = []
    
    for course in all_courses:
        school_id = course.get('school_id')
        if school_id:
            courses_by_school[school_id] = courses_by_school.get(school_id, 0) + 1
        else:
            courses_without_school.append(course['id'])
    
    print(f"\nCourses distribution:")
    for school_id, count in courses_by_school.items():
        marker = "👑" if school_id == admin_school_id else "  "
        print(f"  {marker} School {school_id}: {count} courses")
    
    if courses_without_school:
        print(f"  ⚠  Courses without school_id: {len(courses_without_school)}")
    
    # Reassign all courses to admin school
    print(f"\n📝 Reassigning all courses to admin school...")
    result = await db.courses.update_many(
        {},
        {"$set": {"school_id": admin_school_id}}
    )
    print(f"✓ Updated {result.modified_count} courses")
    
    # Verify
    admin_courses = await db.courses.find({"school_id": admin_school_id}).to_list(None)
    print(f"✓ Admin now has {len(admin_courses)} courses")
    
    # Show all courses
    print(f"\nAll courses now assigned to admin:")
    for i, course in enumerate(admin_courses, 1):
        print(f"  {i}. {course['title']}")
        print(f"     ID: {course['id']}")
        print(f"     School ID: {course.get('school_id')}")
        print(f"     Image: {course.get('image_url', 'None')[:50]}...")
        print()
    
    client.close()
    print("="*60)
    print("✅ COURSE OWNERSHIP FIX COMPLETE")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(fix_courses_ownership())
