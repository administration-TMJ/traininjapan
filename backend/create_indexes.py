"""
Database Index Creation Script
Run this script to create recommended indexes for production performance
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def create_indexes():
    """Create all recommended indexes for the database"""
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("Creating indexes for Train In Japan database...")
    
    # Clean up duplicate session tokens before creating unique index
    print("Cleaning up duplicate session tokens...")
    pipeline = [
        {"$group": {"_id": "$session_token", "count": {"$sum": 1}, "ids": {"$push": "$_id"}}},
        {"$match": {"count": {"$gt": 1}}}
    ]
    duplicates = await db.user_sessions.aggregate(pipeline).to_list(1000)
    for dup in duplicates:
        # Keep first, delete rest
        ids_to_delete = dup["ids"][1:]
        await db.user_sessions.delete_many({"_id": {"$in": ids_to_delete}})
        print(f"  Removed {len(ids_to_delete)} duplicate session(s) for token: {dup['_id'][:20]}...")
    
    # User sessions - most critical for authentication
    try:
        await db.user_sessions.create_index("session_token", unique=True)
        print("✓ Created index on user_sessions.session_token")
    except Exception as e:
        if "already exists" in str(e):
            print("✓ Index on user_sessions.session_token already exists")
        else:
            print(f"⚠ Warning creating index on user_sessions.session_token: {e}")
    
    # Helper function to create index with error handling
    async def safe_create_index(collection, field_or_list, unique=False, name=None):
        try:
            if isinstance(field_or_list, list):
                await collection.create_index(field_or_list, unique=unique, name=name)
            else:
                await collection.create_index(field_or_list, unique=unique)
            desc = name if name else (field_or_list if isinstance(field_or_list, str) else str(field_or_list))
            print(f"✓ Created index on {collection.name}.{desc}")
        except Exception as e:
            if "already exists" in str(e) or "Index with name" in str(e):
                desc = name if name else (field_or_list if isinstance(field_or_list, str) else str(field_or_list))
                print(f"✓ Index on {collection.name}.{desc} already exists")
            else:
                print(f"⚠ Warning: {e}")
    
    await safe_create_index(db.user_sessions, "user_id")
    await safe_create_index(db.user_sessions, "expires_at")
    
    # Users
    await safe_create_index(db.users, "email", unique=True)
    await safe_create_index(db.users, "id", unique=True)
    
    await safe_create_index(db.users, "role")
    
    # Schools
    await safe_create_index(db.schools, "id", unique=True)
    await safe_create_index(db.schools, "owner_id")
    await safe_create_index(db.schools, "approved")
    
    # Courses
    await safe_create_index(db.courses, "id", unique=True)
    await safe_create_index(db.courses, "school_id")
    await safe_create_index(db.courses, "location_id")
    await safe_create_index(db.courses, "instructor_id")
    await safe_create_index(db.courses, "status")
    
    # Bookings - critical for queries
    await safe_create_index(db.bookings, "id", unique=True)
    await safe_create_index(db.bookings, "course_id")
    await safe_create_index(db.bookings, "user_id")
    await safe_create_index(db.bookings, "payment_status")
    await safe_create_index(db.bookings, "status")
    
    # Compound index for common query pattern
    await safe_create_index(db.bookings, [("course_id", 1), ("user_id", 1), ("payment_status", 1)], name="booking_query_compound")
    
    # Payment transactions
    await safe_create_index(db.payment_transactions, "id", unique=True)
    await safe_create_index(db.payment_transactions, "session_id", unique=True)
    await safe_create_index(db.payment_transactions, "booking_id")
    await safe_create_index(db.payment_transactions, "user_id")
    await safe_create_index(db.payment_transactions, "payment_status")
    
    # Locations
    await safe_create_index(db.locations, "id", unique=True)
    await safe_create_index(db.locations, "school_id")
    
    # Instructors
    await safe_create_index(db.instructors, "id", unique=True)
    await safe_create_index(db.instructors, "school_id")
    await safe_create_index(db.instructors, "available")
    
    print("\n✅ All indexes created successfully!")
    print("\nYou can verify indexes by running:")
    print("  db.collection_name.getIndexes()")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_indexes())
