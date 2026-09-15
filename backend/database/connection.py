"""MongoDB Atlas connection helpers.

The client is created lazily from MONGODB_URI and can be used by future
services without opening a connection during module import.
"""

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


try:
    import certifi
    ca_file = certifi.where()
except ImportError:
    ca_file = None


@lru_cache(maxsize=1)
def get_client() -> MongoClient:
    """Return the shared Atlas client configured by environment variables."""
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI is not configured.")

    kwargs = {
        "appname": os.getenv("MONGODB_APP_NAME", "debris-detector"),
        "serverSelectionTimeoutMS": int(os.getenv("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "5000")),
    }

    if ca_file:
        kwargs["tlsCAFile"] = ca_file

    # Bypass SSL handshake verification errors in development/hackathon environments
    if os.getenv("MONGODB_ALLOW_INVALID_CERTS", "true").lower() == "true":
        kwargs["tlsAllowInvalidCertificates"] = True

    return MongoClient(uri, **kwargs)


def get_database() -> Database[Any]:
    """Return the configured database, defaulting to debris_detector."""
    database_name = os.getenv("MONGODB_DATABASE", "debris_detector")
    return get_client()[database_name]


def ping_mongodb() -> bool:
    """Verify that Atlas is reachable with the configured credentials."""
    get_client().admin.command("ping")
    return True


def close_mongodb() -> None:
    """Close the shared client and clear its cache."""
    if get_client.cache_info().currsize:
        get_client().close()
    get_client.cache_clear()
