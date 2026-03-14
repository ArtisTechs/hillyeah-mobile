export type CurrentWeather = {
  locationName: string;
  region: string;
  country: string;
  localTime: string;
  temperatureC: number;
  feelsLikeC: number;
  humidity: number;
  windKph: number;
  conditionText: string;
  conditionIconUrl: string;
};

type OpenWeatherCurrentResponse = {
  name?: string;
  timezone?: number;
  dt?: number;
  sys?: {
    country?: string;
  };
  main?: {
    temp?: number;
    feels_like?: number;
    humidity?: number;
  };
  wind?: {
    speed?: number;
  };
  weather?: Array<{
    description?: string;
    icon?: string;
  }>;
  coord?: {
    lat?: number;
    lon?: number;
  };
  cod?: number | string;
  message?: string;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatLocalTime(unixSeconds: number | undefined, timezoneOffsetSeconds: number | undefined) {
  if (!unixSeconds) return "";
  const totalOffsetMs = toNumber(timezoneOffsetSeconds) * 1000;
  const utcMs = unixSeconds * 1000;
  const shiftedMs = utcMs + totalOffsetMs;
  return new Date(shiftedMs).toISOString().replace("T", " ").slice(0, 16);
}

function createOpenWeatherIconUrl(iconCode: string | undefined) {
  if (!iconCode) return "";
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

export async function fetchCurrentWeatherByCoordinates(
  latitude: number,
  longitude: number,
  apiKey: string,
) {
  const endpoint =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${encodeURIComponent(String(latitude))}` +
    `&lon=${encodeURIComponent(String(longitude))}` +
    `&appid=${encodeURIComponent(apiKey)}` +
    `&units=metric`;
  const response = await fetch(endpoint);

  let payload: OpenWeatherCurrentResponse | null = null;

  try {
    payload = (await response.json()) as OpenWeatherCurrentResponse;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.message || !payload?.main) {
    if (response.status === 401) {
      throw new Error("OpenWeather rejected the key (401). Check your API key.");
    }
    if (response.status === 429) {
      throw new Error("OpenWeather rate limit reached. Try again later.");
    }
    throw new Error(payload?.message ?? `Weather request failed (${response.status}).`);
  }

  const weather = payload.weather?.[0];
  const windKph = toNumber(payload.wind?.speed) * 3.6;
  const countryCode = payload.sys?.country ?? "";

  return {
    locationName: payload.name ?? "Current location",
    region: countryCode,
    country: countryCode,
    localTime: formatLocalTime(payload.dt, payload.timezone),
    temperatureC: toNumber(payload.main.temp),
    feelsLikeC: toNumber(payload.main.feels_like),
    humidity: toNumber(payload.main.humidity),
    windKph,
    conditionText: weather?.description ?? "Unavailable",
    conditionIconUrl: createOpenWeatherIconUrl(weather?.icon),
  } satisfies CurrentWeather;
}

export function getWeatherErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message || "Unable to load weather right now.";
}
