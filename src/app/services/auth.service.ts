import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Database, ref, set, update, get } from '@angular/fire/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User, UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private auth: Auth,
    private db: Database
  ) {
    // Subscribe to Firebase auth state changes
    user(this.auth).subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from the database
        const userRef = ref(this.db, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();
        
        const currentUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || userData?.displayName || '',
          role: userData?.role || UserRole.PATIENT,
          emailVerified: firebaseUser.emailVerified,
          createdAt: userData?.createdAt || Date.now(),
          lastLoginAt: Date.now()
        };

        this.currentUserSubject.next(currentUser);
        
        // Update last login time
        await update(userRef, {
          lastLoginAt: currentUser.lastLoginAt
        });
      } else {
        this.currentUserSubject.next(null);
      }
    });
  }

  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  async register(email: string, password: string, displayName: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Save additional user data to the database
      const userRef = ref(this.db, `users/${userCredential.user.uid}`);
      await set(userRef, {
        uid: userCredential.user.uid,
        email,
        displayName,
        role: UserRole.PATIENT,
        emailVerified: false,
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      });
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/user-not-found':
        return 'No user found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'This email address is already registered.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      default:
        return 'An error occurred during authentication.';
    }
  }
}
