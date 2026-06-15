import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MockDataService, Car } from '../../../services/mock-data.service';

@Component({
  selector: 'app-car-list',
  templateUrl: './car-list.page.html',
  styleUrls: ['./car-list.page.scss'],
  standalone: false
})
export class CarListPage implements OnInit {
  cars: Car[] = [];
  filteredCars: Car[] = [];
  searchTerm = '';
  selectedCategory = 'All';
  categories = ['All', 'Sedan', 'SUV', 'MPV', 'Luxury'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mockData: MockDataService
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.selectedCategory = params.get('category') || 'All';
      this.searchTerm = params.get('search') || '';
      this.applyFilters();
    });

    this.mockData.getCars().subscribe(data => {
      this.cars = data;
      this.applyFilters();
    });
  }

  applyFilters() {
    let result = this.cars;
    if (this.selectedCategory !== 'All') {
      result = result.filter(car => car.type === this.selectedCategory);
    }
    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(car =>
        car.brand.toLowerCase().includes(term) ||
        car.model.toLowerCase().includes(term)
      );
    }
    this.filteredCars = result;
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.applyFilters();
  }

  navigateToDetail(car: Car) {
    this.router.navigate(['/customer/car', car.id]);
  }
}
