export interface UserModel {
  forename: string;
  surname: string;
  DOB: Date;
  email: string;
  stripe_id?: string;
  id: string;
}
