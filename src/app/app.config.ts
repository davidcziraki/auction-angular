import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp } from 'firebase/app';
import { provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import {
  getAnalytics,
  provideAnalytics,
  ScreenTrackingService,
  UserTrackingService,
} from '@angular/fire/analytics';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { firebaseConfig } from '../environments/environment';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';

// const MyPreset = definePreset(Aura, {
//   semantic: {
//     primary: {
//       50: '{blue.50}',
//       100: '{blue.100}',
//       200: '{blue.200}',
//       300: '{blue.300}',
//       400: '{blue.900}',
//       500: '{blue.900}',
//       600: '{blue.950}',
//       700: '{blue.950}',
//       800: '{blue.900}',
//       900: '{blue.900}',
//       950: '{blue.950}',
//     },
//   },
// });

const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.400}',
      100: '{blue.500}',
      200: '{blue.600}',
      300: '{blue.700}',
      400: '{blue.800}',
      500: '{blue.900}',
      600: '{blue.950}',
      700: '{blue.950}',
      800: '{blue.950}',
      900: '{blue.950}',
      950: '{blue.950}',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideAnalytics(() => getAnalytics()),
    ScreenTrackingService,
    UserTrackingService,
    provideFirestore(() => getFirestore()),
    provideDatabase(() => getDatabase()),
    provideFunctions(() => getFunctions()),
    provideStorage(() => getStorage()),

    // PRIMENG
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: MyPreset,
        options: {
          darkModeSelector: 'none',
        },
      },
      ripple: true, // Enable ripple effect globally
    }),
  ],
};
