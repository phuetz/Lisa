interface Window {
  google: {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (tokenResponse: { access_token: string; error?: string }) => void;
        }) => {
          requestAccessToken: (overridableConfig?: any) => void;
        };
      };
    };
  };
}
