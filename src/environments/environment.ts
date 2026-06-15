const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '4200') {
    return '/api';
  }
  return 'https://roamie.zytraxo.com/api';
};

export const environment = {
  production: false,
  apiUrl: getApiUrl(),
  midtrans: {
    mode: 'simulator',
    clientKey: 'SB-Mid-client-MockKey12345',
    snapScriptUrl: 'https://app.sandbox.midtrans.com/snap/snap.js'
  }
};
