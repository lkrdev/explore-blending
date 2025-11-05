import os

from looker_sdk import init40
from looker_sdk.rtl import serialize
from looker_sdk.rtl.api_settings import ApiSettings, SettingsConfig
from looker_sdk.rtl.auth_session import AuthSession
from looker_sdk.rtl.requests_transport import RequestsTransport
from looker_sdk.sdk.api40.methods import Looker40SDK


class BlendApiSettings(ApiSettings):
    def read_config(self) -> SettingsConfig:
        return SettingsConfig(
            base_url=self.base_url,
            client_id=self.client_id,
            client_secret=self.client_secret,
        )

    def __init__(self, base_url: str, client_id: str, client_secret: str):
        self.base_url = base_url
        self.client_id = client_id
        self.client_secret = client_secret
        super().__init__()


def get_sdk(
    sdk_client_id: str,
    sdk_client_secret: str,
    sdk_base_url: str,
) -> Looker40SDK:
    single_tenant = os.environ.get("MULTITENANT") == "false"
    if single_tenant:
        # requires LOOKER_SDK_BASE_URL, LOOKER_SDK_CLIENT_ID, LOOKER_SDK_CLIENT_SECRET environment variables to be set
        return init40()
    else:
        settings = BlendApiSettings(
            base_url=sdk_base_url,
            client_id=sdk_client_id,
            client_secret=sdk_client_secret,
        )
        settings.is_configured()
        transport = RequestsTransport.configure(settings)
        auth = AuthSession(settings, transport, serialize.deserialize40, "4.0")  # type: ignore

        return Looker40SDK(
            auth,
            serialize.deserialize40,  # type: ignore
            serialize.serialize40,  # type: ignore
            transport,
            "4.0",
        )
