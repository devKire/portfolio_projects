export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;

export const RESERVED_PUBLIC_SLUGS = new Set([
  'admin',
  'api',
  'dashboard',
  'login',
  'register',
  'settings',
  'tasks',
  'notes',
  'projects',
  '_next',
]);

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);

  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    return `Username deve ter entre ${USERNAME_MIN_LENGTH} e ${USERNAME_MAX_LENGTH} caracteres.`;
  }

  if (!/^[a-z0-9_-]+$/.test(username)) {
    return 'Use apenas letras minúsculas, números, hífen e underscore.';
  }

  if (RESERVED_PUBLIC_SLUGS.has(username)) {
    return 'Este username é reservado.';
  }

  return null;
}

export function validatePublicSlug(value: string) {
  return validateUsername(value);
}

export function validateEmail(value: string) {
  const email = normalizeEmail(value);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Informe um email válido.';
  }
  return null;
}

export function validatePassword(value: string) {
  if (value.length < 8) {
    return 'Senha deve ter pelo menos 8 caracteres.';
  }
  if (value.length > 72) {
    return 'Senha deve ter no máximo 72 caracteres.';
  }
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    return 'Senha deve conter ao menos uma letra e um número.';
  }
  return null;
}
