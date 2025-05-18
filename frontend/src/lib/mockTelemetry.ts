import { TelemetryPacket, SimulatorFlags, CarInfo, Vector3 } from '@/types/telemetry';

// default mock car info
const defaultCarInfo: CarInfo = {
  car_id: 374,
  name: 'Mazda RX-7 GT-X (FC) \'90',
  maker_id: 21,
  maker_name: 'Mazda', // Mazda
  image_url: 'https://gtplus.app/_next/image?url=%2Fimages%2Fcars%2Fmazda-rx-7-gt-x-(fc)-90.jpg&w=1920&q=75'
};

// default telemetry state that is the starting point
const createDefaultTelemetryPacket = (): TelemetryPacket => {
  return {
    // Position and Movement
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    rel_orientation_to_north: 0,
    angular_velocity: { x: 0, y: 0, z: 0 },
    body_height: 0.4,

    // Engine and Performance
    engine_rpm: 0,
    gas_level: 40,
    gas_capacity: 65,
    speed_mps: 0,
    turbo_boost: 1.0,
    oil_pressure: 6.5,
    water_temp: 90,
    oil_temp: 85,

    // Tire Data Surface Temperature
    tire_temp_fl: 60,
    tire_temp_fr: 60,
    tire_temp_rl: 60,
    tire_temp_rr: 60,

    // Race Information
    packet_id: 0,
    time_of_day: 12,  // Noon
    preRaceStartPosition: 8,
    numCarsAtPreRace: 16,
    
    // Car Control
    min_alert_rpm: 5500,
    max_alert_rpm: 7000,
    calculate_max_speed: 260,
    flags: SimulatorFlags.CAR_ON_TRACK,
    current_gear: 0,  // neutral
    suggested_gear: 15, // no suggestion
    throttle: 0,
    brake: 0,

    // Road Data
    roadPlane: { x: 0, y: 1, z: 0 },
    roadPlaneDistance: 0.4,

    // Transmission
    clutch_pedal: 0,
    clutch_engagement: 1,
    rpm_after_clutch: 0,
    transmission_top_speed: 260,
    gear_ratios: [3.76, 2.16, 1.41, 1.0, 0.76, 0.61], // Example gear ratios

    // Lap and Position Information
    best_lap_time: 92500,  // 1:32.5
    last_lap_time: 94300,  // 1:34.3
    current_lap: 1,
    total_laps: 5,
    current_position: 8,
    total_positions: 16,

    // Fuel Information
    fuel_percentage: 75.5,
    fuel_capacity: 65,
    current_fuel: 49.075, // 75.5% of 65L
    fuel_consuption_lap: 2.1,

    // RPM Info
    rpm_flashing: 7000,
    rpm_hit: 8000,

    // Car Code
    car_id: 1234,
    car_info: defaultCarInfo
  };
};

// helper to get a random value within a range
const getRandomValue = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

