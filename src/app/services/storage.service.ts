import { inject, Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { getStorage, ref } from 'firebase/storage';
import {
  deleteObject,
  getDownloadURL,
  uploadBytes,
} from '@angular/fire/storage';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private storage = getStorage();
  private db = inject(Firestore);

  /** Upload image and return URL */
  async uploadImage(auctionId: string, file: File): Promise<string> {
    const resizedFile = await this.resizeImage(file, 640, 480);
    const imageRef = ref(this.storage, `auction-images/${auctionId}.jpg`);
    await uploadBytes(imageRef, resizedFile);
    return getDownloadURL(imageRef);
  }

  /** Delete auction image from Firebase Storage */
  async deleteImage(auctionId: string): Promise<void> {
    try {
      const imageRef = ref(this.storage, `auction-images/${auctionId}.jpg`);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }

  /** Resize image before upload */
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
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(new File([blob], file.name, { type: file.type }));
            else reject(new Error('Image resizing failed'));
          },
          file.type,
          0.9,
        );
      };

      reader.readAsDataURL(file);
    });
  }
}
