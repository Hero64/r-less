export const camelToSnakeCase = (text: string) =>
  text.replace(/[A-Z]/g, (letter) => `${letter.toLowerCase()}`);
