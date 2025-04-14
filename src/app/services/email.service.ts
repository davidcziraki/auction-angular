import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private apiUrl =
    'https://us-central1-final-year-bc4ca.cloudfunctions.net/sendContactEmail';

  constructor(private http: HttpClient) {}

  sendContactEmail(contactData: {
    name: string;
    email: string;
    message: string;
  }): Observable<any> {
    return this.http.post(this.apiUrl, contactData);
  }
}
