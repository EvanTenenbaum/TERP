export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = async (
  err: Error,
  request: {
    path: string;
  },
) => {
  await import('@sentry/nextjs').then((Sentry) => {
    Sentry.captureException(err, {
      contexts: {
        request: {
          url: request.path,
        },
      },
    });
  });
};
