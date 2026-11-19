import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-cambiar-contrasena',
  standalone: true,
  imports: [ReactiveFormsModule],
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
        <h1 id="t">Cambia tu contraseña</h1>
        <p class="hint">Por seguridad, debes cambiar tu contraseña antes de continuar.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate autocomplete="off">
          <label class="field">
            <span class="field__label">Contraseña actual</span>
            <span class="field__control"><input type="password" formControlName="actual" autocomplete="current-password" /></span>
          </label>
          <label class="field">
            <span class="field__label">Contraseña nueva</span>
            <span class="field__control"><input type="password" formControlName="nueva" autocomplete="new-password" placeholder="Mínimo 8 caracteres" /></span>
          </label>
          <label class="field">
            <span class="field__label">Confirmar contraseña nueva</span>
            <span class="field__control"><input type="password" formControlName="confirmar" autocomplete="new-password" /></span>
            @if (form.touched && form.hasError('noCoincide')) { <span class="error">Las contraseñas no coinciden.</span> }
          </label>
          <button type="submit" class="submit" [disabled]="loading()">
            @if (loading()) { <span class="spinner" aria-hidden="true"></span><span>Guardando…</span> } @else { <span>Guardar y continuar</span> }
          </button>
        </form>
        <div class="links"><button type="button" (click)="salir()">Cerrar sesión</button></div>
      </div>
    </main>
  `,
})
export class CambiarContrasena {
  protected readonly loading = signal(false);
  protected readonly form;

  constructor(
    fb: FormBuilder,
    private readonly router: Router,
    private readonly auth: AuthService,
    private readonly toast: ToastService,
  ) {
    this.form = fb.group(
      {
        actual: ['', [Validators.required]],
        nueva: ['', [Validators.required, Validators.minLength(8)]],
        confirmar: ['', [Validators.required]],
      },
      { validators: (g) => (g.get('nueva')?.value === g.get('confirmar')?.value ? null : { noCoincide: true }) },
    );
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    const { actual, nueva } = this.form.getRawValue();
    this.loading.set(true);
    this.auth.cambiarContrasena(actual!, nueva!).subscribe({
      next: () => {
        this.toast.success('Contraseña actualizada.');
        void this.router.navigateByUrl('/home');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const msg = err.error?.message;
        this.toast.error((Array.isArray(msg) ? msg[0] : msg) ?? 'No se pudo cambiar la contraseña.');
      },
    });
  }

  salir(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
