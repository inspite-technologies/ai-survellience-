import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "face_recognition")

print(f"Connecting to {MONGO_URI}...")
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db["face_vectors"]

print(f"Total documents in face_vectors: {collection.count_documents({})}")

# Check first 5 documents
cursor = collection.find().limit(10)
print("\nFirst 10 documents:")
for doc in cursor:
    emp_id = doc.get("employee_id")
    print(f"ID: {emp_id} (Type: {type(emp_id)})")
    if isinstance(emp_id, str) and len(emp_id) == 32:
        print("  -> ⚠️ FOUND 32-CHAR STRING (Potential MD5 Hash)")

print("\nScan complete.")
client.close()