// class to manage mock telemetry state and updates
export class MockTelemetryGenerator {
  private telemetry: TelemetryPacket;
  private interval: NodeJS.Timeout | null = null;
  private updateCallbacks: ((data: TelemetryPacket) => void)[] = [];
  private scenarioRunning: boolean = false;
  private scenarioTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.telemetry = createDefaultTelemetryPacket();
  }

  // add callback to be called on every data update
  subscribe(callback: (data: TelemetryPacket) => void): () => void {
    this.updateCallbacks.push(callback);
    // return unsubscribe function
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
    };
  }

  // start generating mock data
  start() {
    if (this.interval) {
      return;
    }
    
    this.interval = setInterval(() => {
      // apply automatic variations ONLY if a specific scenario isn't running
      if (!this.scenarioRunning) {
        this.applyVariations();
      }
      // notify subscribers of updated data
      this.notifySubscribers();
    }, 100); // update 10 times per second
  }

  // stop generating mock data
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.scenarioTimeout) {
      clearTimeout(this.scenarioTimeout);
      this.scenarioTimeout = null;
      this.scenarioRunning = false;
    }
  }

  // apply small random variations to make the data look "live"
  private applyVariations() {
    // only apply variations if car is in gear and on track
    if (this.telemetry.current_gear > 0 && (this.telemetry.flags & SimulatorFlags.CAR_ON_TRACK)) {
      // RPM variations
      let rpmDelta = getRandomValue(-50, 50);
      // if accelerating, RPM tends to increase, if braking, RPM tends to decrease
      if (this.telemetry.throttle > 0) {
        rpmDelta += this.telemetry.throttle * 0.5;
      }
      if (this.telemetry.brake > 0) {
        rpmDelta -= this.telemetry.brake * 0.5;
      }
      
      this.telemetry.engine_rpm = Math.max(
        this.telemetry.current_gear === 0 ? 800 : 1200, 
        Math.min(this.telemetry.rpm_hit, this.telemetry.engine_rpm + rpmDelta)
      );

      // speed variations based on throttle/brake
      if (this.telemetry.throttle > 0) {
        this.telemetry.speed_mps += (this.telemetry.throttle / 255) * 0.2;
      }
      if (this.telemetry.brake > 0) {
        this.telemetry.speed_mps = Math.max(0, this.telemetry.speed_mps - (this.telemetry.brake / 255) * 0.4);
      }

      // fuel consumption
      if (this.telemetry.speed_mps > 10) {
        // higher fuel consumption at higher RPM
        const fuelDelta = (this.telemetry.engine_rpm / this.telemetry.rpm_hit) * 0.001;
        this.telemetry.fuel_percentage = Math.max(0, this.telemetry.fuel_percentage - fuelDelta);
        this.telemetry.current_fuel = (this.telemetry.fuel_percentage / 100) * this.telemetry.fuel_capacity;
      }

      // tire temperature variations
      const tireTempChange = getRandomValue(-0.2, 0.5);
      // tire temps increase with speed and cornering
      if (this.telemetry.speed_mps > 30) {
        this.telemetry.tire_temp_fl += tireTempChange;
        this.telemetry.tire_temp_fr += tireTempChange;
        this.telemetry.tire_temp_rl += tireTempChange;
        this.telemetry.tire_temp_rr += tireTempChange;
      }
    }

    // Ensure tire temperatures stay within realistic bounds
    this.telemetry.tire_temp_fl = Math.min(110, Math.max(30, this.telemetry.tire_temp_fl));
    this.telemetry.tire_temp_fr = Math.min(110, Math.max(30, this.telemetry.tire_temp_fr));
    this.telemetry.tire_temp_rl = Math.min(110, Math.max(30, this.telemetry.tire_temp_rl));
    this.telemetry.tire_temp_rr = Math.min(110, Math.max(30, this.telemetry.tire_temp_rr));
  }

  // Notify all subscribers with the current data
  private notifySubscribers() {
    // Create a deep copy to prevent external modifications
    const dataCopy = JSON.parse(JSON.stringify(this.telemetry));
    this.updateCallbacks.forEach(callback => callback(dataCopy));
  }

  // Update telemetry values based on user input
  updateValues(updates: Partial<TelemetryPacket>) {
    this.telemetry = {
      ...this.telemetry,
      ...updates
    };
    this.notifySubscribers();
  }

  // Reset to default state
  reset() {
    this.telemetry = createDefaultTelemetryPacket();
    this.notifySubscribers();
  }

  // Run a specific scenario
  runScenario(scenarioName: string) {
    this.scenarioRunning = true;
    
    // Reset any previous scenario timeout
    if (this.scenarioTimeout) {
      clearTimeout(this.scenarioTimeout);
      this.scenarioTimeout = null;
    }
    
    switch (scenarioName) {
      case 'race_start':
        this.raceStartScenario();
        break;
      case 'cornering':
        this.corneringScenario();
        break;
      case 'pit_stop':
        this.pitStopScenario();
        break;
      case 'hard_braking':
        this.hardBrakingScenario();
        break;
      case 'high_speed':
        this.highSpeedScenario();
        break;
      default:
        this.scenarioRunning = false;
    }

    // End scenario after a certain time
    this.scenarioTimeout = setTimeout(() => {
      this.scenarioRunning = false;
      this.scenarioTimeout = null;
    }, 10000); // 10 seconds scenario
  }

  // Scenario: Race start - high revs, 1st gear, quick acceleration
  private raceStartScenario() {
    this.telemetry = {
      ...this.telemetry,
      engine_rpm: 6500,
      current_gear: 1,
      throttle: 255, // Full throttle
      brake: 0,
      speed_mps: 0
    };
    
    // Simulate acceleration
    let step = 0;
    const accelerate = () => {
      step++;
      if (step < 30) {
        this.telemetry.speed_mps += 1.5;
        this.telemetry.engine_rpm = Math.min(this.telemetry.rpm_hit, this.telemetry.engine_rpm + 50);
        
        // Gear shifts
        if (step === 15) {
          this.telemetry.current_gear = 2;
          this.telemetry.engine_rpm -= 2000;
        } else if (step === 25) {
          this.telemetry.current_gear = 3;
          this.telemetry.engine_rpm -= 2000;
        }
        
        this.notifySubscribers();
        setTimeout(accelerate, 100);
      }
    };
    
    accelerate();
  }

  // Scenario: Cornering - varied throttle, brake application, lateral G
  private corneringScenario() {
    this.telemetry = {
      ...this.telemetry,
      speed_mps: 25,
      engine_rpm: 5000,
      current_gear: 3,
      throttle: 50,
      brake: 80,
      rotation: { x: 0, y: 0.3, z: 0.05 },
      tire_temp_fl: 85,
      tire_temp_fr: 70,
      tire_temp_rl: 90,
      tire_temp_rr: 75
    };
    
    // Simulate corner entry, apex, exit
    let step = 0;
    const cornerSequence = () => {
      step++;
      if (step < 50) {
        // Corner entry (braking)
        if (step < 15) {
          this.telemetry.brake = Math.max(0, this.telemetry.brake - 5);
          this.telemetry.throttle = Math.min(80, this.telemetry.throttle + 5);
          this.telemetry.rotation.y = Math.min(0.5, this.telemetry.rotation.y + 0.01);
        } 
        // Apex (maintenance throttle)
        else if (step < 30) {
          this.telemetry.brake = 0;
          this.telemetry.throttle = 100;
          this.telemetry.rotation.y = 0.5;
        } 
        // Exit (acceleration)
        else {
          this.telemetry.throttle = Math.min(255, this.telemetry.throttle + 15);
          this.telemetry.rotation.y = Math.max(0, this.telemetry.rotation.y - 0.02);
          if (step === 40) {
            this.telemetry.current_gear = 4;
            this.telemetry.engine_rpm -= 1500;
          }
        }
        
        this.notifySubscribers();
        setTimeout(cornerSequence, 100);
      } else {
        // Reset rotation when done
        this.telemetry.rotation = { x: 0, y: 0, z: 0 };
      }
    };
    
    cornerSequence();
  }

  // Scenario: Pit stop - decreasing speed, refueling
  private pitStopScenario() {
    // Setup initial state - car approaching pit
    this.telemetry = {
      ...this.telemetry,
      speed_mps: 20,
      engine_rpm: 3000,
      current_gear: 2,
      throttle: 50,
      brake: 0,
      fuel_percentage: 15.5,
      current_fuel: 10.075 // 15.5% of 65L
    };
    
    // Simulate pit stop sequence
    let step = 0;
    const pitSequence = () => {
      step++;
      if (step < 80) {
        // Approaching pit (slowing down)
        if (step < 20) {
          this.telemetry.speed_mps = Math.max(0, this.telemetry.speed_mps - 1);
          this.telemetry.engine_rpm = Math.max(1000, this.telemetry.engine_rpm - 100);
          this.telemetry.throttle = Math.max(0, this.telemetry.throttle - 5);
          this.telemetry.brake = Math.min(150, this.telemetry.brake + 10);
        } 
        // Stopping in pit
        else if (step < 25) {
          this.telemetry.speed_mps = 0;
          this.telemetry.engine_rpm = 1000;
          this.telemetry.current_gear = 0; // Neutral
          this.telemetry.throttle = 0;
          this.telemetry.brake = 255;
        } 
        // Refueling
        else if (step < 65) {
          this.telemetry.brake = 255;
          // Increase fuel
          if (step % 2 === 0) {
            this.telemetry.fuel_percentage = Math.min(100, this.telemetry.fuel_percentage + 1.5);
            this.telemetry.current_fuel = (this.telemetry.fuel_percentage / 100) * this.telemetry.fuel_capacity;
          }
        } 
        // Leaving pit
        else {
          this.telemetry.current_gear = 1;
          this.telemetry.throttle = Math.min(100, this.telemetry.throttle + 10);
          this.telemetry.brake = 0;
          this.telemetry.speed_mps += 0.5;
          this.telemetry.engine_rpm = Math.min(3000, this.telemetry.engine_rpm + 100);
        }
        
        this.notifySubscribers();
        setTimeout(pitSequence, 100);
      }
    };
    
    pitSequence();
  }

  // Scenario: Hard braking - high speed to low speed transition
  private hardBrakingScenario() {
    // Setup initial state - high speed
    this.telemetry = {
      ...this.telemetry,
      speed_mps: 60,
      engine_rpm: 7000,
      current_gear: 5,
      throttle: 255,
      brake: 0
    };
    
    // Simulate hard braking
    let step = 0;
    const brakeSequence = () => {
      step++;
      if (step < 40) {
        // Initial brake application
        if (step === 1) {
          this.telemetry.throttle = 0;
          this.telemetry.brake = 255;
        }
        
        // Rapid deceleration
        this.telemetry.speed_mps = Math.max(5, this.telemetry.speed_mps - 1.5);
        
        // Downshifting
        if (step === 10) {
          this.telemetry.current_gear = 4;
          this.telemetry.engine_rpm = 6500;
        } else if (step === 20) {
          this.telemetry.current_gear = 3;
          this.telemetry.engine_rpm = 7000;
        } else if (step === 30) {
          this.telemetry.current_gear = 2;
          this.telemetry.engine_rpm = 6000;
        }
        
        // RPM changes during braking
        if (step > 1) {
          this.telemetry.engine_rpm = Math.max(2000, this.telemetry.engine_rpm - 50);
        }
        
        // Tire temperature increase due to braking
        this.telemetry.tire_temp_fl += 0.2;
        this.telemetry.tire_temp_fr += 0.2;
        
        this.notifySubscribers();
        setTimeout(brakeSequence, 100);
      }
    };
    
    brakeSequence();
  }

  // Scenario: High speed - maximum speed on straight
  private highSpeedScenario() {
    // Setup initial state - accelerating
    this.telemetry = {
      ...this.telemetry,
      speed_mps: 45,
      engine_rpm: 5500,
      current_gear: 4,
      throttle: 255,
      brake: 0
    };
    
    // Simulate acceleration to top speed
    let step = 0;
    const accelerateSequence = () => {
      step++;
      if (step < 50) {
        // Accelerate
        if (step < 30) {
          this.telemetry.speed_mps = Math.min(70, this.telemetry.speed_mps + 0.8);
          this.telemetry.engine_rpm = Math.min(this.telemetry.rpm_flashing, this.telemetry.engine_rpm + 50);
          
          // Upshift
          if (step === 10) {
            this.telemetry.current_gear = 5;
            this.telemetry.engine_rpm -= 1500;
          } else if (step === 25) {
            this.telemetry.current_gear = 6;
            this.telemetry.engine_rpm -= 1500;
          }
        } 
        // Maintain top speed
        else {
          this.telemetry.speed_mps = 70;
          this.telemetry.engine_rpm = 7000;
          
          // Small RPM fluctuations
          if (step % 2 === 0) {
            this.telemetry.engine_rpm += getRandomValue(-50, 50);
          }
        }
        
        this.notifySubscribers();
        setTimeout(accelerateSequence, 100);
      }
    };
    
    accelerateSequence();
  }
}

// Singleton instance
const mockTelemetryGenerator = new MockTelemetryGenerator();
export default mockTelemetryGenerator;
