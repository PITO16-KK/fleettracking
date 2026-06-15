import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RentalDetailPage } from './rental-detail.page';

describe('RentalDetailPage', () => {
  let component: RentalDetailPage;
  let fixture: ComponentFixture<RentalDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RentalDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
