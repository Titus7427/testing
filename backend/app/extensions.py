from datetime import datetime, timezone

from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_migrate import Migrate
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy


# Core extensions

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per minute"],
    storage_uri="memory://",
)


def utc_now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)
