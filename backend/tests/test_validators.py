import pytest
from backend.app_config.validators import validate_ps_ip, is_valid_ip


def test_is_valid_ip():
    """Test IP address validation function."""
    # Test valid IP addresses
    assert is_valid_ip("192.168.1.1")
    assert is_valid_ip("10.0.0.1")
    assert is_valid_ip("172.16.254.1")

    # Test invalid IP addresses
    assert not is_valid_ip("256.1.2.3")
    assert not is_valid_ip("1.2.3.256")
    assert not is_valid_ip("192.168.1")
    assert not is_valid_ip("192.168.1.1.1")
    assert not is_valid_ip("192.168.1.a")


def test_validate_ps_ip():
    """Test PlayStation IP validation function."""
    # valid IP addresses
    assert validate_ps_ip("192.168.1.1") == "192.168.1.1"
    assert validate_ps_ip("  192.168.1.1  ") == "192.168.1.1"  # Test whitespace trimming

    # invalid inputs
    with pytest.raises(ValueError, match="IP address is required"):
        validate_ps_ip("")

    with pytest.raises(ValueError, match="Invalid IP address format"):
        validate_ps_ip("invalid")

    with pytest.raises(ValueError, match="Invalid IP Address"):
        validate_ps_ip("256.256.256.256")

    with pytest.raises(ValueError, match="IP address is required"):
        validate_ps_ip(None)

    # malformed IP addresses
    with pytest.raises(ValueError):
        validate_ps_ip("192.168.1")

    with pytest.raises(ValueError):
        validate_ps_ip("192.168.1.1.1")