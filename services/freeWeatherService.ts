export type WeatherBroadcastSnapshot = {
  timezone: string;
  current: {
    temperatureC: number;
    feelsLikeC: number;
    humidity: number;
    windKph: number;
    precipitationMm: number;
    weatherCode: number;
    conditionText: string;
    observationTime: string;
  };
  daily: Array<{
    date: string;
    minTemperatureC: number;
    maxTemperatureC: number;
    precipitationProbabilityMax: number;
    weatherCode: number;
    conditionText: string;
  }>;
};

type OpenMeteoResponse = {
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
  };
  error?: boolean;
  reason?: string;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getConditionTextFromCode(code: number) {
  switch (code) {
    case 0:
      return "Clear sky";
    case 1:
      return "Mainly clear";
    case 2:
      return "Partly cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Fog";
    case 51:
    case 53:
    case 55:
      return "Drizzle";
    case 56:
    case 57:
      return "Freezing drizzle";
    case 61:
    case 63:
    case 65:
      return "Rain";
    case 66:
    case 67:
      return "Freezing rain";
    case 71:
    case 73:
    case 75:
      return "Snowfall";
    case 77:
      return "Snow grains";
    case 80:
    case 81:
    case 82:
      return "Rain showers";
    case 85:
    case 86:
      return "Snow showers";
    case 95:
      return "Thunderstorm";
    case 96:
    case 99:
      return "Thunderstorm with hail";
    default:
      return "Weather unavailable";
  }
}

export async function fetchWeatherBroadcastByCoordinates(
  latitude: number,
  longitude: number,
) {
  const endpoint =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${encodeURIComponent(String(latitude))}` +
    `&longitude=${encodeURIComponent(String(longitude))}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code" +
    "&daily=weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max" +
    "&forecast_days=4" +
    "&timezone=auto";

  const response = await fetch(endpoint);
  let payload: OpenMeteoResponse | null = null;

  try {
    payload = (await response.json()) as OpenMeteoResponse;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.error || !payload?.current || !payload?.daily) {
    throw new Error(payload?.reason ?? `Weather request failed (${response.status}).`);
  }

  const currentCode = toNumber(payload.current.weather_code);
  const dates = payload.daily.time ?? [];
  const minTemps = payload.daily.temperature_2m_min ?? [];
  const maxTemps = payload.daily.temperature_2m_max ?? [];
  const precipChances = payload.daily.precipitation_probability_max ?? [];
  const weatherCodes = payload.daily.weather_code ?? [];

  const daily = dates.map((date, index) => {
    const weatherCode = toNumber(weatherCodes[index]);

    return {
      date,
      minTemperatureC: toNumber(minTemps[index]),
      maxTemperatureC: toNumber(maxTemps[index]),
      precipitationProbabilityMax: toNumber(precipChances[index]),
      weatherCode,
      conditionText: getConditionTextFromCode(weatherCode),
    };
  });

  return {
    timezone: payload.timezone ?? "auto",
    current: {
      temperatureC: toNumber(payload.current.temperature_2m),
      feelsLikeC: toNumber(payload.current.apparent_temperature),
      humidity: toNumber(payload.current.relative_humidity_2m),
      windKph: toNumber(payload.current.wind_speed_10m),
      precipitationMm: toNumber(payload.current.precipitation),
      weatherCode: currentCode,
      conditionText: getConditionTextFromCode(currentCode),
      observationTime: payload.current.time ?? "",
    },
    daily,
  } satisfies WeatherBroadcastSnapshot;
}

export function getFreeWeatherErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message || "Unable to load weather broadcast right now.";
}
