// src/components/index.ts
// Archivo índice para exportar todos los componentes reutilizables

// Componentes base
export { default as BaseCard } from './base/BaseCard.astro';
export { default as BaseModal } from './base/BaseModal.astro';

// Componentes de UI
export { default as Button } from './ui/Button.astro';
export { default as Badge } from './ui/Badge.astro';
export { default as Tooltip } from './ui/Tooltip.astro';
export { default as Input } from './ui/Input.astro';

// Componentes de layout
export { default as BaseLayout } from './layout/BaseLayout.astro';
export { default as Grid } from './layout/Grid.astro';
export { default as Container } from './layout/Container.astro';

// Re-exportar componentes existentes
export { default as Toast } from './ui/Toast.astro';
export { default as MemberOptionsModal } from './ui/MemberOptionsModal.astro';
export { default as Navbar } from './ui/Navbar.astro';

// Tipos de componentes
export type { Props as BaseCardProps } from './base/BaseCard.astro';
export type { Props as BaseModalProps } from './base/BaseModal.astro';
export type { Props as ButtonProps } from './ui/Button.astro';
export type { Props as BadgeProps } from './ui/Badge.astro';
export type { Props as TooltipProps } from './ui/Tooltip.astro';
export type { Props as InputProps } from './ui/Input.astro';
export type { Props as BaseLayoutProps } from './layout/BaseLayout.astro';
export type { Props as GridProps } from './layout/Grid.astro';
export type { Props as ContainerProps } from './layout/Container.astro';
