interface Config {
  openaiApiKey: string;
}

export const getConfig = (): Config => {
  return {
    openaiApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''
  };
};

export const hasValidConfig = (): boolean => {
  const config = getConfig();
  return Boolean(config.openaiApiKey && config.openaiApiKey !== 'your_api_key_here');
};
