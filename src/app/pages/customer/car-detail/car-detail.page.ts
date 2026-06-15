import { Component, OnInit, Optional } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MockDataService, Car } from '../../../services/mock-data.service';

@Component({
  selector: 'app-car-detail',
  templateUrl: './car-detail.page.html',
  styleUrls: ['./car-detail.page.scss'],
  standalone: false
})
export class CarDetailPage implements OnInit {
  car?: Car;

  constructor(
    @Optional() private route: ActivatedRoute | null,
    private mockData: MockDataService
  ) { }

  ngOnInit() {
    const id = this.route?.snapshot?.paramMap.get('id');
    if (id) {
      this.mockData.getCarById(id).subscribe(data => {
        this.car = data;
      });
    }
  }
}
