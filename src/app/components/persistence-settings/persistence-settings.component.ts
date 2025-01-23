import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { PersistenceMode } from '../../models/persistence.model';

@Component({
  selector: 'app-persistence-settings',
  templateUrl: './persistence-settings.component.html',
  styleUrls: ['./persistence-settings.component.scss']
})
export class PersistenceSettingsComponent implements OnInit {
  PersistenceMode = PersistenceMode;
  currentMode: PersistenceMode;
  loading = false;
  error: string | null = null;

  constructor(private authService: AuthService) {
    this.currentMode = this.authService.getCurrentPersistenceMode();
  }

  ngOnInit(): void {}

  async changePersistenceMode(mode: PersistenceMode): Promise<void> {
    if (this.loading || mode === this.currentMode) return;

    this.loading = true;
    this.error = null;

    try {
      await this.authService.setPersistenceMode(mode);
      this.currentMode = mode;
    } catch (error: any) {
      this.error = error.message || 'Wystąpił błąd podczas zmiany trybu persystencji';
    } finally {
      this.loading = false;
    }
  }
}
