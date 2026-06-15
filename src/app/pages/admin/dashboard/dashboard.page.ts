import { Component, OnInit, AfterViewInit } from '@angular/core';
import { MockDataService, Rental } from '../../../services/mock-data.service';
import { AuthService } from '../../../services/auth.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit, AfterViewInit {
  recentRentals: Rental[] = [];

  constructor(
    private mockData: MockDataService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.mockData.getRentals().subscribe(data => {
      this.recentRentals = data.slice(0, 5);
    });
  }

  ngAfterViewInit() {
    this.initCharts();
  }

  initCharts() {
    // Pie Chart
    new Chart('fleetPieChart', {
      type: 'doughnut',
      data: {
        labels: ['Available', 'On-going', 'Booked', 'Maintenance'],
        datasets: [{
          data: [32, 8, 5, 3],
          backgroundColor: ['#2dd36f', '#ffc409', '#5B6CFF', '#eb445a'],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '70%',
        plugins: { legend: { position: 'bottom' } }
      }
    });

    // Bar Chart
    new Chart('revenueBarChart', {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{
          label: 'Revenue (M)',
          data: [450, 600, 550, 800, 750],
          backgroundColor: '#5B6CFF',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { display: false } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  logout() {
    this.authService.logout();
  }
}
