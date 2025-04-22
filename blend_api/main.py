import os

import functions_framework
from functions.get_access_grant import get_access_grant
from functions.github_commit_and_deploy import github_commit_and_deploy
from models import AccessGrant, RequestBody
from structlog import get_logger
from werkzeug import Request

PERSONAL_ACCESS_TOKEN = os.environ.get("PERSONAL_ACCESS_TOKEN")

logger = get_logger()

# Shared types between dimensions and measures


@functions_framework.http
def hello_world(request: Request):
    personal_access_token = (
        request.headers.get("x-personal-access-token") or PERSONAL_ACCESS_TOKEN
    )
    if personal_access_token != PERSONAL_ACCESS_TOKEN:
        return "Missing or invalid personal access token", 400

    sdk_client_id = request.headers.get("x-client-id")
    sdk_client_secret = request.headers.get("x-client-secret")
    sdk_base_url = request.headers.get("x-base-url")
    if not sdk_base_url:
        return "Missing or invalid sdk base url", 400
    webhook_secret = request.headers.get("x-webhook-secret")

    body = RequestBody.model_validate_json(request.json)

    access_grants: AccessGrant | None = None
    if sdk_client_id and sdk_client_secret and sdk_base_url and webhook_secret:
        access_grants = get_access_grant(
            sdk_client_id=sdk_client_id,
            sdk_client_secret=sdk_client_secret,
            sdk_base_url=sdk_base_url,
            user_attribute=body.user_attribute,
            models=body.models,
            uuid=body.uuid,
        )

    lookml = body.get_lookml(access_grants)

    github_commit_and_deploy(
        lookml,
        body.uuid,
        "blend-api",
        personal_access_token,
        webhook_secret,
        project_name=body.project_name,
        sdk_base_url=sdk_base_url,
    )

    return dict(success=True)


if __name__ == "__main__":
    from models import AccessGrant

    body = RequestBody(
        uuid="test",
        url="test",
        fields=[],
    )
    access_grant = AccessGrant(
        uuid="test",
        user_attribute="test",
        allowed_values={"test"},
    )
    print(body.get_lookml(access_grant))
