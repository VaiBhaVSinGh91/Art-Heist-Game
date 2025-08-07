import redis
import os 

# This will connect to your local Valkey instance.
# Later, for deployment, you will replace this with a connection URL
# from your hosting provider (e.g., Heroku).
valkey_client = redis.Redis(
    host=os.environ.get("VALKEY_HOST", "localhost"),
    port=int(os.environ.get("VALKEY_PORT", 6379)),
    db=0,
    decode_responses=True # This is crucial: it ensures you get strings, not bytes.
)

def get_valkey_client():
    """
    A dependency function to provide the Valkey client to your API endpoints.
    """
    return valkey_client