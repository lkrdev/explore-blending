# Explore Blending

## Try it Now

-   If you have `sql_runner` permissions in Looker, you can test this extension with no configuration. Add this into any `manifest.lkml` file within any of your LookML projects

```
application: explore_blending {
  label: "Explore Blending (alpha)"
  url: "https://cdn.lkr.dev/apps/explore-blending/latest/bundle.js"
  file: "bundle.js"
  entitlements: {
    local_storage: yes
    navigation: yes
    new_window: yes
    use_form_submit: yes
    use_embeds: yes
    use_clipboard: yes
    core_api_methods: [
      "me",
      "session",
      "all_lookml_models",
      "query",
      "lookml_model_explore",
      "run_query",
      "create_sql_query",
      "run_sql_query",
      "query_for_slug",
      "search_dashboards",
      "create_dashboard_element",
      "connection",
      "dashboard",
      "all_connections",
      "get_artifact",
      "update_artifacts",
      "session"
    ]
    external_api_urls: [
      "https://www.lkr.dev/apps/explore-blending/api"
    ]
  }
}
```

## Built in Extension Settings

## Use LookML

## Configure Required

## Querying Across Models

### Access Grants

API Credentials required

-   Recommended to use the Hide Values yes with the API credential user attributes with a domain allowlist
-   -   `https://www.lkr.dev/apps/explore-blending/*` or https:your.override.api/\*

## Hosting this yourself

### Using override API
