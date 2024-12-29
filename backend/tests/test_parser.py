import pytest
import struct
import backend.telemetry.models
from backend.telemetry.parser import TelemetryParser


@pytest.fixture
def sample_telemetry_data():
    """Create sample binary telemetry data for testing."""
    data = bytearray(0x128)  # Create buffer of correct size

    # packet ID
    struct.pack_into('i', data, 0x70, 12345)

    # position
    struct.pack_into('f', data, 0x04, 100.0)  # x
    struct.pack_into('f', data, 0x08, 200.0)  # y
    struct.pack_into('f', data, 0x0C, 300.0)  # z

    # engine data
    struct.pack_into('f', data, 0x3C, 3000.0)  # RPM
    struct.pack_into('f', data, 0x44, 50.0)  # Gas level
    struct.pack_into('f', data, 0x48, 100.0)  # Gas capacity

    # car control
    struct.pack_into('B', data, 0x90, 0x21)  # Current gear (1) and suggested gear (2)
    struct.pack_into('B', data, 0x91, 128)  # Throttle
    struct.pack_into('B', data, 0x92, 0)  # Brake

    return data


def test_parser_initialization():
    """Test parser initialization."""
    parser = TelemetryParser()
    assert parser is not None


def test_parser_basic_parsing(sample_telemetry_data):
    """Test basic telemetry data parsing."""
    parser = TelemetryParser()
    result = parser.parse(sample_telemetry_data)

    assert result.packet_id == 12345
    assert result.position.x == 100.0
    assert result.position.y == 200.0
    assert result.position.z == 300.0
    assert result.engine_rpm == 3000.0
    assert result.gas_level == 50.0
    assert result.gas_capacity == 100.0
    assert result.current_gear == 1
    assert result.suggested_gear == 2
    assert result.throttle == 128
    assert result.brake == 0


def test_parser_invalid_data():
    """Test parser behavior with invalid data."""
    parser = TelemetryParser()

    # Test with empty data
    with pytest.raises(Exception):
        parser.parse(bytearray(0))

    # Test with incomplete data
    with pytest.raises(Exception):
        parser.parse(bytearray(10))

    # Test with None
    with pytest.raises(Exception):
        parser.parse(None)


@pytest.mark.parametrize("field_offset,field_value,field_type", [
    (0x3C, 8000.0, 'engine_rpm'),
    (0x44, 75.0, 'gas_level'),
    (0x48, 150.0, 'gas_capacity'),
])
def test_parser_specific_fields(sample_telemetry_data, field_offset, field_value, field_type):
    """Test parsing of specific telemetry fields."""
    struct.pack_into('f', sample_telemetry_data, field_offset, field_value)

    parser = TelemetryParser()
    result = parser.parse(sample_telemetry_data)

    assert getattr(result, field_type) == field_value