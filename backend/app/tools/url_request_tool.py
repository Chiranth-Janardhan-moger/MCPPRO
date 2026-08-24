import aiohttp
import asyncio
import ipaddress
import socket
from urllib.parse import urlparse
from typing import Any, Dict, Optional, ClassVar
from app.tools.base import BaseTool, ToolResult
from app.config.settings import settings


def is_safe_url(url: str) -> tuple[bool, str]:
    """Validate a URL against SSRF targets.

    Resolves the hostname and rejects private / loopback / link-local /
    reserved addresses. In development (ENVIRONMENT != production) local
    addresses are allowed so the agent can talk to localhost services.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, f"Unsupported scheme: {parsed.scheme or '(none)'}"
        hostname = parsed.hostname
        if not hostname:
            return False, "URL has no hostname"

        # Block obvious metadata endpoints by name before resolution.
        if hostname.endswith(".internal") or hostname == "metadata.google.internal":
            if settings.ENVIRONMENT.lower() == "production":
                return False, "Internal host blocked"

        infos = socket.getaddrinfo(hostname, None)
        for info in infos:
            ip = ipaddress.ip_address(info[4][0])
            is_local = ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
            if is_local and settings.ENVIRONMENT.lower() == "production":
                return False, f"Access to internal address {ip} is blocked"
        return True, ""
    except socket.gaierror:
        return False, f"Cannot resolve hostname: {hostname}"
    except Exception as e:
        return False, f"URL validation failed: {e}"


class URLRequestTool(BaseTool):
    """
    URL Request Tool with connection pooling
    
    This tool can make HTTP requests to URLs and retrieve content.
    Useful for fetching data from APIs, web pages, or specific endpoints.
    Uses shared connection pool for better performance.
    """
    
    _shared_session: ClassVar[Optional[aiohttp.ClientSession]] = None
    _session_lock: ClassVar[asyncio.Lock] = asyncio.Lock()
    
    def __init__(self):
        super().__init__(
            name="url_request",
            description="Make GET requests to URLs and retrieve content. Simple tool for fetching data from web pages or APIs."
        )
    
    @classmethod
    async def _get_session(cls) -> aiohttp.ClientSession:
        """Get or create shared aiohttp session with connection pooling"""
        async with cls._session_lock:
            if cls._shared_session is None or cls._shared_session.closed:
                timeout_obj = aiohttp.ClientTimeout(total=30)
                connector = aiohttp.TCPConnector(
                    limit=100,
                    limit_per_host=10,
                    keepalive_timeout=30,
                    enable_cleanup_closed=True
                )
                
                headers = {
                    "User-Agent": "MCPPro-Agent/1.0"
                }
                
                cls._shared_session = aiohttp.ClientSession(
                    timeout=timeout_obj,
                    headers=headers,
                    connector=connector
                )
                print("Created shared HTTP session with connection pooling")
            
            return cls._shared_session
    
    @classmethod
    async def cleanup_session(cls):
        """Cleanup shared session (call this on app shutdown)"""
        async with cls._session_lock:
            if cls._shared_session and not cls._shared_session.closed:
                await cls._shared_session.close()
                cls._shared_session = None
                print("Cleaned up shared HTTP session")
    
    @property
    def parameters_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The URL to make a request to"
                }
            },
            "required": ["url"]
        }
    
    async def execute(self, **kwargs) -> ToolResult:
        """
        Execute HTTP request using shared session pool
        
        Args:
            url: URL to request
        
        Returns:
            ToolResult with response content
        """
        try:
            url = kwargs.get("url")
            
            if not url:
                return ToolResult(
                    success=False,
                    error="url parameter is required"
                )

            safe, reason = is_safe_url(url)
            if not safe:
                return ToolResult(
                    success=False,
                    error=f"Blocked URL: {reason}"
                )

            session = await self._get_session()
            
            async with session.get(url) as response:
                
                content_type = response.headers.get("content-type", "").lower()
                
                if "application/json" in content_type:
                    content = await response.json()
                elif "text/" in content_type or "application/xml" in content_type:
                    content = await response.text()
                else:
                    content_bytes = await response.read()
                    try:
                        content = content_bytes.decode('utf-8')
                    except UnicodeDecodeError:
                        import base64
                        content = base64.b64encode(content_bytes).decode('utf-8')
                
                if 200 <= response.status < 300:
                    return ToolResult(
                        success=True,
                        result=content
                    )
                else:
                    return ToolResult(
                        success=False,
                        error=f"HTTP {response.status}: {response.reason}"
                    )
                    
        except asyncio.TimeoutError:
            return ToolResult(
                success=False,
                error="Request timed out after 30 seconds"
            )
        except aiohttp.ClientError as e:
            return ToolResult(
                success=False,
                error=f"HTTP client error: {str(e)}"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"URL request failed: {str(e)}"
            )
