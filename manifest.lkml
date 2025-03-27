project_name: "kitchensink"

application: kitchensink {
  label: "Kitchen sink"
  url: "https://localhost:8080/bundle.js"
  # file: "bundle.js"
  entitlements: {
    local_storage: yes
    navigation: yes
    new_window: yes
    use_form_submit: yes
    use_embeds: yes
    core_api_methods: ["me", "all_lookml_models", "query"]
    external_api_urls: ["http://localhost:8080","https://localhost:8080","https://0.0.0.0:8080","https://localhost:8080","https://196695c7-88ae-4f8a-877a-3b9b74840afb-extensions.cloud.looker.com:8080"]
  }
}
