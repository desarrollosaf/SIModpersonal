import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-recuperar',
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
        <h1 id="t">Recuperar contraseña</h1>
        @if (enviado()) {
          <p class="hint">Si el usuario existe y tiene un correo registrado, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja (y el spam). El enlace vence en 1 hora.</p>
          <div class="links"><a routerLink="/login">Volver a iniciar sesión</a></div>
        } @else {
          <p class="hint">Escribe tu usuario y te enviaremos un enlace al correo registrado.</p>
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate autocomplete="off">
            <label class="field">
              <span class="field__label">Usuario</span>
              <span class="field__control">
                <input type="text" formControlName="usuario" placeholder="Ej. XXX710106" spellcheck="false" maxlength="100" />
              </span>
            </label>
            <button type="submit" class="submit" [disabled]="loading()">
              @if (loading()) { <span class="spinner" aria-hidden="true"></span><span>Enviando…</span> } @else { <span>Enviar enlace</span> }
            </button>
          </form>
          <div class="links"><a routerLink="/login">Volver a iniciar sesión</a></div>
        }
      </div>
    </main>
  `,
})
export class Recuperar {
  protected readonly loading = signal(false);
  protected readonly enviado = signal(false);
  protected readonly form;

  constructor(
    fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly toast: ToastService,
  ) {
    this.form = fb.group({ usuario: ['', [Validators.required]] });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.recuperar(this.form.getRawValue().usuario!.trim()).subscribe({
      next: () => { this.loading.set(false); this.enviado.set(true); },
      error: () => { this.loading.set(false); this.toast.error('No se pudo procesar la solicitud. Intenta más tarde.'); },
    });
  }
}
