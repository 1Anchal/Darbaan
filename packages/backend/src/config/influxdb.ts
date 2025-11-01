import { InfluxDB, Point, QueryApi, WriteApi } from '@influxdata/influxdb-client';

// InfluxDB configuration
const influxConfig = {
  url: process.env.INFLUXDB_URL || 'http://localhost:8086',
  token: process.env.INFLUXDB_TOKEN || '',
  org: process.env.INFLUXDB_ORG || 'darbaan-org',
  bucket: process.env.INFLUXDB_BUCKET || 'attendance-data',
};

// InfluxDB client instance
let influxClient: InfluxDB | null = null;
let writeApi: WriteApi | null = null;
let queryApi: QueryApi | null = null;

// Create InfluxDB client
export function createInfluxClient(): InfluxDB {
  if (influxClient) {
    return influxClient;
  }

  try {
    influxClient = new InfluxDB({
      url: influxConfig.url,
      token: influxConfig.token,
    });

    // Create write API
    writeApi = influxClient.getWriteApi(influxConfig.org, influxConfig.bucket);
    writeApi.useDefaultTags({ application: 'darbaan-system' });

    // Create query API
    queryApi = influxClient.getQueryApi(influxConfig.org);

    console.log('✅ InfluxDB client created');
    return influxClient;
  } catch (error) {
    console.error('❌ Failed to create InfluxDB client:', error);
    throw error;
  }
}

// Get InfluxDB client instance
export function getInfluxClient(): InfluxDB {
  if (!influxClient) {
    return createInfluxClient();
  }
  return influxClient;
}

// Get write API
export function getWriteApi(): WriteApi {
  if (!writeApi) {
    createInfluxClient();
  }
  if (!writeApi) {
    throw new Error('InfluxDB write API not initialized');
  }
  return writeApi;
}

// Get query API
export function getQueryApi(): QueryApi {
  if (!queryApi) {
    createInfluxClient();
  }
  if (!queryApi) {
    throw new Error('InfluxDB query API not initialized');
  }
  return queryApi;
}

// Test InfluxDB connection
export async function testInfluxConnection(): Promise<boolean> {
  try {
    const client = getInfluxClient();
    const queryApi = getQueryApi();
    
    // Simple health check query
    const query = `from(bucket: "${influxConfig.bucket}") |> range(start: -1m) |> limit(n: 1)`;
    
    await queryApi.collectRows(query);
    console.log('✅ InfluxDB connection successful');
    return true;
  } catch (error) {
    console.error('❌ InfluxDB connection failed:', error);
    return false;
  }
}

