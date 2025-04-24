import os
from typing import Dict, List, Set

from looker_sdk import init40
from looker_sdk.rtl import serialize
from looker_sdk.rtl.api_settings import ApiSettings, SettingsConfig
from looker_sdk.rtl.auth_session import AuthSession
from looker_sdk.rtl.requests_transport import RequestsTransport
from looker_sdk.sdk.api40.methods import Looker40SDK
from looker_sdk.sdk.api40.models import Group
from models import AccessGrant
from structlog import get_logger

logger = get_logger()


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
        auth = AuthSession(settings, transport, serialize.deserialize40, "4.0")

        return Looker40SDK(
            auth,
            serialize.deserialize40,
            serialize.serialize40,
            transport,
            "4.0",
        )


class ModelName(str):
    pass


class RoleId(str):
    pass


class GroupId(str):
    pass


def get_access_grant(
    *,
    sdk_client_id: str,
    sdk_client_secret: str,
    sdk_base_url: str,
    user_attribute: str,
    models: Set[str],
    uuid: str,
):
    if not models:
        logger.error("No models provided", sdk_base_url=sdk_base_url)
        raise ValueError("No models provided")
    sdk = get_sdk(sdk_client_id, sdk_client_secret, sdk_base_url)
    model_groups: Dict[ModelName, Set[GroupId]] = {k: set() for k in models}
    model_roles: Dict[ModelName, Set[RoleId]] = {k: set() for k in models}
    all_groups: List[Group] = []

    # Get all roles
    # filter only roles that have models from the method argument
    # for each filtered role, get the groups
    # compare the groups from each model
    # return the intersection of groups

    roles = sdk.all_roles()
    for role in roles:
        for model_name in models:
            if model_name in role.model_set.models:
                model_roles[model_name].add(role.id)

    for model_name in models:
        model_role_set = model_roles[model_name]
        for role_id in model_role_set:
            role_groups = sdk.role_groups(role_id)
            all_groups.extend(role_groups)
            model_groups[model_name].update([group.id for group in role_groups])

    group_intersection = set()
    for i, model_name in enumerate(models):
        if i == 0:
            group_intersection = model_groups[model_name]
        else:
            group_intersection = group_intersection.intersection(
                model_groups[model_name]
            )

    filtered_groups = set(
        [group.name for group in all_groups if group.id in group_intersection]
    )
    if len(filtered_groups) == 0:
        logger.error(
            "No intersection groups found",
            models=list(models),
            all_groups=all_groups,
            group_intersection=group_intersection,
            roles=roles,
            model_groups=model_groups,
            model_roles=model_roles,
            sdk_base_url=sdk_base_url,
        )
        return dict(
            access_grant=None,
            success=False,
            error="No intersection groups found",
        )
    else:
        return dict(
            access_grant=AccessGrant(
                uuid=uuid,
                user_attribute=user_attribute,
                allowed_values=list(filtered_groups),
            ),
            success=True,
        )
