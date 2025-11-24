"""
Populate database with real courses from traininjapan.com for 2027
All courses at Kowakan Dojo, Matsumoto
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Course data from traininjapan.com
COURSES_DATA = [
    {
        "title": "Foundation Koryu - Asayama Ichiden Ryu",
        "description": "Asayama Ichiden-ryū is a venerable koryū (old school) of comprehensive Japanese martial arts founded around 1566. This 4-week intensive course covers practical armed and unarmed combat, including intricate jujutsu, kenjutsu (swordsmanship), and various weapon arts.",
        "martial_arts_style": "Asayama Ichiden Ryu",
        "category": "Martial Arts",
        "experience_level": "beginner",
        "class_type": "group",
        "price": 4750.00,
        "currency": "AUD",
        "duration": "4 weeks",
        "capacity": 20,
        "prerequisites": "No prior experience required. Commitment to intensive training schedule.",
        "start_date": "2027-04-01",
        "end_date": "2027-04-30",
        "image_url": "https://static.wixstatic.com/media/3ed8bf_af9bb49d7ced4b5eb09fbcb0a187c9ef~mv2.jpg"
    },
    {
        "title": "Shotokan Karate Seminar - Black Belt Level",
        "description": "Exclusive black belt seminar in traditional Shotokan Karate. Focus on advanced kata, kumite techniques, and teaching methodology. Led by master instructors from the Japan Karate Association.",
        "martial_arts_style": "Shotokan Karate",
        "category": "Martial Arts",
        "experience_level": "advanced",
        "class_type": "seminar",
        "price": 1900.00,
        "currency": "AUD",
        "duration": "1 week",
        "capacity": 20,
        "prerequisites": "Black belt (Shodan or higher) in Shotokan Karate required.",
        "start_date": "2027-05-11",
        "end_date": "2027-05-18",
        "image_url": "https://static.wixstatic.com/media/3ed8bf_f00ff143586641efa2844b7ecbcc9388~mv2.jpg"
    },
    {
        "title": "Aikikai Aikido Seminar - Black Belt Level",
        "description": "Advanced Aikikai Aikido seminar for black belt practitioners. Deep dive into aikido principles, advanced techniques, and weapons work (jo and bokken). Direct transmission from Aikikai Hombu Dojo lineage.",
        "martial_arts_style": "Aikikai Aikido",
        "category": "Martial Arts",
        "experience_level": "advanced",
        "class_type": "seminar",
        "price": 1900.00,
        "currency": "AUD",
        "duration": "2 weeks",
        "capacity": 20,
        "prerequisites": "Black belt (Shodan or higher) in Aikido required.",
        "start_date": "2027-05-25",
        "end_date": "2027-06-08",
        "image_url": "https://static.wixstatic.com/media/3ed8bf_a0a531f225e041cc96ac6c91121b2664~mv2.jpg"
    },
    {
        "title": "ANKF Kyudo - Traditional Japanese Archery",
        "description": "Learn the Way of the Bow with the All Nippon Kyudo Federation standards. This course covers fundamental form, ceremonial practice, and the meditative aspects of traditional Japanese archery.",
        "martial_arts_style": "Kyudo",
        "category": "Archery",
        "experience_level": "beginner",
        "class_type": "group",
        "price": 2400.00,
        "currency": "AUD",
        "duration": "3 weeks",
        "capacity": 15,
        "prerequisites": "No experience required. Patience and dedication to traditional learning methods.",
        "start_date": "2027-06-15",
        "end_date": "2027-07-06",
        "image_url": "https://static.wixstatic.com/media/3ed8bf_84b7ccbd5cb3402f8ff805304b01dc63~mv2.jpg"
    },
    {
        "title": "Mugai Ryū Iaihyōdō - Sword Drawing Art",
        "description": "Mugai Ryū is a highly regarded style of Iaido with strong emphasis on practical application and deep connection to Zen Buddhism. Learn the art of drawing the Japanese sword with precision and mindfulness.",
        "martial_arts_style": "Mugai Ryu Iaido",
        "category": "Sword Arts",
        "experience_level": "intermediate",
        "class_type": "group",
        "price": 3200.00,
        "currency": "AUD",
        "duration": "4 weeks",
        "capacity": 15,
        "prerequisites": "Previous martial arts experience recommended. Own iaito (practice sword) preferred.",
        "start_date": "2027-07-10",
        "end_date": "2027-08-07",
        "image_url": "https://static.wixstatic.com/media/3ed8bf_2d489f971dff4eee8200bbd24ec58637~mv2.jpg"
    },
    {
        "title": "Musō Jikiden Eishin-ryū Iaido",
        "description": "MJER is a prominent traditional school of Iaido with roots over 450 years old. Master the fluid movements of drawing, cutting, and re-sheathing the katana in this comprehensive course.",
        "martial_arts_style": "Muso Jikiden Eishin-ryu",
        "category": "Sword Arts",
        "experience_level": "beginner",
        "class_type": "group",
        "price": 2800.00,
        "currency": "AUD",
        "duration": "3 weeks",
        "capacity": 15,
        "prerequisites": "No experience required. Respect for traditional Japanese culture essential.",
        "start_date": "2027-08-15",
        "end_date": "2027-09-05",
        "image_url": "https://static.wixstatic.com/media/3ed8bf_304e3db2e47742189c663d48942799fd~mv2.jpg"
    },
    {
        "title": "Daito Ryu Aikijujutsu - Classical Jujutsu",
        "description": "Daitō-ryū is a classical martial art with over 1,000 years of history. Learn the foundational techniques that influenced modern Aikido, including joint locks, throws, and vital point manipulation.",
        "martial_arts_style": "Daito Ryu",
        "category": "Martial Arts",
        "experience_level": "intermediate",
        "class_type": "group",
        "price": 3800.00,
        "currency": "AUD",
        "duration": "4 weeks",
        "capacity": 18,
        "prerequisites": "Previous jujutsu or aikido experience strongly recommended.",
        "start_date": "2027-09-10",
        "end_date": "2027-10-08",
        "image_url": "https://static.wixstatic.com/media/3ed8bf_67188e03f937488b930fb0a7c9b9a63e~mv2.jpg"
    },
    {
        "title": "Katanakaji - The Art of Sword Smithing",
        "description": "Rare opportunity to learn authentic Japanese swordsmithing methods. Work directly with a master smith to understand traditional forging, folding, and tempering techniques. Create your own blade.",
        "martial_arts_style": "Sword Smithing",
        "category": "Cultural Arts",
        "experience_level": "beginner",
        "class_type": "workshop",
        "price": 7900.00,
        "currency": "AUD",
        "duration": "6 weeks",
        "capacity": 8,
        "prerequisites": "Physical fitness required. No prior smithing experience needed.",
        "start_date": "2027-10-15",
        "end_date": "2027-11-26",
        "image_url": "https://static.wixstatic.com/media/3ed8bf_304e3db2e47742189c663d48942799fd~mv2.jpg"
    },
    {
        "title": "Ikebana - Japanese Flower Arrangement",
        "description": "Discover the ancient art of Ikebana, the Japanese way of arranging flowers. Learn fundamental principles, seasonal arrangements, and the meditative practice of creating living art.",
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
        "description": "Begin the Way of Writing. Learn the fundamental strokes, proper brush techniques, and the meditative aspects of Japanese calligraphy. Practice traditional characters and create your own works.",
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
        "description": "Master the elegant art of Japanese ink wash painting. Learn brush control, composition, and the philosophy of capturing essence rather than detail. Create traditional subjects like bamboo and landscapes.",
        "martial_arts_style": "Ink Painting",
        "category": "Cultural Arts",
        "experience_level": "beginner",
        "class_type": "workshop",
        "price": 1900.00,
        "currency": "AUD",
        "duration": "2 weeks",
        "capacity": 12,
        "prerequisites": "None. Artistic inclination helpful but not required.",
        "start_date": "2027-11-20",
        "end_date": "2027-12-04",
        "image_url": "https://static.wixstatic.com/media/3ed8bf_e8c12d1378d54fa1929d67129ee9b464~mv2.jpg"
    },
    {
        "title": "Taiko - Japanese Drumming",
        "description": "Learn the powerful performing art of Japanese drumming. Master rhythm, coordination, and the physical techniques of playing traditional taiko drums. Culminates in a group performance.",
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

async def populate_courses():
    """Populate database with 2027 courses at Kowakan Dojo"""
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 60)
    print("POPULATING 2027 COURSES AT KOWAKAN DOJO, MATSUMOTO")
    print("=" * 60)
    
    # Step 1: Create or get Kowakan school
    print("\n1. Setting up Kowakan Dojo...")
    school = await db.schools.find_one({"name": "Kowakan Dojo"}, {"_id": 0})
    
    if not school:
        # Find admin user
        admin_user = await db.users.find_one({"role": "admin"}, {"_id": 0})
        if not admin_user:
            print("  ⚠ No admin user found. Creating default admin...")
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
            print(f"  ✓ Created admin user: {admin_user['email']}")
        
        school_id = str(uuid.uuid4())
        school = {
            "id": school_id,
            "name": "Kowakan Dojo",
            "owner_id": admin_user["id"],
            "description": "Traditional martial arts and cultural training center in the heart of the Japanese Alps. Kowakan Dojo preserves authentic Japanese budo traditions while welcoming international students.",
            "history": "Established in Matsumoto, Nagano Prefecture, Kowakan Dojo serves as a gateway for authentic Japanese martial arts training. Our facility honors traditional teaching methods passed down through generations.",
            "location": "Matsumoto, Nagano Prefecture, Japan",
            "contact_email": "administration@traininjapan.com",
            "contact_phone": "+81-263-xxx-xxxx",
            "website": "https://traininjapan.com",
            "logo_url": "https://static.wixstatic.com/media/3ed8bf_67188e03f937488b930fb0a7c9b9a63e~mv2.jpg",
            "approved": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.schools.insert_one(school)
        print(f"  ✓ Created Kowakan Dojo school")
    else:
        school_id = school["id"]
        print(f"  ✓ Found existing Kowakan Dojo school")
    
    # Step 2: Create default location
    print("\n2. Setting up training location...")
    location = await db.locations.find_one({"school_id": school_id, "name": "Main Dojo"}, {"_id": 0})
    
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
            "facilities": ["Tatami mats", "Weapon racks", "Changing rooms", "Showers", "Tea room"],
            "description": "Traditional training hall with authentic Japanese atmosphere. Located near Matsumoto Castle.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.locations.insert_one(location)
        print(f"  ✓ Created Main Dojo location")
    else:
        location_id = location["id"]
        print(f"  ✓ Found existing Main Dojo location")
    
    # Step 3: Create default instructor
    print("\n3. Setting up instructor...")
    instructor = await db.instructors.find_one({"school_id": school_id, "name": "Master Instructor Team"}, {"_id": 0})
    
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
            "bio": "Our team of master instructors brings decades of combined experience in traditional Japanese martial arts and cultural practices. Each instructor maintains active lineage connections to their respective schools in Japan.",
            "specialties": ["Koryu Bujutsu", "Modern Budo", "Cultural Arts", "Weapons Training"],
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.instructors.insert_one(instructor)
        print(f"  ✓ Created Master Instructor Team")
    else:
        instructor_id = instructor["id"]
        print(f"  ✓ Found existing instructor")
    
    # Step 4: Create courses
    print(f"\n4. Creating {len(COURSES_DATA)} courses for 2027...")
    created_count = 0
    
    for course_data in COURSES_DATA:
        # Check if course already exists
        existing = await db.courses.find_one({
            "school_id": school_id,
            "title": course_data["title"],
            "start_date": course_data["start_date"]
        }, {"_id": 0})
        
        if existing:
            print(f"  ⚠ Skipping '{course_data['title']}' - already exists")
            continue
        
        course_id = str(uuid.uuid4())
        course = {
            "id": course_id,
            "school_id": school_id,
            "location_id": location_id,
            "instructor_id": instructor_id,
            "status": "confirmed",  # Pre-approved for existing school
            "instructor_confirmed": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **course_data
        }
        
        await db.courses.insert_one(course)
        created_count += 1
        print(f"  ✓ Created: {course_data['title']} (${course_data['price']:.2f} {course_data['currency']})")
    
    print(f"\n✅ Successfully created {created_count} courses!")
    print(f"📅 All courses scheduled for 2027")
    print(f"🏯 Location: Kowakan Dojo, Matsumoto, Nagano")
    print(f"🌐 Visit: https://japanrail.preview.emergentagent.com/programs")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(populate_courses())
