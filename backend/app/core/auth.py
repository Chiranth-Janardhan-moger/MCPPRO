import hmac
import logging

from fastapi import HTTPException, Request, status

from app.config.settings import settings

logger = logging.getLogger(__name__)


async def verify_token(request: Request) -> bool:
    """Validate the static bearer token using a constant-time comparison."""
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )

    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )

    token = auth_header.split(" ", 1)[1]

    expected = settings.BEARER_TOKEN or ""
    # hmac.compare_digest prevents timing side channels on token comparison.
    if not expected or not hmac.compare_digest(token.encode(), expected.encode()):
        logger.warning("Rejected request with invalid bearer token from %s", request.client.host if request.client else "unknown")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    return True
