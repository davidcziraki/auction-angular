import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VehicleInfoService {}

// private url = 'https://www.regcheck.org.uk/api/reg.asmx/Check';
// private firestore = inject(Firestore);
//
// constructor(private http: HttpClient) {}

//   public getRegApiData(registrationNumber: string): Observable<any> {
//     const body = new HttpParams()
//       .set('RegistrationNumber', registrationNumber)
//       .set('username', 'dav123');
//
//     const headers = new HttpHeaders({
//       'Content-Type': 'application/x-www-form-urlencoded',
//     });
//
//     return this.http
//       .post(this.url, body, { headers, responseType: 'text' })
//       .pipe(map((response: string) => this.parseXml(response)));
//   }
//
//   private parseXml(xmlString: string): any {
//     const parser = new DOMParser();
//     const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
//
//     const vehicleJsonNode = xmlDoc.getElementsByTagName('vehicleJson')[0];
//     if (vehicleJsonNode) {
//       try {
//         return JSON.parse(vehicleJsonNode.textContent || '{}');
//       } catch (e) {
//         console.error('Error parsing vehicleJson:', e);
//       }
//     }
//
//     const vehicleData = xmlDoc.getElementsByTagName('vehicleData')[0];
//     if (!vehicleData) return null;
//
//     return {
//       Description: this.getTextContent(vehicleData, 'Description'),
//       BodyStyle: this.getTextContent(vehicleData, 'BodyStyle/CurrentTextValue'),
//       EngineSize: this.getTextContent(
//         vehicleData,
//         'EngineSize/CurrentTextValue',
//       ),
//       NumberOfDoors: this.getTextContent(
//         vehicleData,
//         'NumberOfDoors/CurrentTextValue',
//       ),
//       NumberOfSeats: this.getTextContent(
//         vehicleData,
//         'NumberOfSeats/CurrentTextValue',
//       ),
//       Colour: this.getTextContent(vehicleData, 'Colour'),
//       VehicleInsuranceGroup: this.getTextContent(
//         vehicleData,
//         'VehicleInsuranceGroup',
//       ),
//     };
//   }
//
//   private getTextContent(xmlElement: Element, tagName: string): string {
//     const element = xmlElement.getElementsByTagName(tagName)[0];
//     if (element) {
//       // Check for 'CurrentTextValue' if it exists in the element
//       const currentValueNode =
//         element.getElementsByTagName('CurrentTextValue')[0];
//       if (currentValueNode) {
//         return currentValueNode.textContent?.trim() || ''; // Return the CurrentTextValue text
//       }
//
//       // If there's no 'CurrentTextValue', just return the plain text content
//       return element.textContent?.trim() || '';
//     }
//
//     return '';
//   }
// }
