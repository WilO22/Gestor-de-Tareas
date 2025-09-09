// src/utils/validation.utils.ts
// Utilidades para validación de datos

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida que un string no esté vacío
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Valida longitud mínima
 */
export function hasMinLength(value: string, minLength: number): boolean {
  return value.length >= minLength;
}

/**
 * Valida longitud máxima
 */
export function hasMaxLength(value: string, maxLength: number): boolean {
  return value.length <= maxLength;
}

/**
 * Valida que un valor esté dentro de un rango
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Valida formato de URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida que un objeto tenga propiedades requeridas
 */
export function hasRequiredFields<T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[]
): boolean {
  return requiredFields.every(field => {
    const value = obj[field];
    return value !== undefined && value !== null && value !== '';
  });
}

/**
 * Valida formato de contraseña (al menos 8 caracteres, una mayúscula, una minúscula, un número)
 */
export function isValidPassword(password: string): boolean {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Valida que las contraseñas coincidan
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

/**
 * Valida formato de nombre (solo letras y espacios)
 */
export function isValidName(name: string): boolean {
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  return nameRegex.test(name) && isNotEmpty(name);
}

/**
 * Sanitiza un string removiendo caracteres peligrosos
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/[<>\"']/g, '') // Remover caracteres HTML peligrosos
    .trim();
}

/**
 * Valida que una fecha no sea en el pasado
 */
export function isNotPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

/**
 * Valida formato de teléfono (básico)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Interface para resultados de validación
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Valida un objeto con múltiples reglas
 */
export function validateObject<T extends Record<string, any>>(
  obj: T,
  rules: Record<keyof T, Array<(value: any) => string | null>>
): ValidationResult {
  const errors: string[] = [];
  
  Object.entries(rules).forEach(([field, validators]) => {
    const value = obj[field as keyof T];
    
    validators.forEach((validator) => {
      const error = validator(value);
      if (error) {
        errors.push(`${String(field)}: ${error}`);
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validadores comunes pre-definidos
 */
export const validators = {
  required: (value: any) => 
    (value === undefined || value === null || value === '') ? 'Este campo es requerido' : null,
  
  email: (value: string) => 
    !isValidEmail(value) ? 'Formato de email inválido' : null,
  
  minLength: (min: number) => (value: string) =>
    !hasMinLength(value, min) ? `Debe tener al menos ${min} caracteres` : null,
  
  maxLength: (max: number) => (value: string) =>
    !hasMaxLength(value, max) ? `No debe exceder ${max} caracteres` : null,
  
  password: (value: string) =>
    !isValidPassword(value) ? 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número' : null,
  
  name: (value: string) =>
    !isValidName(value) ? 'El nombre solo puede contener letras y espacios' : null,
  
  url: (value: string) =>
    !isValidUrl(value) ? 'Formato de URL inválido' : null,
  
  phone: (value: string) =>
    !isValidPhone(value) ? 'Formato de teléfono inválido' : null
};
