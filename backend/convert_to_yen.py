#!/usr/bin/env python3
"""
Script to convert all AUD prices to JPY and multiply by 100
This ensures all prices are in proper JPY format
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'train_in_japan')

# Rough conversion rate: 1 AUD = 100 JPY
AUD_TO_JPY = 100

async def convert_to_yen():
    """Convert all prices to JPY format"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🔍 Converting all prices to Japanese Yen...")
    print(f"Connected to: {MONGO_URL}")
    print(f"Database: {DB_NAME}\n")
    
    # 1. Update Courses
    print("=" * 60)
    print("1. UPDATING COURSES TO JPY")
    print("=" * 60)
    
    # Find all courses (any currency)
    courses = await db.courses.find({}).to_list(None)
    print(f"Found {len(courses)} total courses")
    
    updated_courses = 0
    
    if courses:
        for course in courses:
            old_price = course.get('price', 0)
            old_currency = course.get('currency', 'AUD')
            
            # Convert to JPY
            if old_currency == 'AUD':
                # Convert AUD to JPY (rough: 1 AUD = 100 JPY)
                new_price = old_price * AUD_TO_JPY
            elif old_currency == 'USD':
                # Convert USD to JPY (rough: 1 USD = 146 JPY)
                new_price = old_price * 146
            elif old_currency == 'JPY':
                # Already JPY, just multiply by 100
                new_price = old_price * 100
            else:
                # Default: multiply by 100
                new_price = old_price * 100
            
            # Update course
            await db.courses.update_one(
                {"id": course["id"]},
                {"$set": {"price": new_price, "currency": "JPY"}}
            )
            
            print(f"  ✅ '{course.get('title', 'Unknown')[:40]}'")
            print(f"     {old_currency} {old_price:,.2f} → JPY ¥{new_price:,.0f}")
            updated_courses += 1
        
        print(f"\n✅ Updated {updated_courses} courses to JPY\n")
    else:
        print("  ℹ️  No courses found\n")
    
    # 2. Update Bookings
    print("=" * 60)
    print("2. UPDATING BOOKINGS TO JPY")
    print("=" * 60)
    
    # Get all bookings
    bookings = await db.bookings.find({}).to_list(None)
    print(f"Found {len(bookings)} total bookings")
    
    updated_bookings = 0
    
    if bookings:
        for booking in bookings:
            # Get the course to determine original currency
            course = await db.courses.find_one({"id": booking.get("course_id")}, {"_id": 0})
            
            if course:
                old_currency = course.get("currency", "JPY")
                
                # Determine multiplier
                if old_currency == "JPY":
                    multiplier = 100  # Already JPY, just add zeros
                else:
                    multiplier = 100  # Treat as JPY equivalent
                
                # Update all price fields
                update_fields = {}
                
                if "amount_paid" in booking and booking["amount_paid"]:
                    update_fields["amount_paid"] = booking["amount_paid"] * multiplier
                
                if "platform_fee" in booking and booking["platform_fee"]:
                    update_fields["platform_fee"] = booking["platform_fee"] * multiplier
                
                if "sales_tax" in booking and booking["sales_tax"]:
                    update_fields["sales_tax"] = booking["sales_tax"] * multiplier
                
                if "school_earnings" in booking and booking["school_earnings"]:
                    update_fields["school_earnings"] = booking["school_earnings"] * multiplier
                
                if update_fields:
                    await db.bookings.update_one(
                        {"id": booking["id"]},
                        {"$set": update_fields}
                    )
                    
                    print(f"  ✅ Booking {booking['id'][:8]}... updated")
                    updated_bookings += 1
        
        print(f"\n✅ Updated {updated_bookings} bookings\n")
    else:
        print("  ℹ️  No bookings found\n")
    
    # 3. Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✅ Courses converted to JPY: {updated_courses}")
    print(f"✅ Bookings updated: {updated_bookings}")
    print("\n🎉 Conversion complete!")
    print("\nAll prices are now in Japanese Yen (JPY)")
    print("Prices have been multiplied by 100 for proper JPY format")
    print("Example: $100 AUD → ¥10,000 JPY\n")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(convert_to_yen())
