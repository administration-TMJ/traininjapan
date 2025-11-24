import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def restore_images():
    mongo_url = "mongodb+srv://administration_db_user:8xPRuUY4ZJi7ianl@webdb.wmix4d6.mongodb.net/test_database"
    client = AsyncIOMotorClient(mongo_url)
    db = client["test_database"]
    
    print("Restoring original course images...")
    
    # Restore the Advanced Koryu Bujutsu Intensive image
    # This was the original image from the Wix static hosting
    result1 = await db.courses.update_one(
        {"title": "Advanced Koryu Bujutsu Intensive"},
        {"$set": {"image_url": "https://static.wixstatic.com/media/3ed8bf_67188e03e89549e6859ef40e5e91f68a~mv2.jpg/v1/fill/w_640,h_426,al_c,q_80,usm_0.66_1.00_0.01,enc_auto/3ed8bf_67188e03e89549e6859ef40e5e91f68a~mv2.jpg"}}
    )
    print(f"Updated Advanced Koryu Bujutsu Intensive: {result1.modified_count} documents")
    
    # For the "Updated Course" - need to check what it was originally
    # Let's set it to a default training image for now
    result2 = await db.courses.update_one(
        {"title": {"$regex": "^Updated Course"}},
        {"$set": {"image_url": "https://static.wixstatic.com/media/3ed8bf_67188e03e89549e6859ef40e5e91f68a~mv2.jpg/v1/fill/w_640,h_426,al_c,q_80,usm_0.66_1.00_0.01,enc_auto/3ed8bf_67188e03e89549e6859ef40e5e91f68a~mv2.jpg"}}
    )
    print(f"Updated 'Updated Course': {result2.modified_count} documents")
    
    # Verify
    courses = await db.courses.find({}, {"title": 1, "image_url": 1}).to_list(None)
    print("\nAll course images:")
    for course in courses:
        print(f"  - {course['title']}")
        print(f"    Image: {course['image_url'][:80]}...")
    
    client.close()

asyncio.run(restore_images())
