import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserRole } from '../../models/user.model';

@Component({
  selector: 'app-unauthorized',
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.scss']
})
export class UnauthorizedComponent implements OnInit {
  requiredRole?: UserRole;
  currentRole?: UserRole;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.requiredRole = params['requiredRole'] as UserRole;
      this.currentRole = params['currentRole'] as UserRole;
    });
  }

  getRoleDisplay(role: UserRole | undefined): string {
    if (!role) {
      return 'Nieznana';
    }
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }
}
