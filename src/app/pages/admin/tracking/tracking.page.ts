import { Component, OnInit, OnDestroy } from '@angular/core';
import { MockDataService } from '../../../services/mock-data.service';

interface LiveVehicle {
  id: string;
  carName: string;
  plate: string;
  status: 'Moving' | 'Stopped' | 'Idle';
  speed: number;
  x: number;
  y: number;
}

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.page.html',
  styleUrls: ['./tracking.page.scss'],
  standalone: false
})
export class TrackingPage implements OnInit, OnDestroy {
  vehicles: LiveVehicle[] = [
    { id: '1', carName: 'Camry Hybrid', plate: 'B 1234 ROA', status: 'Moving', speed: 45, x: 20, y: 30 },
    { id: '2', carName: 'CR-V Turbo', plate: 'B 5678 MIE', status: 'Moving', speed: 60, x: 60, y: 40 },
    { id: '7', carName: 'Alphard', plate: 'B 1 VIP', status: 'Stopped', speed: 0, x: 40, y: 70 },
    { id: '3', carName: 'IONIQ 5', plate: 'B 2023 EV', status: 'Idle', speed: 0, x: 80, y: 20 }
  ];

  filter: string = 'all';
  private simulationInterval: any;

  constructor(private mockData: MockDataService) { }

  ngOnInit() {
    this.startSimulation();
  }

  ngOnDestroy() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
  }

  get filteredVehicles() {
    if (this.filter === 'all') return this.vehicles;
    return this.vehicles.filter(v => v.status.toLowerCase() === this.filter);
  }

  startSimulation() {
    this.simulationInterval = setInterval(() => {
      this.vehicles.forEach(v => {
        if (v.status === 'Moving') {
          // Move randomly
          v.x += (Math.random() - 0.5) * 5;
          v.y += (Math.random() - 0.5) * 5;
          
          // Keep in bounds
          v.x = Math.max(10, Math.min(90, v.x));
          v.y = Math.max(10, Math.min(90, v.y));
          
          // Random speed change
          v.speed = Math.floor(Math.random() * 20) + 40;
        }
      });
    }, 2000);
  }
}
