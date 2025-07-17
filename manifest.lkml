project_name: "project_name"

application: explore_blending {
  label: "Explore Blending (alpha)"
  # url: "https://localhost:8080/bundle.js"
  # url: "https://cdn.lkr.dev/apps/explore-blending/latest/bundle.js"
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
      "all_lookml_models", 
      "query", 
      "lookml_model_explore", 
      "run_query", 
      "create_sql_query", 
      "run_sql_query", 
      "search_dashboards", 
      "create_dashboard_element", 
      "connection", 
      "search_dashboards", 
      "dashboard", 
      "all_connections",
      "update_artifacts"
    ]
    external_api_urls: [ 
      "https://www.lkr.dev/apps/explore-blending/api"
    ]
  }
}