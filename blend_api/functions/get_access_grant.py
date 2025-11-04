import os
from typing import Dict, List, Literal, Set, TypedDict, cast

from looker_sdk.sdk.api40.models import Group
from structlog import get_logger

from ..models import AccessGrant
from .utils import get_sdk

logger = get_logger()


class AccessGrantSuccess(TypedDict):
    access_grant: AccessGrant | None
    success: Literal[True]


class AccessGrantError(TypedDict):
    error: str
    success: Literal[False]
    access_grant: None


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
) -> AccessGrantSuccess | AccessGrantError:
    if not models:
        logger.error("No models provided", sdk_base_url=sdk_base_url)
        return dict(
            access_grant=None,
            success=False,
            error="No models provided",
        )
    sdk = get_sdk(sdk_client_id, sdk_client_secret, sdk_base_url)
    model_groups: Dict[ModelName, Set[GroupId]] = {
        cast(ModelName, k): cast(Set[GroupId], set()) for k in models
    }
    model_roles: Dict[ModelName, Set[RoleId]] = {
        cast(ModelName, k): cast(Set[RoleId], set()) for k in models
    }
    all_groups: List[Group] = []

    # Get all roles
    # filter only roles that have models from the method argument
    # for each filtered role, get the groups
    # compare the groups from each model
    # return the intersection of groups

    roles = sdk.all_roles()
    for role in roles:
        for model_name in models:
            if role.model_set and model_name in cast(Set[str], role.model_set.models):
                model_roles[cast(ModelName, model_name)].add(cast(RoleId, role.id))

    for model_name in models:
        model_role_set = model_roles[cast(ModelName, model_name)]
        for role_id in model_role_set:
            role_groups = sdk.role_groups(role_id)
            all_groups.extend(role_groups)
            model_groups[cast(ModelName, model_name)].update(
                [cast(GroupId, group.id) for group in role_groups]
            )

    group_intersection = set()
    for i, model_name in enumerate(models):
        if i == 0:
            group_intersection = model_groups[cast(ModelName, model_name)]
        else:
            group_intersection = group_intersection.intersection(
                model_groups[cast(ModelName, model_name)]
            )

    filtered_groups = set(
        [
            cast(GroupId, group.id)
            for group in all_groups
            if group.id in cast(Set[str], group_intersection)
        ]
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
                allowed_values=cast(Set[str], filtered_groups),
            ),
            success=True,
        )
