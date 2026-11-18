import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly user;
  protected readonly puedeCapturar;
  protected readonly puedeConsultar;
  protected readonly sinAcceso;

  constructor(authService: AuthService) {
    this.user = authService.currentUser;
    const rol = computed(() => this.user()?.rol ?? 'usuario');
    this.puedeCapturar = computed(() => ['administrador', 'capturista'].includes(rol()));
    this.puedeConsultar = computed(() => ['administrador', 'capturista', 'consulta'].includes(rol()));
    this.sinAcceso = computed(() => !this.puedeConsultar());
  }
}
