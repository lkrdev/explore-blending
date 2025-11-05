# Explore Blending

This is an early version of a Looker extension that allows explore users to blend explores together, choose join paths, and perform custom calculations (custom dimensions, custom measures and table calculations) on top of the result. It's an alternative version of merge results that lets an end user do joins on the full explore queries. Explore blending lets you take any number of Looker explore queries and join them together in the database. It's like merge results beyond just a simple in-memory engine. There are two main modes, SQL and LookML modes, we highly recommend using the LookML mode as it provides the most functionality, however any user with SQL Runner access can test out the functionality with the SQL model

## How it works

## Use cases

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
