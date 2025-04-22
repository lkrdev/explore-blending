from blend_api.models import AccessGrant, BlendField, RequestBody


def test_access_grant():
    access_grant = AccessGrant(
        uuid="test_uuid",
        user_attribute="test_user_attribute",
        allowed_values=["test_allowed_value"],
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
                alias="kewl_order_items",
                label_short="Kewl Order Items",
                view_label="Kewl Order Items",
                group_label="Kewl Order Items",
                description="Kewl Order Items",
            )
        ],
        sql="select * from kewl_order_items",
        models={"kewl_order_items"},
        explore_ids={"kewl_order_items"},
        includes="test_includes",
        explore_label="test_explore_label",
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
  dimension: kewl_order_items {
    label: "Kewl Order Items"
    view_label: "Kewl Order Items"
    group_label: "Kewl Order Items"
    description: "Kewl Order Items"
    type: string
    sql: ${TABLE}.kewl_order_items ;;
  }
}

explore: blend_test_uuid {
  label: "test_explore_label"
}""".strip().split()
    )
    print("\nActual output:")
    print(actual)
    print("\nExpected output:")
    print(expected)
    assert actual == expected
