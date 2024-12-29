import pytest
from backend.telemetry.models import Vector3, TelemetryPacket, SimulatorFlags


def test_vector3_model():
    """Test Vector3 model creation and validation"""
    # valid data
    vector = Vector3(x=1.0, y=2.0, z=3.0)
    assert vector.x == 1.0
    assert vector.y == 2.0
    assert vector.z == 3.0

    # invalid data types
    with pytest.raises(ValueError):
        Vector3(x="invalid", y=2.0, z=3.0)


def test_simulator_flags():
    """Test SimulatorFlags enum vals and operations"""
    # individual flags
    assert SimulatorFlags.CAR_ON_TRACK.value == 1
    assert SimulatorFlags.PAUSED.value == 2

    # flag combinations
    flags = SimulatorFlags.CAR_ON_TRACK | SimulatorFlags.HAS_TURBO
    assert SimulatorFlags.CAR_ON_TRACK in flags
    assert SimulatorFlags.HAS_TURBO in flags
    assert SimulatorFlags.PAUSED not in flags


def test_telemetry_packet_model():
    """Test TelemetryPacket model creation and validation."""
    # Test valid data
    packet = TelemetryPacket(
        packet_id=1,
        position=Vector3(x=0.0, y=0.0, z=0.0),
        velocity=Vector3(x=0.0, y=0.0, z=0.0),
        rotation=Vector3(x=0.0, y=0.0, z=0.0),
        rel_orientation_to_north=0.0,
        angular_velocity=Vector3(x=0.0, y=0.0, z=0.0),
        body_height=0.1,
        engine_rpm=1000.0,
        gas_level=50.0,
        gas_capacity=100.0,
        speed_mps=10.0,
        turbo_boost=1.0,
        oil_pressure=5.0,
        water_temp=80.0,
        oil_temp=90.0,
        tire_temp_fl=50.0,
        tire_temp_fr=50.0,
        tire_temp_rl=50.0,
        tire_temp_rr=50.0,
        current_gear=1,
        suggested_gear=2,
        flags=1,
        throttle=128,
        brake=0,
        clutch=1.0,
        clutch_engagement=1.0,
        rpm_after_clutch=1000.0,
        transmission_top_speed=200.0,
        gear_ratios=[3.2, 2.1, 1.5, 1.2, 1.0, 0.9, 0.8, 0.7],
        car_code=1001
    )

    # Verify packet data
    assert packet.packet_id == 1
    assert packet.speed_mps == 10.0
    assert len(packet.gear_ratios) == 8

    # Test invalid values
    with pytest.raises(ValueError):
        TelemetryPacket(
            packet_id="invalid", # not correct
            position=Vector3(x=0.0, y=0.0, z=0.0),
            velocity=Vector3(x=0.0, y=0.0, z=0.0),
            rotation=Vector3(x=0.0, y=0.0, z=0.0),
            rel_orientation_to_north=0.0,
            angular_velocity=Vector3(x=0.0, y=0.0, z=0.0),
            body_height=0.1,
            engine_rpm=1000.0,
            gas_level=50.0,
            gas_capacity=100.0,
            speed_mps=10.0,
            turbo_boost=1.0,
            oil_pressure=5.0,
            water_temp=80.0,
            oil_temp=90.0,
            tire_temp_fl=50.0,
            tire_temp_fr=50.0,
            tire_temp_rl=50.0,
            tire_temp_rr=50.0,
            current_gear=1,
            suggested_gear=2,
            flags=1,
            throttle=128,
            brake=0,
            clutch=1.0,
            clutch_engagement=1.0,
            rpm_after_clutch=1000.0,
            transmission_top_speed=200.0,
            gear_ratios=[3.2, 2.1, 1.5, 1.2, 1.0, 0.9, 0.8, 0.7],
            car_code=1001
        )


def test_telemetry_packet_validation():
    """Test TelemetryPacket validation rules."""
    # test missing required fields
    with pytest.raises(ValueError):
        TelemetryPacket()  # Missing all required fields

    # don't really need to test validation of all the rest of the
    # packet information because GT7 should always be sending values
    # in the correct range.
