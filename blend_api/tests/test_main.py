from blend_api.models import AccessGrant, BlendField, RequestBody


def test_access_grant():
    access_grant = AccessGrant(
        uuid="test_uuid",
        user_attribute="test_user_attribute",
        allowed_values=set(["test_allowed_value"]),
    )
    assert access_grant.name == "access_grant_test_uuid"
    assert (
        access_grant.explore_access_grant.strip()
        == "required_access_grants: [access_grant_test_uuid]"
    )
    assert (
        access_grant.access_grant.strip()
        == """access_grant: access_grant_test_uuid {
  user_attribute: test_user_attribute
  allowed_values: [test_allowed_value]
}"""
    )


def test_body_no_access_grant():
    body = RequestBody(
        uuid="test_uuid",
        url="test_url",
        fields=[
            BlendField(
                name="kewl_order_items",
                type="string",
                label_short="Kewl Order Items",
                view_label="Kewl Order Items",
                group_label="Kewl Order Items",
                description="Kewl Order Items",
                query_uuid="blend_test_uuid",
                sql_alias="kewl_order_items"
            )
        ],
        sql="select * from kewl_order_items",
        explore_ids={"kewl_order_items"},
        includes="test_includes",
        explore_label="test_explore_label",
        project_name="test_proj",
        repo_name="test_repo",
        connection_name="test_conn",
        lookml_model="test_model",
    )
    lkml = body.get_lookml(None)
    # Remove the header comments for testing
    lkml_without_headers = "\n".join(
        line for line in lkml.split("\n") if not line.startswith("#")
    )
    # Normalize whitespace
    actual = " ".join(lkml_without_headers.strip().split())
    expected = " ".join(
        """
            include: "test_includes"

view: blend_test_uuid {
  derived_table: {
    sql: select * from kewl_order_items ;;
  }
  dimension: blend_test_uuid.kewl_order_items {
    label: "Kewl Order Items"
    view_label: "Kewl Order Items"
    group_label: "Kewl Order Items"
    description: "Kewl Order Items"
    type: string
    sql: ${TABLE}.kewl_order_items ;;
  }
}

explore: blend_test_uuid {
  hidden: yes
  label: "test_explore_label"
}""".strip().split()
    )
    print("\nActual output:")
    print(actual)
    print("\nExpected output:")
    print(expected)
    assert actual == expected

def test_blend_field_dimension_types():
    """Checks that forced_dimension_type returns the correct types."""

    # Test for 'number' type
    field_number = BlendField(
        query_uuid="q1",
        name="test.count",
        sql_alias="test_count",
        label_short="Test Count",
        view_label="Test View",
        type="number", # Original type
        field_type="dimension",
    )
    assert field_number.forced_dimension_type == "number", "The 'number' type should be preserved"

    # Test for 'string' type
    field_string = BlendField(
        query_uuid="q1",
        name="test.name",
        sql_alias="test_name",
        label_short="Test Name",
        view_label="Test View",
        type="string", # Original type
        field_type="dimension"
    )
    assert field_string.forced_dimension_type == "string", "The 'string' type should be preserved"

    # Test for a measure type that should be converted to 'number' for the dimension
    field_measure_as_dim = BlendField(
        query_uuid="q1",
        name="test.sum_value",
        sql_alias="test_sum_value",
        label_short="Test Sum",
        view_label="Test View",
        type="sum", # Original type (measure)
        field_type="dimension" # Treated as a dimension in this context
    )
    assert field_measure_as_dim.forced_dimension_type == "number", "The 'sum' type should be forced to 'number' as a dimension"

def test_get_lookml_with_corrected_dimension_type():
    """Checks the generated LookML with a field of type 'number'."""
    body = RequestBody(
        uuid="test_num_type",
        url="test_url",
        fields=[
            BlendField(
                query_uuid="q1",
                name="test.count",
                sql_alias="test_count",
                label_short="Test Count",
                view_label="Test View",
                type="number", # Important: original type
            )
        ],
        sql="select 1 as test_count",
        explore_ids={"model::explore"},
        project_name="test_proj",
        repo_name="test_repo",
        connection_name="test_conn",
        lookml_model="test_model"
    )

    lookml_output = body.get_lookml()

    # Check that "type: number" is present in the LookML output
    assert "type: number" in lookml_output
    # Also check that "type: string" is NOT used for this field
    assert "dimension: q1.test_count {\n    label: \"Test Count\"\n    view_label: \"Test View\"\n    group_label: \"\"\n    description: \"\"\n    type: number\n    sql: ${TABLE}.test_count ;;\n  }" in lookml_output