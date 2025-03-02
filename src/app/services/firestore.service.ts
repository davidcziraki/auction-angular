import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  CollectionReference,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  setDoc,
  Timestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { UserModel } from '../models/user';
import { Observable } from 'rxjs';
import { Auction } from '../models/auction';
import { getStorage, ref } from 'firebase/storage';
import {
  deleteObject,
  getDownloadURL,
  uploadBytes,
} from '@angular/fire/storage';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  usersCollection: CollectionReference; // Declare users collection reference
  auctionsCollection: CollectionReference;
  private firestore = inject(Firestore);
  private storage = getStorage();

  constructor() {
    this.usersCollection = collection(this.firestore, 'users');
    this.auctionsCollection = collection(this.firestore, 'auctions');
  }

  async addUser(user: UserModel) {
    try {
      const userRef = doc(this.firestore, 'users', user.email); // Set document reference using user email as the ID
      await setDoc(userRef, user); // Set the user data in the document

      console.log('Document written with ID:', user.email); // Email is used as document ID
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  }

  // Get all auctions
  getAuctions(): Observable<Auction[]> {
    return collectionData(this.auctionsCollection, {
      idField: 'id',
    }) as Observable<Auction[]>;
  }

  async getUserDetailsByEmail(email: string): Promise<any> {
    try {
      const userDocRef = doc(this.firestore, `users/${email}`);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        return userSnap.data(); // Returns user details from Firestore
      } else {
        console.error('User document not found!');
        return null;
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      throw error;
    }
  }

  async updateUserDetails(
    email: string,
    updates: { forename?: string; surname?: string },
  ): Promise<void> {
    const userRef = doc(this.firestore, `users/${email}`);
    await updateDoc(userRef, updates);
  }

  // Add New Auction
  async addAuction(auction: Auction, imageFile?: File) {
    try {
      const { endTimeDate, ...auctionData } = auction;
      const auctionsRef = collection(this.firestore, 'auctions');

      // Add auction to Firestore
      const docRef = await addDoc(auctionsRef, auctionData);
      console.log('Auction added with ID:', docRef.id);

      // Upload image if provided
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await this.uploadImage(docRef.id, imageFile);
        await updateDoc(doc(this.firestore, 'auctions', docRef.id), {
          imageUrl,
        });
      }

      console.log(
        'Image uploaded and Firestore updated with image URL:',
        imageUrl,
      );
    } catch (error) {
      console.error('Error adding auction:', error);
    }
  }

  async deleteAuction(auction: Auction) {
    if (!auction.id) {
      console.error('Error: Auction ID is undefined.');
      return;
    }

    try {
      const auctionRef = doc(this.firestore, 'auctions', auction.id);
      await deleteDoc(auctionRef);
      console.log(`Auction ${auction.id} deleted from Firestore.`);

      // Delete the image from Firebase Storage if it exists
      if (auction.imageUrl) {
        const imageRef = ref(this.storage, `auction-images/${auction.id}.jpg`);
        await deleteObject(imageRef);
        console.log(`Image deleted for auction ${auction.id}.`);
      }
    } catch (error) {
      console.error('Error deleting auction:', error);
    }
  }

  async updateAuction(auction: Auction, newImage?: File) {
    try {
      if (!auction.id) throw new Error('Auction ID is missing.');

      const auctionRef = doc(this.firestore, 'auctions', auction.id);

      // 🔹 Convert `endTimeDate` to Firestore Timestamp
      const updateData: Partial<Auction> = {
        name: auction.name,
        seller: auction.seller,
        endtime: Timestamp.fromDate(auction.endTimeDate),
        price: auction.price,
        status: auction.status,
      };

      // 🔹 Handle image update if a new image is provided
      if (newImage) {
        updateData.imageUrl = await this.uploadImage(auction.id, newImage);
      }

      await updateDoc(auctionRef, updateData);
      console.log(`Auction ${auction.id} updated successfully.`);
    } catch (error) {
      console.error('Error updating auction:', error);
    }
  }

  // 🔹 Upload Image after Resizing
  private async uploadImage(auctionId: string, file: File): Promise<string> {
    console.log('Original file:', file.name, file.type, file.size);

    const resizedFile = await this.resizeImage(file, 640, 480);

    console.log(
      'Resized file:',
      resizedFile.name,
      resizedFile.type,
      resizedFile.size,
    );

    const imageRef = ref(this.storage, `auction-images/${auctionId}.jpg`);
    await uploadBytes(imageRef, resizedFile);

    return getDownloadURL(imageRef);
  }

  private async resizeImage(
    file: File,
    width: number,
    height: number,
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (event) => {
        img.src = event.target?.result as string;
      };

      img.onload = () => {
        console.log('Original dimensions:', img.width, img.height);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        console.log('Canvas resized to:', canvas.width, canvas.height);

        // Convert canvas to File for Firebase compatibility
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });

              console.log(
                'Final resized file:',
                resizedFile.size,
                resizedFile.type,
              );

              resolve(resizedFile);
            } else {
              reject(new Error('Image resizing failed'));
            }
          },
          file.type,
          0.9,
        );
      };

      reader.readAsDataURL(file);
    });
  }
}
