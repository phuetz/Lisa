import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { agentRegistry } from '../features/agents/core/registry';

export default function WeatherBanner() {
  const { t } = useTranslation();
  const intent = useVisionAudioStore(s => s.intent);
  const [weather, setWeather] = useState<string>('');
  useEffect(() => {
    const fetchWeather = async () => {
      if (intent === 'weather_now' || intent === 'weather_forecast') {
        const weatherAgent = agentRegistry.getAgent('WeatherAgent');
        if (!weatherAgent) {
          console.error('WeatherAgent not found');
          return;
        }

        const command = intent === 'weather_now' ? 'get_current' : 'get_forecast';
        const result = await weatherAgent.execute({ command });

        if (result.success) {
          const data = result.output;
          let msg = '';
          if (command === 'get_current') {
            const temp = data.current_weather.temperature;
            msg = t('current_temperature', { temp });
          } else {
            const max = data.daily.temperature_2m_max[1];
            const min = data.daily.temperature_2m_min[1];
            msg = t('tomorrow_forecast', { min, max });
          }
          setWeather(msg);
          speechSynthesis.speak(new SpeechSynthesisUtterance(msg));
        } else {
          console.error('Failed to fetch weather:', result.error);
        }
      }
    };

    fetchWeather();
  }, [intent, t]);

  if (!weather) return null;

  const ariaLabel = t('current_temperature', { temp: weather.match(/\d+/)?.[0] ?? '' });
  return (
    <div role="status" aria-live="polite" aria-label={ariaLabel} style={{ position: 'absolute', top: 10, left: 10, padding: '8px 12px', background: '#1e1e1ecc', color: 'white', borderRadius: 6 }}>
      {weather}
    </div>
  );
}
