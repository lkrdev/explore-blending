from blend_api.models import BlendField

def test_date_type_mapping():
    """
    Tests that date-related types are correctly mapped to LookML types
    to avoid type mismatches with string-formatted SQL.
    """
    test_cases = [
        # (original_type, expected_lookml_type)
        ("date_month_num", "number"),
        ("date_date", "date"),
        ("date_time", "date_time"),
        ("date_week", "string"),
        ("date_month", "string"),
        
        # Numeric date types
        ("date_year", "number"),
        ("date_day_of_month", "number"),
        ("date_day_of_week_index", "number"),
        ("date_day_of_year", "number"),
        ("date_fiscal_month_num", "number"),
        ("date_fiscal_year", "number"),
        ("date_hour_of_day", "number"),
        ("date_week_of_year", "number"),

        # String date types
        ("date_quarter", "string"),
        ("date_day_of_week", "string"),
        ("date_fiscal_quarter", "string"),
        ("date_fiscal_quarter_of_year", "string"),
        ("date_month_name", "string"),
        ("date_time_of_day", "string"),
        
        # Granular timestamps
        ("date_hour", "string"),
        ("date_minute", "string"),
        ("date_second", "string"),
    ]

    for original_type, expected_type in test_cases:
        field_name = f"orders.created_{original_type}"
        field = BlendField(
            query_uuid="q1",
            name=field_name,
            sql_alias="test_alias",
            label_short="Test Label",
            view_label="Test View",
            type=original_type,
            field_type="dimension",
            query_alias="q1",
        )
        
        assert field.forced_dimension_type == expected_type, (
            f"Failed for {original_type} (name: {field_name}). "
            f"Expected {expected_type}, got {field.forced_dimension_type}"
        )
