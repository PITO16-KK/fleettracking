import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: false
})
export class WelcomePage implements OnInit {
  currentStage: 'splash' | 'onboarding' = 'splash';
  currentSlide: 1 | 2 = 1;
  hasAgreed = false;
  hasReadToBottom = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    // 1. Check if user is already logged in
    const currentUser = localStorage.getItem('roamie_user');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      if (user.role === 'admin') {
        this.router.navigate(['/admin'], { replaceUrl: true });
        return;
      } else {
        this.router.navigate(['/customer'], { replaceUrl: true });
        return;
      }
    }

    // 2. Check if already onboarded/agreed
    const onboarded = localStorage.getItem('roamie_onboarded') === 'true';
    if (onboarded) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    // 3. First time user: Show cool logo animation splashscreen, then transition
    setTimeout(() => {
      this.currentStage = 'onboarding';
    }, 2800);
  }

  nextSlide() {
    this.currentSlide = 2;
  }

  prevSlide() {
    this.currentSlide = 1;
  }

  onScrollAgreement(event: any) {
    const element = event.target;
    // Check if user has scrolled near bottom (15px threshold)
    if (element.scrollHeight - element.scrollTop <= element.clientHeight + 15) {
      this.hasReadToBottom = true;
    }
  }

  finishOnboarding() {
    if (!this.hasAgreed) return;
    localStorage.setItem('roamie_onboarded', 'true');
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
