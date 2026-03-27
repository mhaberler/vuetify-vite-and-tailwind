/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify } from 'vuetify'
// Styles
import '../styles/layers.css'
import '@mdi/font/css/materialdesignicons.css'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  defaults: {
    VBtn: { ripple: false },
  },
  theme: {
    defaultTheme: 'system',
    utilities: false,
    themes: {
      light: {
        variables: {
          'hover-opacity': 0,
        },
      },
      dark: {
        variables: {
          'hover-opacity': 0,
        },
      },
    },
  },
  display: {
    mobileBreakpoint: 'md',
    thresholds: {
      // repeated in tailwind.css and settings.scss
      xs: 0,
      sm: 400,
      md: 840,
      lg: 1145,
      xl: 1545,
      xxl: 2138,
    },
  },
})
