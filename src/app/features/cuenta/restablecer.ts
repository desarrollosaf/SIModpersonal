import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-restablecer',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrls: ['../login/login.scss'],
  styles: [`
    .links { margin-top: 1rem; text-align: center; font-size: 0.9rem; }
    .links a, .links button { color: var(--brand-primary); background: none; border: 0; cursor: pointer; font: inherit; text-decoration: underline; padding: 0; }
    .hint { color: #5d6b64; font-size: 0.9rem; margin: 0 0 1rem; }
    .error { color: #b3261e; font-size: 0.85rem; margin-top: 0.35rem; display: block; }`],
  template: `
    <main class="stage">
      <div class="card" role="region" aria-labelledby="t">
        <span class="card__wordmark">SIModpersonal</span>
        <h1 id="t">Nueva contraseña</h1>
        @if (!token) {
          <p class="hint">El enlace no es válido. Solicita uno nuevo.</p>
          <div class="links"><a routerLink="/recuperar">Solicitar enlace</a></div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate autocomplete="off">
            <label class="field">
              <span class="field__label">Contraseña nueva</span>
              <span class="field__control"><input type="password" formControlName="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" /></span>
            </label>
            <label class="field">
              <span class="field__label">Confirmar contraseña</span>
              <span class="field__control"><input type="password" formControlName="confirmar" autocomplete="new-password" /></span>
              @if (form.touched && form.hasError('noCoincide')) { <span class="error">Las contraseñas no coinciden.</span> }
            </label>
            <button type="submit" class="submit" [disabled]="loading()">
              @if (loading()) { <span class="spinner" aria-hidden="true"></span><span>Guardando…</span> } @else { <span>Guardar contraseña</span> }
            </button>
          </form>
          <div class="links"><a routerLink="/login">Volver a iniciar sesión</a></div>
        }
      </div>
    </main>
  `,
})
export class Restablecer {
  protected readonly loading = signal(false);
  protected readonly token: string | null;
  protected readonly form;

  constructor(
    fb: FormBuilder,
    route: ActivatedRoute,
    private readonly router: Router,
    private readonly auth: AuthService,
    private readonly toast: ToastService,
  ) {
    this.token = route.snapshot.queryParamMap.get('token');
    this.form = fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmar: ['', [Validators.required]],
      },
      { validators: (g) => (g.get('password')?.value === g.get('confirmar')?.value ? null : { noCoincide: true }) },
    );
  }

  submit(): void {
    if (this.form.invalid || this.loading() || !this.token) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.restablecer(this.token, this.form.getRawValue().password!).subscribe({
      next: () => {
        this.toast.success('Contraseña actualizada. Ya puedes iniciar sesión.');
        void this.router.navigate(['/login']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.toast.error(err.error?.message?.toString() ?? 'No se pudo cambiar la contraseña.');
      },
    });
  }
}
