from pydantic import SecretStr

from blend_api.models import RequestHeaders


def test_secretstr_fields_remain_unchanged():
    """Test that SecretStr fields in RequestHeaders remain as SecretStr types."""
    # Create a RequestHeaders instance and assign SecretStr values directly
    # This simulates how load_env() assigns SecretStr values
    headers = RequestHeaders()
    headers.webhook_secret = SecretStr("test_webhook_secret")
    headers.personal_access_token = SecretStr("test_pat")
    headers.client_secret = SecretStr("test_client_secret")

    # Verify that the fields are still SecretStr types
    assert isinstance(headers.webhook_secret, SecretStr), (
        "webhook_secret should remain as SecretStr"
    )
    assert isinstance(headers.personal_access_token, SecretStr), (
        "personal_access_token should remain as SecretStr"
    )
    assert isinstance(headers.client_secret, SecretStr), (
        "client_secret should remain as SecretStr"
    )
