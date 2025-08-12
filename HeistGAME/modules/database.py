import redis
import os 

database_url = os.environ.get("DATABASE_URL")

if database_url:
    # Production: Use the full Redis URL from Render
    valkey_client = redis.from_url(database_url, decode_responses=True)
else:
    # Local development: Use individual host/port settings
    valkey_client = redis.Redis(
        host=os.environ.get("VALKEY_HOST", "localhost"),
        port=int(os.environ.get("VALKEY_PORT", 6379)),
        db=0,
        decode_responses=True
    )

def get_valkey_client():
    """
    A dependency function to provide the Valkey client to your API endpoints.
    """
    return valkey_client