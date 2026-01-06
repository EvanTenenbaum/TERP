import { datadogRum } from '@datadog/browser-rum';

export function initDatadog() {
  const applicationId = import.meta.env.VITE_DATADOG_APPLICATION_ID;
  const clientToken = import.meta.env.VITE_DATADOG_CLIENT_TOKEN;
  const site = import.meta.env.VITE_DATADOG_SITE || 'datadoghq.com';
  const env = import.meta.env.MODE || 'development';

  // Don't initialize if credentials missing
  if (!applicationId || !clientToken) {
    console.log('[Datadog] Skipping initialization - credentials not configured');
    return;
  }

  try {
    datadogRum.init({
      applicationId,
      clientToken,
      site,
      service: 'terp-client',
      env,
      version: '1.0.0',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: 'mask-user-input',
    });

    datadogRum.startSessionReplayRecording();
    console.log('[Datadog] RUM initialized successfully');
  } catch (error) {
    console.error('[Datadog] Failed to initialize:', error);
  }
}

export function setDatadogUser(userId: string, email?: string, name?: string) {
  try {
    datadogRum.setUser({
      id: userId,
      email,
      name,
    });
  } catch (error) {
    // Silently fail if Datadog not initialized
  }
}
