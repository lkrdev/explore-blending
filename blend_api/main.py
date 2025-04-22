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
    print(request.headers)
    print(request.json)
    personal_access_token = (
        request.headers.get("X-Personal-Access-Token") or PERSONAL_ACCESS_TOKEN
    )
    logger.info(
        "Personal access token",
        personal_access_token=personal_access_token,
        ptoken=PERSONAL_ACCESS_TOKEN,
    )
    if not personal_access_token:
        return "Missing or invalid personal access token", 400

    sdk_client_id = request.headers.get("X-Client-Id")
    sdk_client_secret = request.headers.get("X-Client-Secret")
    sdk_base_url = request.headers.get("X-Base-Url")
    logger.info(
        "SDK base url",
        sdk_base_url=sdk_base_url,
    )
    if not sdk_base_url:
        return "Missing or invalid sdk base url", 400
    webhook_secret = request.headers.get("X-Webhook-Secret")

    body = RequestBody.model_validate(request.json)
    print(body.model_dump_json())
    access_grants: AccessGrant | None = None
    if sdk_client_id and sdk_client_secret and sdk_base_url:
        access_grants = get_access_grant(
            sdk_client_id=sdk_client_id,
            sdk_client_secret=sdk_client_secret,
            sdk_base_url=sdk_base_url,
            user_attribute=body.user_attribute,
            models=body.models,
            uuid=body.uuid,
        )

    lookml = body.get_lookml(access_grants)
    print(lookml)
    github_commit_and_deploy(
        lookml=lookml,
        uuid=body.uuid,
        repo_name=body.repo_name,
        personal_access_token=personal_access_token,
        webhook_secret=webhook_secret,
        project_name=body.project_name,
        sdk_base_url=sdk_base_url,
        lookml_model=body.lookml_model,
    )
    explore_url = f"{sdk_base_url}/explore/{body.lookml_model}/{body.name}"

    return dict(success=True, explore_url=explore_url)


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
