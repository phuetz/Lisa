interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  description?: string;
  location?: string;
}

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (tokenResponse: any) => void;
          }) => {
            requestAccessToken: (overridableConfig?: any) => void;
          };
        };
      };
    };
  }
}