// InfluxDB health check
export async function getInfluxHealth() {
  try {
    const client = getInfluxClient();
    const queryApi = getQueryApi();
    
    const start = Date.now();
    const query = `from(bucket: "${influxConfig.bucket}") |> range(start: -1m) |> limit(n: 1)`;
    await queryApi.collectRows(query);
    const end = Date.now();
    
    return {
      status: 'healthy',
      responseTime: end - start,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

// Attendance data operations
export class AttendanceDataService {
  private writeApi: WriteApi;
  private queryApi: QueryApi;

  constructor() {
    this.writeApi = getWriteApi();
    this.queryApi = getQueryApi();
  }

  // Write attendance event
  async writeAttendanceEvent(data: {
    userId: string;
    deviceId: string;
    location: string;
    eventType: 'entry' | 'exit';
    timestamp?: Date;
    isLateArrival?: boolean;
    classId?: string;
  }): Promise<void> {
    const point = new Point('attendance_events')
      .tag('userId', data.userId)
      .tag('deviceId', data.deviceId)
      .tag('location', data.location)
      .tag('eventType', data.eventType)
      .booleanField('isLateArrival', data.isLateArrival || false)
      .timestamp(data.timestamp || new Date());

    if (data.classId) {
      point.tag('classId', data.classId);
    }

    this.writeApi.writePoint(point);
    await this.writeApi.flush();
  }

  // Write crowd occupancy data
  async writeCrowdData(data: {
    location: string;
    occupancyCount: number;
    maxCapacity: number;
    occupancyRate: number;
    alertLevel: string;
    activeDevices: string[];
    timestamp?: Date;
  }): Promise<void> {
    const point = new Point('crowd_occupancy')
      .tag('location', data.location)
      .tag('alertLevel', data.alertLevel)
      .intField('occupancyCount', data.occupancyCount)
      .intField('maxCapacity', data.maxCapacity)
      .floatField('occupancyRate', data.occupancyRate)
      .intField('activeDeviceCount', data.activeDevices.length)
      .stringField('activeDevices', JSON.stringify(data.activeDevices))
      .timestamp(data.timestamp || new Date());

    this.writeApi.writePoint(point);
    await this.writeApi.flush();
  }

  // Write BLE device signal data
  async writeDeviceSignal(data: {
    deviceId: string;
    userId: string;
    location: string;
    signalStrength: number;
    batteryLevel?: number;
    timestamp?: Date;
  }): Promise<void> {
    const point = new Point('device_signals')
      .tag('deviceId', data.deviceId)
      .tag('userId', data.userId)
      .tag('location', data.location)
      .intField('signalStrength', data.signalStrength)
      .timestamp(data.timestamp || new Date());

    if (data.batteryLevel !== undefined) {
      point.intField('batteryLevel', data.batteryLevel);
    }

    this.writeApi.writePoint(point);
    await this.writeApi.flush();
  }

  // Query attendance data for a date range
  async getAttendanceData(
    startTime: Date,
    endTime: Date,
    filters?: {
      userId?: string;
      location?: string;
      classId?: string;
    }
  ): Promise<any[]> {
    let query = `
      from(bucket: "${influxConfig.bucket}")
        |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
        |> filter(fn: (r) => r._measurement == "attendance_events")
    `;

    if (filters?.userId) {
      query += `|> filter(fn: (r) => r.userId == "${filters.userId}")`;
    }
    if (filters?.location) {
      query += `|> filter(fn: (r) => r.location == "${filters.location}")`;
    }
    if (filters?.classId) {
      query += `|> filter(fn: (r) => r.classId == "${filters.classId}")`;
    }

    return await this.queryApi.collectRows(query);
  }

  // Query crowd data for a location
  async getCrowdData(
    location: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    const query = `
      from(bucket: "${influxConfig.bucket}")
        |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
        |> filter(fn: (r) => r._measurement == "crowd_occupancy")
        |> filter(fn: (r) => r.location == "${location}")
        |> sort(columns: ["_time"], desc: false)
    `;

    return await this.queryApi.collectRows(query);
  }

  // Get latest crowd data for all locations
  async getLatestCrowdData(): Promise<any[]> {
    const query = `
      from(bucket: "${influxConfig.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "crowd_occupancy")
        |> group(columns: ["location"])
        |> last()
    `;

    return await this.queryApi.collectRows(query);
  }

  // Get attendance trends for reporting
  async getAttendanceTrends(
    startTime: Date,
    endTime: Date,
    groupBy: 'hour' | 'day' | 'week' = 'day'
  ): Promise<any[]> {
    const windowDuration = groupBy === 'hour' ? '1h' : groupBy === 'day' ? '1d' : '1w';
    
    const query = `
      from(bucket: "${influxConfig.bucket}")
        |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
        |> filter(fn: (r) => r._measurement == "attendance_events")
        |> filter(fn: (r) => r.eventType == "entry")
        |> aggregateWindow(every: ${windowDuration}, fn: count, createEmpty: false)
        |> yield(name: "attendance_trends")
    `;

    return await this.queryApi.collectRows(query);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (writeApi) {
    await writeApi.close();
    console.log('InfluxDB write API closed');
  }
});

process.on('SIGTERM', async () => {
  if (writeApi) {
    await writeApi.close();
    console.log('InfluxDB write API closed');
  }
});