import requests
from github import Auth, Github
from structlog import get_logger
from pydantic import BaseModel

logger = get_logger(__name__)

class ResponseFile(BaseModel):
    success: bool
    filename: str
    repo: str
    error: str | None = None

class ResponseDeploy(BaseModel):
    success: bool
    project_name: str
    error: str | None = None

class Response(BaseModel):
    file: ResponseFile
    deploy: ResponseDeploy


def github_commit_and_deploy(
    *,
    lookml: str,
    uuid: str,
    repo_name: str,
    personal_access_token: str,
    webhook_secret: str | None,
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
    out = Response(
        file=ResponseFile(success=False, filename=filename, repo=repo_name),
        deploy=ResponseDeploy(success=False, project_name=project_name),
    )
    # Get repository
    repo = g.get_repo(repo_name)
    try:
        repo.get_contents("blends")
    except Exception:
        logger.debug(f"Creating blends directory", project_name=project_name, repo_name=repo_name)
        repo.create_file("blends/.gitkeep", "Create blends directory", "")
    try:
        repo.get_contents(f"blends/{lookml_model}")
    except Exception:
        logger.debug(
            "Creating model directory", 
            project_name=project_name, 
            repo_name=repo_name, 
            lookml_model=lookml_model
        )
        repo.create_file(
            f"blends/{lookml_model}/.gitkeep", "Create model directory", ""
        )
    try:
        repo.get_contents(f"blends/{lookml_model}/{lookml_model}.model.lkml")
    except Exception:
        logger.debug("Creating model file")
        repo.create_file(
            f"blends/{lookml_model}/{lookml_model}.model.lkml",
            "Create model file",
            f'connection: "{connection_name}"\ninclude: "*.explore.lkml"',
        )
    try:
        # Try to get existing file contents
        contents = repo.get_contents(filename)
        if isinstance(contents, list):
            contents = contents[0]
        repo.update_file(
            path=filename,
            message=f"Update blend {uuid}",
            content=lookml,
            sha=contents.sha,
        )
        out.file.success = True
    except Exception:
        logger.debug(
            "Creating new blend file", 
            project_name=project_name, 
            repo_name=repo_name, 
            lookml_model=lookml_model, 
            uuid=uuid, filename=filename
        )
        # File doesn't exist, create new file
        repo.create_file(path=filename, message=f"Create blend {uuid}", content=lookml)
        out.file.success = True
    # Call deploy webhook if secret provided
    if webhook_secret:
        logger.debug("Calling deploy webhook")
        url = f"{sdk_base_url}/webhooks/projects/{project_name}/deploy"
        try:
            response = requests.post(
                url,
                headers={
                    "X-Looker-Deploy-Secret": webhook_secret,
                    "Content-Type": "application/json",
                },
            )
            if response and response.status_code != 200:
                logger.error("Deploy webhook failed", status_code=response.status_code, response=response.text)
                out.deploy.error = response.text
            else:
                out.deploy.success = True
        except Exception as e:
            logger.error("Error calling deploy webhook", error=str(e))
            out.deploy.error = str(e)
    return out
