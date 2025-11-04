from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Literal, TypedDict, cast

from lkr import UserAttributeUpdater
from looker_sdk.sdk.api40.methods import Looker40SDK
from looker_sdk.sdk.api40.models import WriteUserAttributeWithValue
from structlog import get_logger

logger = get_logger()


class UpdateUserAttributesSuccess(TypedDict):
    success: Literal[True]
    error: None


class UpdateUserAttributesError(TypedDict):
    number_of_groups_updated: int
    success: Literal[False]


def update_user_by_id(
    user_attribute_id: str,
    looker_user_id: str,
    value: str,
    sdk: Looker40SDK,
) -> UpdateUserAttributesSuccess | UpdateUserAttributesError:
    try:
        sdk.set_user_attribute_user_value(
            user_id=looker_user_id,
            user_attribute_id=user_attribute_id,
            body=WriteUserAttributeWithValue(value=value),
        )
        return dict(success=True)
    except Exception as e:
        logger.error("Error getting SDK", error=e)
        return dict(success=False, error=str(e))


def update_user_attributes(
    *,
    sdk_base_url: str,
    sdk_client_id: str,
    sdk_client_secret: str,
    user_attribute: str,
):
    try:
        uau = UserAttributeUpdater(
            base_url=sdk_base_url,
            client_id=sdk_client_id,
            client_secret=sdk_client_secret,
            user_attribute=user_attribute,
            update_type="group",
        )
        sdk = cast(Looker40SDK, uau._get_sdk())

        user_attribute_id = uau._get_user_attribute_id(sdk)
        if not user_attribute_id:
            raise ValueError("User attribute not found")
        all_users = sdk.all_users(fields="id,group_ids")
        all_group_id = set()
        for user in all_users:
            if user.group_ids:
                all_group_id.update(set(user.group_ids))
        # remove all users group
        all_group_id.discard("1")
        search_groups = sdk.search_groups(id=",".join(list(all_group_id)))
        keyed_group = {group.id: group for group in search_groups}
        number_of_users_updated = 0
        erroring_users = []

        def update_user(user):
            group_ua_value = [
                keyed_group[group_id].name
                for group_id in user.group_ids or []
                if group_id in keyed_group
            ]
            try:
                result = update_user_by_id(
                    user_attribute_id=cast(str, user_attribute_id),
                    looker_user_id=cast(str, user.id),
                    value=",".join(filter(lambda x: x is not None, group_ua_value)),
                    sdk=sdk,
                )
                return result
            except Exception as e:
                logger.error(
                    "Error updating user",
                    error=e,
                    user_id=user.id,
                    user_attribute_id=user_attribute_id,
                    group_ua_value=group_ua_value,
                )
                return None

        with ThreadPoolExecutor(max_workers=25) as executor:
            futures = {executor.submit(update_user, user): user for user in all_users}
            for future in as_completed(futures):
                result = future.result()
                if result and result.get("success"):
                    number_of_users_updated += 1
                else:
                    logger.error(
                        "Error updating user",
                        error=result.get("error"),
                        user_id=result.get("user_id"),
                        user_attribute_id=user_attribute_id,
                        group_ua_value=result.get("group_ua_value"),
                    )
                    erroring_users.append(
                        dict(
                            user_id=result.get("user_id"),
                            error=result.get("error"),
                            group_ua_value=result.get("group_ua_value"),
                        )
                    )
        return dict(
            success=number_of_users_updated == len(all_users),
            number_of_users_updated=number_of_users_updated,
            number_of_users=len(all_users),
            erroring_users=erroring_users if erroring_users else None,
        )
    except Exception as e:
        logger.error("Error getting SDK", error=e)
        return dict(success=False, error=str(e), erroring_users=None)
