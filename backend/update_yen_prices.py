#!/usr/bin/env python3
"""
Script to update all Yen prices by multiplying by 100 (appending two zeros)
This converts prices like ¥100 to ¥10,000
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'train_in_japan')

async def update_yen_prices():
    """Update all JPY prices by multiplying by 100"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🔍 Checking database for JPY prices...")
    print(f"Connected to: {MONGO_URL}")
    print(f"Database: {DB_NAME}\n")
    
    # 1. Update Courses
    print("=" * 60)
    print("1. UPDATING COURSES")
    print("=" * 60)
    
    # Find all courses with JPY currency
    courses = await db.courses.find({"currency": "JPY"}).to_list(None)
    print(f"Found {len(courses)} courses with JPY currency")
    
    if courses:
        for course in courses:
            old_price = course.get('price', 0)
            new_price = old_price * 100
            
            await db.courses.update_one(
                {"id": course["id"]},
                {"$set": {"price": new_price}}
            )
            print(f"  ✅ Course '{course.get('title', 'Unknown')}': ¥{old_price:,.0f} → ¥{new_price:,.0f}")
        
        print(f"\n✅ Updated {len(courses)} courses\n")
    else:
        print("  ℹ️  No JPY courses found\n")
    
    # 2. Update Bookings
    print("=" * 60)
    print("2. UPDATING BOOKINGS")
    print("=" * 60)
    
    # Get all bookings
    bookings = await db.bookings.find({}).to_list(None)
    print(f"Found {len(bookings)} total bookings")
    
    updated_bookings = 0
    
    if bookings:
        for booking in bookings:
            # Get the course to check currency
            course = await db.courses.find_one({"id": booking.get("course_id")}, {"_id": 0})
            
            if course and course.get("currency") == "JPY":
                # Update all price fields by multiplying by 100
                update_fields = {}
                
                if "amount_paid" in booking and booking["amount_paid"]:
                    old_amount = booking["amount_paid"]
                    update_fields["amount_paid"] = old_amount * 100
                
                if "platform_fee" in booking and booking["platform_fee"]:
                    old_fee = booking["platform_fee"]
                    update_fields["platform_fee"] = old_fee * 100
                
                if "sales_tax" in booking and booking["sales_tax"]:
                    old_tax = booking["sales_tax"]
                    update_fields["sales_tax"] = old_tax * 100
                
                if "school_earnings" in booking and booking["school_earnings"]:
                    old_earnings = booking["school_earnings"]
                    update_fields["school_earnings"] = old_earnings * 100
                
                if update_fields:
                    await db.bookings.update_one(
                        {"id": booking["id"]},
                        {"$set": update_fields}
                    )
                    
                    print(f"  ✅ Booking {booking['id'][:8]}...")
                    if "amount_paid" in update_fields:
                        print(f"     Total: ¥{booking['amount_paid']:,.0f} → ¥{update_fields['amount_paid']:,.0f}")
                    updated_bookings += 1
        
        print(f"\n✅ Updated {updated_bookings} JPY bookings\n")
    else:
        print("  ℹ️  No bookings found\n")
    
    # 3. Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✅ Courses updated: {len(courses)}")
    print(f"✅ Bookings updated: {updated_bookings}")
    print("\n🎉 Price update complete!")
    print("\nAll JPY prices have been multiplied by 100.")
    print("Example: ¥100 → ¥10,000\n")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(update_yen_prices())
