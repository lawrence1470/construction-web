import {
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  type Icon,
} from '@phosphor-icons/react';

/** Map OpenWeatherMap icon codes to Phosphor icons and labels */
export function getWeatherIcon(icon: string): { Icon: Icon; label: string } {
  const code = icon.slice(0, 2);
  switch (code) {
    case '01': return icon.endsWith('n') ? { Icon: Moon, label: 'Clear' } : { Icon: Sun, label: 'Clear' };
    case '02': return { Icon: Cloud, label: 'Partly cloudy' };
    case '03': return { Icon: Cloud, label: 'Cloudy' };
    case '04': return { Icon: Cloud, label: 'Overcast' };
    case '09': return { Icon: CloudRain, label: 'Drizzle' };
    case '10': return { Icon: CloudRain, label: 'Rain' };
    case '11': return { Icon: CloudLightning, label: 'Thunderstorm' };
    case '13': return { Icon: CloudSnow, label: 'Snow' };
    case '50': return { Icon: CloudFog, label: 'Fog' };
    default:   return { Icon: Cloud, label: 'Cloudy' };
  }
}
