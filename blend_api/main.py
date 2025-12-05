import os
from typing import cast

import functions_framework
from structlog import get_logger
from werkzeug import Request

from .functions.get_access_grant import get_access_grant
from .functions.github_commit_and_deploy import github_commit_and_deploy
from .functions.update_user_attributes import update_user_attributes
from .models import AccessGrant, RequestBody, RequestHeaders

PERSONAL_ACCESS_TOKEN = os.environ.get("PERSONAL_ACCESS_TOKEN")

logger = get_logger()


def SuccessResponse(**kwargs):
    return dict(ok=True, **kwargs), 200


# Shared types between dimensions and measures


@functions_framework.http
def main(request: Request):
    if request.method != "POST":
        return dict(ok=False, error="Method not allowed"), 405
    headers: RequestHeaders | None = None
    body: RequestBody | None = None
    access_grant: AccessGrant | None = None

    def ErrorResponse(error: str, **kwargs):
        logger.error(
            error,
            **kwargs,
            body=body.model_dump(mode="json") if body else None,
            headers=headers.model_dump(mode="json") if headers else None,
        )
        return dict(ok=False, error=error, **kwargs), 200

    try:
        headers = cast(RequestHeaders, RequestHeaders.from_request(request))
    except Exception as e:
        return ErrorResponse(str(e))

    # user attribute updater endpoint
    if request.path == "/api/update_user_attributes":
        user_attribute = request.json.get("user_attribute") if request.json else None
        if not headers.host_origin:
            return ErrorResponse("Missing origin of request")
        if not headers.client_id:
            return ErrorResponse("Missing Looker Client ID")
        if not headers.client_secret:
            return ErrorResponse("Missing Looker Client Secret")
        if not user_attribute:
            return ErrorResponse("Missing User Attribute")
        if headers.unfilled_client_id:
            return ErrorResponse(
                f"Please provide a Looker Client ID in the user attribute ({headers.unfilled_client_id})"
            )
        if headers.unfilled_client_secret:
            return ErrorResponse(
                f"Please provide a Looker Client Secret in the user attribute ({headers.unfilled_client_secret})"
            )
        return update_user_attributes(
            sdk_base_url=headers.host_origin,
            sdk_client_id=headers.client_id,
            sdk_client_secret=headers.client_secret.get_secret_value(),
            user_attribute=user_attribute,
        )

    if not headers.host_origin:
        return ErrorResponse("Missing origin of request")

    if not headers.webhook_secret:
        return ErrorResponse("Missing webhook secret")
    elif headers.unfilled_webhook_secret:
        return ErrorResponse(
            f"Unfilled webhook secret ({headers.unfilled_webhook_secret})",
            user_attribute=headers.unfilled_webhook_secret,
        )

    if not headers.personal_access_token:
        return ErrorResponse("Missing personal access token")
    elif headers.unfilled_personal_access_token:
        return ErrorResponse(
            f"Unfilled personal access token ({headers.unfilled_personal_access_token})",
            user_attribute=headers.unfilled_personal_access_token,
        )

    try:
        body = RequestBody(**request.json if request.json else {})
    except Exception as e:
        return ErrorResponse(str(e), referrer=request.referrer)

    # was easier to handle a single "create_measures" and apply it to all fields server-side
    if body.create_measures:
        for field in body.fields:
            if field.field_type == "measure":
                field.create_measure = True

    if body.add_access_grant:
        if not headers.client_id:
            return ErrorResponse("Missing Looker Client ID")
        elif not headers.client_secret:
            return ErrorResponse("Missing Looker Client Secret")
        elif not headers.host_origin:
            return ErrorResponse("Missing Looker Base URL")
        elif not body.user_attribute:
            return ErrorResponse("Missing User Attribute")
        elif headers.unfilled_client_id:
            return ErrorResponse(
                f"Unfilled Looker Client ID ({headers.unfilled_client_id})"
            )
        elif headers.unfilled_client_secret:
            return ErrorResponse(
                f"Unfilled Looker Client Secret ({headers.unfilled_client_secret})"
            )
        else:
            try:
                ag_response = get_access_grant(
                    sdk_client_id=headers.client_id,
                    sdk_client_secret=headers.client_secret.get_secret_value(),
                    sdk_base_url=headers.host_origin,
                    user_attribute=body.user_attribute,
                    models=body.models,
                    uuid=body.uuid,
                )
                if not ag_response["success"]:
                    return ErrorResponse(ag_response.get("error", "Unknown error"))
                else:
                    access_grant = cast(AccessGrant, ag_response["access_grant"])
            except Exception as e:
                return ErrorResponse(str(e))

    lookml = body.get_lookml(access_grant)

    if body.dry_run:
        return dict(
            success=True,
            dry_run=True,
            lookml=lookml,
            lookml_model_name=body.lookml_model,
            explore_name=body.name,
        ), 200

    else:
        try:
            response = github_commit_and_deploy(
                lookml=lookml,
                sdk_base_url=headers.host_origin,
                **body.model_dump(),
                personal_access_token=headers.personal_access_token.get_secret_value(),
                webhook_secret=headers.webhook_secret.get_secret_value(),
            )
            if not response.file.success:
                return ErrorResponse(f"Failed to create file {response.file.filename} in {response.file.repo}: check personal access token user attribute")
            if not response.deploy.success:
                return ErrorResponse(f"Failed to deploy Looker project {response.deploy.project_name}: check deploy webhook secret user attribute")
        except Exception as e:
            logger.exception("Error committing and deploying")
            return ErrorResponse(str(e))

        return SuccessResponse(
            explore_url=body.explore_url,
            explore_id=body.explore_id,
            lookml_model_name=body.lookml_model,
            explore_name=body.name,
            lookml=lookml,
        )
