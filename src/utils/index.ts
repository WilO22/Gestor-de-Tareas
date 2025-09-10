// src/utils/index.ts
// Punto de entrada centralizado para todas las utilidades

// Utilidades existentes (re-exports explícitos para evitar colisiones entre módulos)
export { formatRelativeTime, formatLongDate, formatShortDate, formatTime, isToday, isYesterday, isThisWeek, firestoreTimestampToDate } from './date.utils';
export { getElementPosition, isElementInViewport, scrollToElement, copyToClipboard, debounce, throttle, addEventListenerWithCleanup, getElementData, setElementData, findClosestParent, createElement, removeAllEventListeners, onClickOutside } from './dom.utils';
export { isValidEmail, isNotEmpty, hasMinLength, hasMaxLength, isInRange, isValidUrl, hasRequiredFields, isValidPassword, passwordsMatch, isValidName, sanitizeString, isNotPastDate, isValidPhone, validateObject, validators } from './validation.utils';
export type { ValidationResult } from './validation.utils';

// Nuevas utilidades de FASE 3 (exportaciones explícitas)
export { resetStore, createSelector, subscribeToChanges, createAsyncAction } from './store.utils';
export type { StoreApi } from './store.utils';
export { apiCall, requireAuth, retryApiCall } from './api.utils';
export * from './storage.utils';
export * from './error.utils';
export * from './performance.utils';
