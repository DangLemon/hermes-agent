"""Shared ``OAuthClientProvider`` customizations for Lemon AI MCP OAuth.

Two code paths build an SDK provider — ``tools.mcp_oauth.build_oauth_auth`` (legacy public
API) and ``tools.mcp_oauth_manager.MCPOAuthManager`` — and both need the same real-world
fixes and config → constructor-kwargs plumbing. This module holds that core once; the origin
modules keep their own subclass (logger name, disk-watch hooks) on top of it.
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from tools.mcp_oauth import LemonTokenStorage
logger = logging.getLogger(__name__)


class LemonProviderMixin:
    """Token-endpoint fixes layered over the SDK's ``OAuthClientProvider`` (must precede it in
    the MRO; subclasses set ``_lemon_logger`` to keep their own logger name).

    - Supabase-style dynamic registration returns a ``client_secret`` but omits
      ``token_endpoint_auth_method``; the SDK then treats the client as public and the token
      endpoint rejects the exchange (looping the browser page) — coerce ``client_secret_post``.
    - ``token_user_agent`` (``oauth.user_agent``) is stamped onto token-endpoint requests only
      (some authorization servers/WAFs reject httpx's default).
    - Any 2xx token/refresh response is accepted; token bodies never leak into errors/logs.
    """

    _lemon_logger: logging.Logger = logger

    def __init__(self, *args: Any, token_user_agent: str | None = None, **kwargs: Any):
        super().__init__(*args, **kwargs)
        self._lemon_token_user_agent = token_user_agent

    def _prepare_token_request(self, request):
        """Stamp the configured User-Agent onto a token/refresh request."""
        ua = getattr(self, "_lemon_token_user_agent", None)
        if ua:
            request.headers["User-Agent"] = ua
        return request

    def _coerce_client_secret_post(self) -> None:
        """Set client_secret_post when a dynamic registration returned a secret."""
        info = self.context.client_info
        if not info:
            return
        from mcp.shared.auth import OAuthClientInformationFull
        from tools.mcp_oauth import LemonTokenStorage
        data = info.model_dump(mode="json", exclude_none=True)
        if LemonTokenStorage._coerce_secret_auth_method(data):
            self.context.client_info = OAuthClientInformationFull.model_validate(data)

    async def _exchange_token_authorization_code(self, *args: Any, **kwargs: Any):
        self._coerce_client_secret_post()
        return self._prepare_token_request(await super()._exchange_token_authorization_code(*args, **kwargs))

    async def _refresh_token(self):
        self._coerce_client_secret_post()
        return self._prepare_token_request(await super()._refresh_token())

    async def _store_tokens(self, token_response) -> None:
        self.context.current_tokens = token_response
        self.context.update_token_expiry(token_response)
        await self.context.storage.set_tokens(token_response)

    async def _handle_token_response(self, response):
        """Accept any 2xx token response; never echo the body into errors."""
        from mcp.client.auth.oauth2 import OAuthTokenError
        if not (200 <= response.status_code < 300):
            raise OAuthTokenError(f"Token exchange failed ({response.status_code})")
        from httpx import HTTPError
        from mcp.client.auth.utils import handle_token_response_scopes
        try:
            token_response = await handle_token_response_scopes(response)
        except (HTTPError, OAuthTokenError):
            raise OAuthTokenError("Invalid token response") from None
        await self._store_tokens(token_response)

    async def _handle_refresh_response(self, response) -> bool:
        """Accept any 2xx refresh response; never log the body."""
        if not (200 <= response.status_code < 300):
            self._lemon_logger.warning("Token refresh failed: %s", response.status_code)
            self.context.clear_tokens()
            return False
        from httpx import HTTPError
        from mcp.shared.auth import OAuthToken
        from pydantic import ValidationError
        try:
            token_response = OAuthToken.model_validate_json(await response.aread())
        except (HTTPError, ValidationError):
            self._lemon_logger.warning("Invalid refresh response: %s", response.status_code)
            self.context.clear_tokens()
            return False
        await self._store_tokens(token_response)
        return True


def prepare_oauth_config(server_name: str, server_url: str, oauth_config: dict | None) -> tuple[dict, "LemonTokenStorage"]:
    """Copy OAuth config and reject unresolved credential placeholders before browser auth."""
    from tools import mcp_oauth as mo
    cfg = dict(oauth_config or {})
    unresolved = [
        key for key in ("client_id", "client_secret")
        if isinstance(cfg.get(key), str) and re.search(r"\$\{[^}]+\}", cfg[key])
    ]
    if unresolved:
        raise ValueError(
            f"unresolved OAuth credential placeholder for MCP server '{server_name}': {', '.join(unresolved)}"
        )
    mo.apply_oauth_provider_defaults(cfg, server_name=server_name, server_url=server_url)
    return cfg, mo.LemonTokenStorage(server_name)


def build_provider_kwargs(cfg: dict, storage: "LemonTokenStorage", *, ssh_proxy_hint: bool) -> dict[str, Any]:
    """Resolve callback settings and return shared provider constructor kwargs."""
    from tools import mcp_oauth as mo
    port = mo._configure_callback_port(cfg, storage)
    client_metadata = mo._build_client_metadata(cfg)
    mo._maybe_preregister_client(storage, cfg, client_metadata)
    redirect_uri = (cfg.get("redirect_uri") or None) if ssh_proxy_hint else None
    return {
        "client_metadata": client_metadata,
        "storage": storage,
        "redirect_handler": mo._make_redirect_handler(port, redirect_uri=redirect_uri),
        "callback_handler": mo._make_callback_waiter(port, cfg.get("_cimd_url"), timeout=float(cfg.get("timeout", 300))),
        "token_user_agent": mo.token_request_user_agent(cfg),
        **mo.cimd_provider_kwargs(cfg)}
