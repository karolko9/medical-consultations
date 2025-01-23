import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Database, ref, set, update, get } from '@angular/fire/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User, UserRole } from '../models/user.model';
import { PersistenceMode, PersistenceConfig } from '../models/persistence.model';
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  private currentPersistenceMode: PersistenceMode = PersistenceMode.LOCAL;

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

    // Load initial persistence mode
    this.loadPersistenceMode();
  }

  private async loadPersistenceMode() {
    try {
      const configRef = ref(this.db, 'config/persistence');
      const snapshot = await get(configRef);
      const config = snapshot.val() as PersistenceConfig;
      
      if (config && config.mode) {
        await this.setPersistenceMode(config.mode);
      }
    } catch (error) {
      console.error('Error loading persistence mode:', error);
    }
  }

  getCurrentPersistenceMode(): PersistenceMode {
    return this.currentPersistenceMode;
  }

  async setPersistenceMode(mode: PersistenceMode): Promise<void> {
    try {
      const firebaseAuth = getAuth();
      let persistenceType;

      switch (mode) {
        case PersistenceMode.LOCAL:
          persistenceType = browserLocalPersistence;
          break;
        case PersistenceMode.SESSION:
          persistenceType = browserSessionPersistence;
          break;
        case PersistenceMode.NONE:
          persistenceType = inMemoryPersistence;
          break;
      }

      await setPersistence(firebaseAuth, persistenceType);
      this.currentPersistenceMode = mode;

      // Tylko admin może zapisać konfigurację persistence
      const currentUser = this.currentUserSubject.value;
      if (currentUser?.role === UserRole.ADMIN) {
        try {
          const configRef = ref(this.db, 'config/persistence');
          await set(configRef, {
            mode,
            lastModified: new Date().toISOString(),
            modifiedBy: currentUser.email
          });
        } catch (error) {
          console.error('Error saving persistence config:', error);
          // Nie rzucamy błędu, bo zmiana persistence i tak się udała
        }
      }
    } catch (error) {
      console.error('Error setting persistence mode:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    const user = credential.user;
    
    // Get additional user data from the database
    const userRef = ref(this.db, `users/${user.uid}`);
    const snapshot = await get(userRef);
    const userData = snapshot.val();

    if (!userData) {
      throw new Error('User data not found in database');
    }

    return {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || userData.displayName || '',
      role: userData.role || UserRole.PATIENT,
      emailVerified: user.emailVerified,
      banned: userData.banned || false,
      createdAt: userData.createdAt || Date.now(),
      lastLoginAt: Date.now()
    };
  }

  async register(email: string, password: string, displayName: string): Promise<User> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = credential.user;
    
    const newUser: User = {
      uid: user.uid,
      email: user.email!,
      displayName: displayName,
      role: UserRole.PATIENT,
      emailVerified: user.emailVerified,
      banned: false,
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };

    // Save additional user data to the database
    const userRef = ref(this.db, `users/${user.uid}`);
    await set(userRef, newUser);

    return newUser;
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  isLoggedIn(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => !!user)
    );
  }

  hasRole(role: UserRole): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => user?.role === role)
    );
  }

  isAdmin(): Observable<boolean> {
    return this.hasRole(UserRole.ADMIN);
  }

  isDoctor(): Observable<boolean> {
    return this.hasRole(UserRole.DOCTOR);
  }

  isPatient(): Observable<boolean> {
    return this.hasRole(UserRole.PATIENT);
  }
}
