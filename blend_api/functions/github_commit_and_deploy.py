import requests
from github import Auth, Github


def github_commit_and_deploy(
    lookml: str,
    uuid: str,
    repo_name: str,
    personal_access_token: str,
    webhook_secret: str,
    project_name: str,
    sdk_base_url: str,
):
    if not repo_name:
        raise ValueError("repo_name is required")
    auth = Auth.Token(personal_access_token)
    g = Github(auth=auth)
    filename = f"blends/{uuid}.explore.lkml"

    # Get repository
    repo = g.get_repo(repo_name)

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
        # File doesn't exist, create new file
        repo.create_file(path=filename, message=f"Create blend {uuid}", content=lookml)
        # Call deploy webhook if secret provided
        if webhook_secret:
            url = f"{sdk_base_url}/webhooks/projects/{project_name}/deploy"
            response = requests.post(
                url,
                headers={
                    "X-Looker-Deploy-Secret": webhook_secret,
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
    return dict(success=True)
