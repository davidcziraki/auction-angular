import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {firebaseConfig} from '../environments/environment';
import { initializeApp} from 'firebase/app';




const app = initializeApp(firebaseConfig)







export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes)]
};
