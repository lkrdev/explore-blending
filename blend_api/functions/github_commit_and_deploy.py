import requests
from github import Auth, Github
from structlog import get_logger

logger = get_logger(__name__)


def github_commit_and_deploy(
    *,
    lookml: str,
    uuid: str,
    repo_name: str,
    personal_access_token: str,
    webhook_secret: str,
    project_name: str,
    sdk_base_url: str,
    lookml_model: str,
    connection_name: str,
    **kwargs,
):
    if not repo_name:
        raise ValueError("repo_name is required")
    auth = Auth.Token(personal_access_token)
    g = Github(auth=auth)
    filename = f"blends/{lookml_model}/{uuid}.explore.lkml"

    # Get repository
    repo = g.get_repo(repo_name)
    try:
        repo.get_contents("blends")
    except Exception:
        logger.info("Creating blends directory")
        repo.create_file("blends/.gitkeep", "Create blends directory", "")
    try:
        repo.get_contents(f"blends/{lookml_model}")
    except Exception:
        logger.info("Creating model directory")
        repo.create_file(
            f"blends/{lookml_model}/.gitkeep", "Create model directory", ""
        )
    try:
        repo.get_contents(f"blends/{lookml_model}/{lookml_model}.model.lkml")
    except Exception:
        logger.info("Creating model file")
        repo.create_file(
            f"blends/{lookml_model}/{lookml_model}.model.lkml",
            "Create model file",
            f'connection: "{connection_name}"\ninclude: "*.explore.lkml"',
        )
    try:
        # Try to get existing file contents
        contents = repo.get_contents(filename)
        repo.update_file(
            path=filename,
            message=f"Update blend {uuid}",
            content=lookml,
            sha=contents.sha,
        )
    except Exception:
        logger.info("Creating new blend file")
        # File doesn't exist, create new file
        repo.create_file(path=filename, message=f"Create blend {uuid}", content=lookml)
        # Call deploy webhook if secret provided
    logger.info("Calling deploy webhook")
    if webhook_secret:
        url = f"{sdk_base_url}/webhooks/projects/{project_name}/deploy"
        response = requests.post(
            url,
            headers={
                "X-Looker-Deploy-Secret": webhook_secret,
                "Content-Type": "application/json",
            },
        )
        logger.info("Deploy webhook called", response=response.json())
        response.raise_for_status()
    return dict(success=True, file_name=f"blends/{lookml_model}/{uuid}.explore.lkml")
