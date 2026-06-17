import type { TypographyStyleOptions } from '@mui/material/styles/createTypography'

/** Module augmentation adding MD3 type-scale variants to MUI's Typography. */
declare module '@mui/material/styles' {
  interface TypographyVariants {
    displayLarge: TypographyStyleOptions
    displayMedium: TypographyStyleOptions
    displaySmall: TypographyStyleOptions
    headlineLarge: TypographyStyleOptions
    headlineMedium: TypographyStyleOptions
    headlineSmall: TypographyStyleOptions
    titleLarge: TypographyStyleOptions
    titleMedium: TypographyStyleOptions
    titleSmall: TypographyStyleOptions
    bodyLarge: TypographyStyleOptions
    bodyMedium: TypographyStyleOptions
    bodySmall: TypographyStyleOptions
    labelLarge: TypographyStyleOptions
    labelMedium: TypographyStyleOptions
    labelSmall: TypographyStyleOptions
  }
  interface TypographyVariantsOptions {
    displayLarge?: TypographyStyleOptions
    displayMedium?: TypographyStyleOptions
    displaySmall?: TypographyStyleOptions
    headlineLarge?: TypographyStyleOptions
    headlineMedium?: TypographyStyleOptions
    headlineSmall?: TypographyStyleOptions
    titleLarge?: TypographyStyleOptions
    titleMedium?: TypographyStyleOptions
    titleSmall?: TypographyStyleOptions
    bodyLarge?: TypographyStyleOptions
    bodyMedium?: TypographyStyleOptions
    bodySmall?: TypographyStyleOptions
    labelLarge?: TypographyStyleOptions
    labelMedium?: TypographyStyleOptions
    labelSmall?: TypographyStyleOptions
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    displayLarge: true
    displayMedium: true
    displaySmall: true
    headlineLarge: true
    headlineMedium: true
    headlineSmall: true
    titleLarge: true
    titleMedium: true
    titleSmall: true
    bodyLarge: true
    bodyMedium: true
    bodySmall: true
    labelLarge: true
    labelMedium: true
    labelSmall: true
    h1: false
    h2: false
    h3: false
    h4: false
    h5: false
    h6: false
    subtitle1: false
    subtitle2: false
    body1: false
    body2: false
    caption: false
    button: false
    overline: false
  }
}
