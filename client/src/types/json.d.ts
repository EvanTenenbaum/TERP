declare module '*.json' {
  const value: {
    version: string;
    commit: string;
    date: string;
    description: string;
  };
  export default value;
}

